/**
 * Moteur de la file d'attente hors-ligne.
 *
 * Volontairement sans aucun import React Native ni Supabase : toutes les
 * dépendances (stockage, horloge, exécution d'une mutation, classification
 * des erreurs, session) sont injectées. C'est ce qui permet de le soumettre à
 * un scénario complet — perte réseau, réouverture de l'app, session expirée,
 * double rejeu — dans `scripts/check-offline-queue.ts`, sans émulateur.
 *
 * Garanties tenues par ce moteur :
 *
 *  - Persistance : toute mutation acceptée est écrite sur le disque avant que
 *    `enqueue` ne rende la main.
 *  - Ordre : les mutations sont rejouées dans leur ordre d'arrivée. Un échec
 *    temporaire arrête le rejeu au lieu de passer à la suivante, pour ne
 *    jamais appliquer une mutation plus récente avant une plus ancienne.
 *  - Idempotence : une mutation reste dans la file tant que son exécution
 *    n'est pas confirmée. Un arrêt brutal pendant l'envoi la fait donc
 *    rejouer — les gestionnaires doivent être idempotents (update ciblé ou
 *    upsert, jamais un insert nu).
 *  - Pas de double rejeu concurrent : un verrou interne sérialise tous les
 *    accès au stockage et interdit deux `flush` simultanés.
 *  - Dédoublonnage : une clé `dedupeKey` remplace la mutation en attente de
 *    même clé, à sa position d'origine, au lieu d'en ajouter une seconde.
 *  - Nouvelles tentatives contrôlées : délai exponentiel plafonné, nombre
 *    d'essais borné.
 *  - Aucune perte silencieuse : une mutation définitivement refusée n'est pas
 *    jetée, elle passe dans une liste d'échecs consultable, et un contenu
 *    illisible sur le disque est mis en quarantaine au lieu d'être écrasé.
 */

export const QUEUE_FORMAT_VERSION = 2;

/** Accès au stockage persistant, réduit au strict nécessaire. */
export interface QueueStorage {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
}

/**
 * Nature d'un échec, qui détermine la suite :
 *  - `retryable` : réseau absent, serveur indisponible, limite de débit. On
 *    réessaie plus tard, la mutation reste en tête de file.
 *  - `auth` : jeton expiré ou absent. On tente un rafraîchissement, puis on
 *    s'arrête sans rien perdre si la session ne revient pas.
 *  - `permanent` : la mutation ne passera jamais (refus RLS, contrainte
 *    violée, charge invalide). Elle part dans la liste des échecs.
 */
export type FailureKind = "retryable" | "auth" | "permanent";

export interface QueuedMutation {
  /** Identifiant local unique de la mutation. */
  id: string;
  /** Opération nommée, résolue via le registre de gestionnaires. */
  kind: string;
  payload: unknown;
  /** Une seule mutation en attente par clé (null = pas de dédoublonnage). */
  dedupeKey: string | null;
  createdAt: string;
  attempts: number;
  lastError: string | null;
  /** Date ISO avant laquelle il ne faut pas retenter. */
  nextAttemptAt: string | null;
}

export interface FailedMutation extends QueuedMutation {
  failedAt: string;
  reason: string;
}

export interface PersistedQueue {
  version: number;
  pending: QueuedMutation[];
  failed: FailedMutation[];
}

/** Ce que l'interface a besoin de savoir pour prévenir le joueur. */
export interface QueueSnapshot {
  pending: number;
  failed: number;
  syncing: boolean;
  lastError: string | null;
  /** Date de la plus ancienne mutation en attente, pour dire « depuis quand ». */
  oldestPendingAt: string | null;
}

export type MutationHandler = (payload: unknown) => Promise<void>;

export type FlushStop =
  | "empty"
  | "done"
  | "retry-later"
  | "offline"
  | "auth"
  | "already-running";

export interface FlushResult {
  synced: number;
  /** Mutations passées en échec définitif pendant ce rejeu. */
  failed: number;
  remaining: number;
  stoppedBecause: FlushStop;
}

