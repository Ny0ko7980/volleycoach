import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { supabase } from "@/lib/supabase";
import { classifySupabaseFailure, codeOf, UNIQUE_VIOLATION } from "@/services/offline/classifyFailure";
import {
  OfflineQueueEngine,
  type FailedMutation,
  type FlushResult,
  type QueueSnapshot,
} from "@/services/offline/queueEngine";
import { completeWorkoutSession, type CompleteSessionInput } from "@/services/workoutService";
import { saveExerciseFeedback, type SaveExerciseFeedbackInput } from "@/services/feedbackService";

// Clés inchangées depuis la première version : les renommer orphelinerait les
// mutations déjà en attente sur les téléphones où l'app est installée.
const QUEUE_KEY = "coach-volley:offline-queue";
const EXERCISES_CACHE_KEY = "coach-volley:exercises-cache";
// Reçoit une file illisible plutôt que de l'écraser (incident à examiner).
const QUARANTINE_KEY = "coach-volley:offline-queue-quarantine";

/**
 * File d'attente hors-ligne de l'application.
 *
 * Orvadin est utilisé dans des gymnases où le réseau est souvent mauvais : une
 * action faite hors couverture doit être appliquée plus tard, pas perdue. Ce
 * module branche le moteur (`offline/queueEngine.ts`) sur le stockage du
 * téléphone, sur la détection réseau et sur Supabase.
 *
 * Chaque opération rejouable est nommée et enregistrée ici. Deux règles :
 *
 *  1. Un gestionnaire doit être idempotent. Une mutation reste en file jusqu'à
 *     confirmation : si l'app est tuée pendant l'envoi, elle sera rejouée.
 *     D'où des `update` ciblés par identifiant et des `upsert`, jamais un
 *     `insert` nu — c'était le défaut de la version précédente, qui remettait
 *     en file un `insert` sur une ligne existante, donc un échec permanent.
 *  2. Un gestionnaire passe par le même service que le chemin en ligne, pour
 *     qu'il n'y ait jamais deux façons d'écrire la même donnée.
 */

export const OfflineOperation = {
  completeWorkoutSession: "workout_session.complete",
  saveExerciseFeedback: "exercise_feedback.save",
  /** Mutations issues de l'ancien format { table, payload }. */
  legacyUpsert: "legacy.upsert",
} as const;

export interface CompleteWorkoutSessionPayload {
  sessionId: string;
  input: CompleteSessionInput;
}

function isCompletePayload(payload: unknown): payload is CompleteWorkoutSessionPayload {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Partial<CompleteWorkoutSessionPayload>;
  return typeof candidate.sessionId === "string" && Boolean(candidate.input) && typeof candidate.input === "object";
}

function isFeedbackPayload(payload: unknown): payload is SaveExerciseFeedbackInput {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Partial<SaveExerciseFeedbackInput>;
  return (
    typeof candidate.sessionId === "string" &&
    typeof candidate.exerciseId === "string" &&
    typeof candidate.skill === "string" &&
    typeof candidate.rating === "string"
  );
}

// Déclaré avant le moteur : `onSnapshot` le referme.
const listeners = new Set<(snapshot: QueueSnapshot) => void>();

const engine = new OfflineQueueEngine({
  storage: {
    read: () => AsyncStorage.getItem(QUEUE_KEY),
    write: (value) => AsyncStorage.setItem(QUEUE_KEY, value),
  },
  handlers: {
    [OfflineOperation.completeWorkoutSession]: async (payload) => {
      if (!isCompletePayload(payload)) throw new Error("Charge invalide pour la fin de séance.");
      // `update ... eq(id)` : rejouable autant de fois que nécessaire, le
      // résultat est le même. Les récompenses sont attribuées côté serveur par
      // le déclencheur `trg_apply_rewards_after_session`, protégé par
      // `rewarded_at` : un second rejeu ne redonne pas d'XP.
      await completeWorkoutSession(payload.sessionId, payload.input);
    },
    [OfflineOperation.saveExerciseFeedback]: async (payload) => {
      if (!isFeedbackPayload(payload)) throw new Error("Charge invalide pour un ressenti d'exercice.");
      await saveExerciseFeedback(payload);
    },
    [OfflineOperation.legacyUpsert]: async (payload) => {
      const record = (payload ?? {}) as { table?: unknown; row?: unknown };
      if (typeof record.table !== "string" || !record.row || typeof record.row !== "object") {
        throw new Error("Mutation héritée illisible.");
      }
      const { error } = await supabase.from(record.table).upsert(record.row as Record<string, unknown>);
      // Sur un rejeu, une violation d'unicité signifie que la ligne est déjà
      // là : l'effet voulu est obtenu, ce n'est pas un échec.
      if (error && codeOf(error) !== UNIQUE_VIOLATION) throw error;
    },
  },
  classify: classifySupabaseFailure,
  now: () => Date.now(),
  // Identifiant purement local (repérage dans la file), jamais une clé en base.
  newId: () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  isOnline: async () => {
    try {
      const state = await NetInfo.fetch();
      return Boolean(state.isConnected && state.isInternetReachable !== false);
    } catch {
      // Sans information fiable, on tente : une erreur réseau sera de toute
      // façon classée « temporaire » et la file sera conservée.
      return true;
    }
  },
  hasSession: async () => {
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session);
  },
  refreshSession: async () => {
    const { data, error } = await supabase.auth.refreshSession();
    return !error && Boolean(data.session);
  },
  onSnapshot: (snapshot) => {
    for (const listener of listeners) listener(snapshot);
  },
  quarantine: async (raw) => {
    await AsyncStorage.setItem(QUARANTINE_KEY, raw);
  },
  legacyKind: OfflineOperation.legacyUpsert,
});