export interface QueueEngineDeps {
  storage: QueueStorage;
  handlers: Record<string, MutationHandler>;
  /** Classe une erreur remontée par un gestionnaire. */
  classify: (error: unknown) => FailureKind;
  /** Horloge injectable : les tests avancent le temps sans attendre. */
  now: () => number;
  /** Identifiants de mutation ; injectable pour des tests déterministes. */
  newId: () => string;
  /** Faux si le réseau est connu comme absent : on n'essaie même pas. */
  isOnline?: () => Promise<boolean>;
  /** Faux s'il n'y a pas de session utilisable. */
  hasSession?: () => Promise<boolean>;
  /** Tente de rafraîchir la session ; faux si impossible. */
  refreshSession?: () => Promise<boolean>;
  /** Appelée à chaque changement d'état, pour l'affichage. */
  onSnapshot?: (snapshot: QueueSnapshot) => void;
  /** Reçoit un contenu de stockage illisible au lieu de l'écraser. */
  quarantine?: (raw: string) => Promise<void>;
  /** Nom d'opération attribué aux mutations de l'ancien format. */
  legacyKind?: string;
  maxAttempts?: number;
  /** Délai de base du backoff, en millisecondes. */
  retryBaseMs?: number;
  retryMaxMs?: number;
}

const DEFAULT_MAX_ATTEMPTS = 8;
const DEFAULT_RETRY_BASE_MS = 5_000;
const DEFAULT_RETRY_MAX_MS = 5 * 60_000;

function emptyQueue(): PersistedQueue {
  return { version: QUEUE_FORMAT_VERSION, pending: [], failed: [] };
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  if (error && typeof error === "object") {
    const candidate = (error as { message?: unknown }).message;
    if (typeof candidate === "string" && candidate) return candidate;
  }
  return "Erreur inconnue";
}

export class OfflineQueueEngine {
  private readonly deps: QueueEngineDeps;
  private chain: Promise<unknown> = Promise.resolve();
  private flushing = false;
  private lastError: string | null = null;

  constructor(deps: QueueEngineDeps) {
    this.deps = deps;
  }

  /**
   * Sérialise tous les accès au stockage.
   *
   * Sans cela, une mutation ajoutée pendant un rejeu pourrait être écrasée par
   * la réécriture de la file effectuée par ce rejeu : la mutation serait
   * acceptée côté interface puis perdue.
   */
  private withLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(
      () => fn(),
      () => fn()
    );
    this.chain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  private async load(): Promise<PersistedQueue> {
    const raw = await this.deps.storage.read();
    if (raw === null || raw === "") return emptyQueue();

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Contenu illisible : on le met de côté au lieu de l'effacer. Une file
      // corrompue est un incident à examiner, pas une donnée à jeter.
      if (this.deps.quarantine) await this.deps.quarantine(raw);
      this.lastError = "File d'attente illisible, mise en quarantaine.";
      return emptyQueue();
    }

    // Ancien format (v1) : un simple tableau de { id, table, payload }.
    // Les appareils déjà installés en contiennent peut-être : on les reprend
    // au lieu de les abandonner.
    if (Array.isArray(parsed)) {
      const kind = this.deps.legacyKind ?? "legacy.upsert";
      const pending: QueuedMutation[] = parsed
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map((item) => ({
          id: typeof item.id === "string" ? item.id : this.deps.newId(),
          kind,
          payload: { table: item.table, row: item.payload },
          dedupeKey: null,
          createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date(this.deps.now()).toISOString(),
          attempts: 0,
          lastError: null,
          nextAttemptAt: null,
        }));
      return { version: QUEUE_FORMAT_VERSION, pending, failed: [] };
    }

    if (!parsed || typeof parsed !== "object") return emptyQueue();
    const record = parsed as Partial<PersistedQueue>;
    return {
      version: typeof record.version === "number" ? record.version : QUEUE_FORMAT_VERSION,
      pending: Array.isArray(record.pending) ? record.pending : [],
      failed: Array.isArray(record.failed) ? record.failed : [],
    };
  }

  private async save(queue: PersistedQueue): Promise<void> {
    await this.deps.storage.write(JSON.stringify({ ...queue, version: QUEUE_FORMAT_VERSION }));
  }

  private snapshotOf(queue: PersistedQueue): QueueSnapshot {
    const oldest = queue.pending.reduce<string | null>((acc, item) => {
      if (!acc) return item.createdAt;
      return item.createdAt < acc ? item.createdAt : acc;
    }, null);
    return {
      pending: queue.pending.length,
      failed: queue.failed.length,
      syncing: this.flushing,
      lastError: this.lastError,
      oldestPendingAt: oldest,
    };
  }

  private publish(queue: PersistedQueue): void {
    this.deps.onSnapshot?.(this.snapshotOf(queue));
  }

  /** Enregistre une mutation à rejouer. Écrit sur le disque avant de rendre la main. */
  async enqueue(kind: string, payload: unknown, options?: { dedupeKey?: string }): Promise<void> {
    await this.withLock(async () => {
      const queue = await this.load();
      const dedupeKey = options?.dedupeKey ?? null;
      const entry: QueuedMutation = {
        id: this.deps.newId(),
        kind,
        payload,
        dedupeKey,
        createdAt: new Date(this.deps.now()).toISOString(),
        attempts: 0,
        lastError: null,
        nextAttemptAt: null,
      };

      // Dédoublonnage : on remplace à la même position pour ne pas faire
      // « remonter » la mutation dans l'ordre de rejeu.
      const existing = dedupeKey === null ? -1 : queue.pending.findIndex((item) => item.dedupeKey === dedupeKey);
      if (existing >= 0) {
        const previous = queue.pending[existing];
        queue.pending[existing] = { ...entry, createdAt: previous?.createdAt ?? entry.createdAt };
      } else {
        queue.pending.push(entry);
      }

      await this.save(queue);
      this.publish(queue);
    });
  }

  async snapshot(): Promise<QueueSnapshot> {
    return this.withLock(async () => this.snapshotOf(await this.load()));
  }

  async listFailed(): Promise<FailedMutation[]> {
    return this.withLock(async () => (await this.load()).failed);
  }

  /** Remet les échecs définitifs en fin de file, compteurs remis à zéro. */
  async retryFailed(): Promise<number> {
    return this.withLock(async () => {
      const queue = await this.load();
      const revived = queue.failed.map((item) => ({
        id: item.id,
        kind: item.kind,
        payload: item.payload,
        dedupeKey: item.dedupeKey,
        createdAt: item.createdAt,
        attempts: 0,
        lastError: null,
        nextAttemptAt: null,
      }));
      const count = revived.length;
      queue.pending = [...queue.pending, ...revived];
      queue.failed = [];
      this.lastError = null;
      await this.save(queue);
      this.publish(queue);
      return count;
    });
  }

  /**
   * Abandonne explicitement un échec définitif.
   *
   * Seule façon de retirer une mutation sans l'avoir appliquée : elle est
   * volontaire et déclenchée par l'utilisateur, jamais automatique.
   */
  async discardFailed(id: string): Promise<boolean> {
    return this.withLock(async () => {
      const queue = await this.load();
      const before = queue.failed.length;
      queue.failed = queue.failed.filter((item) => item.id !== id);
      const removed = queue.failed.length < before;
      if (removed) {
        await this.save(queue);
        this.publish(queue);
      }
      return removed;
    });
  }

  private backoffMs(attempts: number): number {
    const base = this.deps.retryBaseMs ?? DEFAULT_RETRY_BASE_MS;
    const max = this.deps.retryMaxMs ?? DEFAULT_RETRY_MAX_MS;
    return Math.min(max, base * 2 ** Math.max(0, attempts - 1));
  }

  /**
   * Rejoue la file, dans l'ordre, jusqu'au premier obstacle.
   *
   * Ne lève jamais : le résultat dit ce qui s'est passé. Un appelant
   * (reconnexion réseau, retour au premier plan, démarrage) peut donc
   * l'appeler sans précaution.
   */
  async flush(): Promise<FlushResult> {
    if (this.flushing) {
      const snapshot = await this.snapshot();
      return { synced: 0, failed: 0, remaining: snapshot.pending, stoppedBecause: "already-running" };
    }
    // Marqueur posé sans `await` préalable : deux rejeux lancés dans le même
    // tour d'événements se croiseraient sinon, et la même mutation partirait
    // deux fois.
    this.flushing = true;

    let synced = 0;
    let failed = 0;
    let stoppedBecause: FlushStop = "done";

    try {
      const initial = await this.withLock(async () => this.load());
      if (initial.pending.length === 0) {
        stoppedBecause = "empty";
      } else if (this.deps.isOnline && !(await this.deps.isOnline())) {
        stoppedBecause = "offline";
      } else if (this.deps.hasSession && !(await this.deps.hasSession())) {
        // Sans session, tout serait refusé par RLS. On conserve la file
        // intacte : elle repartira à la prochaine connexion au compte.
        this.lastError = "Synchronisation en attente de connexion au compte.";
        stoppedBecause = "auth";
      } else {
        this.lastError = null;
        this.publish(initial);
        const drained = await this.drain();
        synced = drained.synced;
        failed = drained.failed;
        stoppedBecause = drained.stoppedBecause;
      }
    } catch (error) {
      // Seul un stockage défaillant peut arriver ici : les erreurs des
      // gestionnaires sont déjà traitées dans `drain`. On le signale sans
      // lever, pour que les appelants (reconnexion, retour au premier plan)
      // n'aient jamais besoin d'un try/catch autour de flush().
      this.lastError = messageOf(error);
      stoppedBecause = "retry-later";
    } finally {
      this.flushing = false;
    }

    const queue = await this.withLock(async () => this.load()).catch(() => emptyQueue());
    this.publish(queue);
    return { synced, failed, remaining: queue.pending.length, stoppedBecause };
  }

  /** Boucle de rejeu : suppose le verrou déjà pris et les préalables vérifiés. */
  private async drain(): Promise<{ synced: number; failed: number; stoppedBecause: FlushStop }> {
    let synced = 0;
    let failed = 0;
    let refreshedOnce = false;
    const maxAttempts = this.deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

    for (;;) {
      const queue = await this.withLock(async () => this.load());
      const item = queue.pending[0];
      if (!item) return { synced, failed, stoppedBecause: "done" };

      // Pas encore l'heure : on s'arrête ici plutôt que de sauter cette
      // mutation, pour préserver l'ordre.
      if (item.nextAttemptAt && Date.parse(item.nextAttemptAt) > this.deps.now()) {
        return { synced, failed, stoppedBecause: "retry-later" };
      }

      const handler = this.deps.handlers[item.kind];
      if (!handler) {
        failed += 1;
        await this.moveToFailed(item.id, `Opération inconnue : ${item.kind}`);
        continue;
      }

      let outcome: FailureKind | "ok";
      let message = "";
      try {
        await handler(item.payload);
        outcome = "ok";
      } catch (error) {
        message = messageOf(error);
        outcome = this.deps.classify(error);
      }

      if (outcome === "ok") {
        synced += 1;
        await this.removeApplied(item.id);
        continue;
      }

      if (outcome === "auth") {
        if (!refreshedOnce && this.deps.refreshSession) {
          refreshedOnce = true;
          if (await this.deps.refreshSession()) continue;
        }
        this.lastError = "Session expirée : la synchronisation reprendra après reconnexion.";
        return { synced, failed, stoppedBecause: "auth" };
      }

      if (outcome === "permanent") {
        failed += 1;
        await this.moveToFailed(item.id, message);
        continue;
      }

      // Échec temporaire : on programme la prochaine tentative et on
      // s'arrête, sans toucher aux mutations suivantes.
      const attempts = item.attempts + 1;
      if (attempts >= maxAttempts) {
        failed += 1;
        await this.moveToFailed(item.id, `${message} (abandon après ${attempts} tentatives)`);
        continue;
      }
      await this.scheduleRetry(item.id, attempts, message);
      this.lastError = message;
      return { synced, failed, stoppedBecause: "retry-later" };
    }
  }

  private async removeApplied(id: string): Promise<void> {
    await this.withLock(async () => {
      const queue = await this.load();
      queue.pending = queue.pending.filter((item) => item.id !== id);
      await this.save(queue);
    });
  }

  private async moveToFailed(id: string, reason: string): Promise<void> {
    await this.withLock(async () => {
      const queue = await this.load();
      const item = queue.pending.find((entry) => entry.id === id);
      queue.pending = queue.pending.filter((entry) => entry.id !== id);
      if (item) {
        queue.failed.push({
          ...item,
          lastError: reason,
          failedAt: new Date(this.deps.now()).toISOString(),
          reason,
        });
      }
      this.lastError = reason;
      await this.save(queue);
    });
  }

  private async scheduleRetry(id: string, attempts: number, message: string): Promise<void> {
    await this.withLock(async () => {
      const queue = await this.load();
      const index = queue.pending.findIndex((entry) => entry.id === id);
      const item = queue.pending[index];
      if (index < 0 || !item) return;
      queue.pending[index] = {
        ...item,
        attempts,
        lastError: message,
        nextAttemptAt: new Date(this.deps.now() + this.backoffMs(attempts)).toISOString(),
      };
      await this.save(queue);
    });
  }
}