/** S'abonne à l'état de la file (nombre en attente, échecs, erreur courante). */
export function subscribeToQueueState(listener: (snapshot: QueueSnapshot) => void): () => void {
  listeners.add(listener);
  void queueSnapshot().then(listener);
  return () => listeners.delete(listener);
}

export function queueSnapshot(): Promise<QueueSnapshot> {
  return engine.snapshot();
}

export function listFailedMutations(): Promise<FailedMutation[]> {
  return engine.listFailed();
}

export function retryFailedMutations(): Promise<number> {
  return engine.retryFailed();
}

export function discardFailedMutation(id: string): Promise<boolean> {
  return engine.discardFailed(id);
}

/** Met en file la fin d'une séance qui n'a pas pu être enregistrée. */
export function queueWorkoutSessionCompletion(sessionId: string, input: CompleteSessionInput): Promise<void> {
  return engine.enqueue(
    OfflineOperation.completeWorkoutSession,
    { sessionId, input } satisfies CompleteWorkoutSessionPayload,
    // Une séance ne se termine qu'une fois : une seconde mise en file pour la
    // même séance remplace la précédente au lieu de s'ajouter.
    { dedupeKey: `${OfflineOperation.completeWorkoutSession}:${sessionId}` }
  );
}

/** Met en file un ressenti d'exercice qui n'a pas pu être enregistré. */
export function queueExerciseFeedback(input: SaveExerciseFeedbackInput): Promise<void> {
  return engine.enqueue(OfflineOperation.saveExerciseFeedback, input, {
    // Le joueur peut changer d'avis pendant la séance : seule la dernière
    // valeur compte, exactement comme l'upsert en ligne.
    dedupeKey: `${OfflineOperation.saveExerciseFeedback}:${input.sessionId}:${input.exerciseId}`,
  });
}

/**
 * Ancienne interface générique, conservée.
 *
 * Elle reste exportée parce que des versions déjà installées peuvent l'appeler
 * depuis du code chargé dynamiquement, et parce qu'elle est le point d'entrée
 * des mutations enregistrées sous l'ancien format. Le nouveau code passe par
 * les fonctions nommées ci-dessus, qui savent quoi rejouer.
 */
export function queueMutation(table: string, payload: Record<string, unknown>): Promise<void> {
  return engine.enqueue(OfflineOperation.legacyUpsert, { table, row: payload });
}

/**
 * Rejoue la file. Ne lève jamais : l'appelant peut brancher cette fonction sur
 * un événement réseau sans précaution particulière.
 */
export function flushQueue(): Promise<FlushResult> {
  return engine.flush();
}

/**
 * Prévient à chaque retour de connexion.
 *
 * `isInternetReachable` vaut `null` tant que la sonde n'a pas abouti : on ne
 * traite que `false` comme une absence réelle, sinon on déclarerait le
 * téléphone hors-ligne à chaque démarrage.
 */
export function subscribeToConnectivity(onReconnect: () => void): () => void {
  let wasOffline = false;
  const unsubscribe = NetInfo.addEventListener((state) => {
    const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
    if (!isOnline) wasOffline = true;
    else if (wasOffline) {
      wasOffline = false;
      onReconnect();
    }
  });
  return unsubscribe;
}

export async function cacheExercisesForOffline(exercises: unknown[]): Promise<void> {
  await AsyncStorage.setItem(EXERCISES_CACHE_KEY, JSON.stringify(exercises));
}

export async function getCachedExercises<T>(): Promise<T[]> {
  const raw = await AsyncStorage.getItem(EXERCISES_CACHE_KEY);
  return raw ? (JSON.parse(raw) as T[]) : [];
}

// Ré-exporté pour que les écrans n'aient qu'un seul module à connaître.
export { classifySupabaseFailure } from "@/services/offline/classifyFailure";
export type { FailedMutation, FlushResult, QueueSnapshot } from "@/services/offline/queueEngine";
