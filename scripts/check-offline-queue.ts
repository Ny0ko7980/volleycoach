// Contrôle de la file d'attente hors-ligne.
//
// Orvadin est utilisé dans des gymnases où le réseau coupe : ce qui est fait
// hors couverture doit être appliqué plus tard, une fois et une seule, dans
// l'ordre, et jamais perdu en silence. Ce script soumet le moteur aux huit
// scénarios qui comptent, avec un stockage et un réseau simulés — donc sans
// émulateur ni base de données.
//
// Lancement : npm run offline:check

import {
  OfflineQueueEngine,
  type FailureKind,
  type QueueStorage,
} from "@/services/offline/queueEngine";
import { classifySupabaseFailure } from "@/services/offline/classifyFailure";

let failures = 0;

function check(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`OK   ${label}`);
  } else {
    failures += 1;
    console.log(`ÉCHEC ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Stockage en mémoire, qui se comporte comme AsyncStorage. */
function makeStorage(initial: string | null = null): QueueStorage & { raw: () => string | null } {
  let value = initial;
  return {
    read: async () => value,
    write: async (next) => {
      value = next;
    },
    raw: () => value,
  };
}

/** Horloge manipulable : les backoffs sont franchis sans attendre. */
function makeClock(start = 1_700_000_000_000) {
  let current = start;
  return { now: () => current, advance: (ms: number) => (current += ms) };
}

let idCounter = 0;
const newId = () => `m${++idCounter}`;

/** Erreur de réseau telle que `fetch` la lève sous React Native. */
const networkError = () => new TypeError("Network request failed");
/** Refus RLS : définitif, la mutation ne passera jamais. */
const rlsError = () => ({ code: "42501", message: "new row violates row-level security policy" });
/** Jeton expiré, tel que PostgREST le renvoie. */
const jwtExpired = () => ({ code: "PGRST301", message: "JWT expired" });

// Un seul point d'entrée asynchrone : le `await` de haut niveau n'est pas
// disponible dans le format de module utilisé par tsx ici.
async function main(): Promise<void> {
// ---------------------------------------------------------------------------
// 1. Connexion présente : action puis synchronisation immédiate.
// ---------------------------------------------------------------------------
{
  const storage = makeStorage();
  const clock = makeClock();
  const applied: unknown[] = [];
  const engine = new OfflineQueueEngine({
    storage,
    handlers: { "op": async (p) => void applied.push(p) },
    classify: classifySupabaseFailure,
    now: clock.now,
    newId,
  });

  await engine.enqueue("op", { n: 1 });
  const result = await engine.flush();
  const snapshot = await engine.snapshot();

  check("1. en ligne : la mutation part et la file se vide", result.synced === 1 && snapshot.pending === 0);
  check("1. la charge arrive intacte", JSON.stringify(applied) === JSON.stringify([{ n: 1 }]));
}

// ---------------------------------------------------------------------------
// 2. Perte de réseau, action, puis reconnexion.
// ---------------------------------------------------------------------------
{
  const storage = makeStorage();
  const clock = makeClock();
  let online = false;
  const applied: unknown[] = [];
  const engine = new OfflineQueueEngine({
    storage,
    handlers: {
      "op": async (p) => {
        if (!online) throw networkError();
        applied.push(p);
      },
    },
    classify: classifySupabaseFailure,
    now: clock.now,
    newId,
    isOnline: async () => online,
  });

  await engine.enqueue("op", { n: 1 });
  const offlineFlush = await engine.flush();
  check("2. hors réseau : aucun envoi, rien de perdu", offlineFlush.synced === 0 && offlineFlush.remaining === 1);
  check("2. hors réseau : la mutation est bien sur le disque", (storage.raw() ?? "").includes('"n":1'));

  online = true;
  const backFlush = await engine.flush();
  check("2. à la reconnexion : la mutation part", backFlush.synced === 1 && applied.length === 1);
  check("2. la file est vide ensuite", (await engine.snapshot()).pending === 0);
}

// ---------------------------------------------------------------------------
// 3. Plusieurs actions hors ligne, puis reconnexion : ordre conservé.
// ---------------------------------------------------------------------------
{
  const storage = makeStorage();
  const clock = makeClock();
  let online = false;
  const applied: number[] = [];
  const engine = new OfflineQueueEngine({
    storage,
    handlers: {
      "op": async (p) => {
        if (!online) throw networkError();
        applied.push((p as { n: number }).n);
      },
    },
    classify: classifySupabaseFailure,
    now: clock.now,
    newId,
    isOnline: async () => online,
  });

  for (const n of [1, 2, 3, 4]) await engine.enqueue("op", { n });
  await engine.flush();
  check("3. quatre actions hors ligne sont toutes conservées", (await engine.snapshot()).pending === 4);

  online = true;
  const result = await engine.flush();
  check("3. les quatre partent à la reconnexion", result.synced === 4);
  check("3. l'ordre d'arrivée est respecté", applied.join(",") === "1,2,3,4", applied.join(","));
}

// ---------------------------------------------------------------------------
// 4. Fermeture de l'app avec des mutations en attente, puis réouverture.
//    Simulée par un nouveau moteur branché sur le même stockage.
// ---------------------------------------------------------------------------
{
  const storage = makeStorage();
  const clock = makeClock();
  const applied: number[] = [];

  const beforeClose = new OfflineQueueEngine({
    storage,
    handlers: { "op": async () => { throw networkError(); } },
    classify: classifySupabaseFailure,
    now: clock.now,
    newId,
  });
  await beforeClose.enqueue("op", { n: 7 });
  await beforeClose.enqueue("op", { n: 8 });
  await beforeClose.flush();

  // L'application est tuée ici : nouvelle instance, même disque.
  const afterReopen = new OfflineQueueEngine({
    storage,
    handlers: { "op": async (p) => void applied.push((p as { n: number }).n) },
    classify: classifySupabaseFailure,
    now: clock.now,
    newId,
  });
  const snapshotAtStart = await afterReopen.snapshot();
  check("4. à la réouverture, les mutations sont retrouvées", snapshotAtStart.pending === 2);

  clock.advance(10 * 60_000); // on dépasse le délai de backoff
  const result = await afterReopen.flush();
  check("4. elles sont rejouées dans l'ordre", result.synced === 2 && applied.join(",") === "7,8", applied.join(","));
}

// ---------------------------------------------------------------------------
// 5. Échec du serveur pendant la synchronisation.
// ---------------------------------------------------------------------------
{
  const storage = makeStorage();
  const clock = makeClock();
  const applied: number[] = [];
  let failNext = true;
  const engine = new OfflineQueueEngine({
    storage,
    handlers: {
      "op": async (p) => {
        if (failNext) throw { code: "503", message: "service unavailable" };
        applied.push((p as { n: number }).n);
      },
    },
    classify: classifySupabaseFailure,
    now: clock.now,
    newId,
    retryBaseMs: 1_000,
  });

  await engine.enqueue("op", { n: 1 });
  await engine.enqueue("op", { n: 2 });
  const first = await engine.flush();
  check("5. échec serveur : le rejeu s'arrête, rien n'est perdu", first.synced === 0 && first.remaining === 2);
  check("5. l'échec est signalé", first.stoppedBecause === "retry-later");
  check(
    "5. la mutation suivante n'est pas appliquée avant la première",
    applied.length === 0,
    `appliquées : ${applied.join(",")}`
  );

  const tooSoon = await engine.flush();
  check("5. avant le délai, aucune nouvelle tentative", tooSoon.synced === 0);

  clock.advance(5_000);
  failNext = false;
  const second = await engine.flush();
  check("5. après le délai et rétablissement, tout passe", second.synced === 2 && applied.join(",") === "1,2");
}

// ---------------------------------------------------------------------------
// 6. Une mutation envoyée deux fois.
// ---------------------------------------------------------------------------
{
  const storage = makeStorage();
  const clock = makeClock();
  let calls = 0;
  const engine = new OfflineQueueEngine({
    storage,
    handlers: { "op": async () => void calls++ },
    classify: classifySupabaseFailure,
    now: clock.now,
    newId,
  });

  // a) Deux mises en file pour la même chose : une seule entrée.
  await engine.enqueue("op", { session: "s1", v: 1 }, { dedupeKey: "op:s1" });
  await engine.enqueue("op", { session: "s1", v: 2 }, { dedupeKey: "op:s1" });
  check("6. double mise en file de la même action : une seule entrée", (await engine.snapshot()).pending === 1);
  await engine.flush();
  check("6. donc une seule application", calls === 1);

  // b) Deux rejeux lancés en même temps : le second ne double pas le premier.
  calls = 0;
  let release = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  const concurrent = new OfflineQueueEngine({
    storage,
    handlers: {
      "op": async () => {
        calls++;
        await gate;
      },
    },
    classify: classifySupabaseFailure,
    now: clock.now,
    newId,
  });
  await concurrent.enqueue("op", { n: 1 });
  const flushA = concurrent.flush();
  const flushB = await concurrent.flush();
  release();
  const resultA = await flushA;
  check("6. deux rejeux simultanés : le second est refusé", flushB.stoppedBecause === "already-running");
  check("6. la mutation n'est appliquée qu'une fois", calls === 1 && resultA.synced === 1);
}

// ---------------------------------------------------------------------------
// 7. Session expirée pendant le rejeu.
// ---------------------------------------------------------------------------
{
  // a) Le rafraîchissement réussit : le rejeu reprend tout seul.
  const storage = makeStorage();
  const clock = makeClock();
  let refreshed = false;
  const applied: number[] = [];
  const engine = new OfflineQueueEngine({
    storage,
    handlers: {
      "op": async (p) => {
        if (!refreshed) throw jwtExpired();
        applied.push((p as { n: number }).n);
      },
    },
    classify: classifySupabaseFailure,
    now: clock.now,
    newId,
    refreshSession: async () => {
      refreshed = true;
      return true;
    },
  });
  await engine.enqueue("op", { n: 1 });
  const revived = await engine.flush();
  check("7. session expirée : rafraîchie puis rejeu réussi", revived.synced === 1 && applied.join(",") === "1");

  // b) Le rafraîchissement échoue : la file est conservée intacte.
  const storage2 = makeStorage();
  const lost = new OfflineQueueEngine({
    storage: storage2,
    handlers: { "op": async () => { throw jwtExpired(); } },
    classify: classifySupabaseFailure,
    now: clock.now,
    newId,
    refreshSession: async () => false,
  });
  await lost.enqueue("op", { n: 1 });
  const stuck = await lost.flush();
  check("7. rafraîchissement impossible : rien n'est perdu", stuck.stoppedBecause === "auth" && stuck.remaining === 1);
  check("7. et rien n'est passé en échec définitif", (await lost.snapshot()).failed === 0);

  // c) Aucune session du tout : on n'essaie même pas.
  const storage3 = makeStorage();
  let attempts = 0;
  const noSession = new OfflineQueueEngine({
    storage: storage3,
    handlers: { "op": async () => void attempts++ },
    classify: classifySupabaseFailure,
    now: clock.now,
    newId,
    hasSession: async () => false,
  });
  await noSession.enqueue("op", { n: 1 });
  const skipped = await noSession.flush();
  check("7. sans session : aucune tentative, file intacte", attempts === 0 && skipped.remaining === 1);
}

// ---------------------------------------------------------------------------
// 8. Réseau instable pendant la synchronisation.
// ---------------------------------------------------------------------------
{
  const storage = makeStorage();
  const clock = makeClock();
  const applied: number[] = [];
  let tick = 0;
  const engine = new OfflineQueueEngine({
    storage,
    handlers: {
      "op": async (p) => {
        // Une requête sur deux échoue, comme sur un réseau qui vacille.
        if (++tick % 2 === 1) throw networkError();
        applied.push((p as { n: number }).n);
      },
    },
    classify: classifySupabaseFailure,
    now: clock.now,
    newId,
    retryBaseMs: 100,
  });

  for (const n of [1, 2, 3, 4, 5]) await engine.enqueue("op", { n });
  for (let round = 0; round < 20; round++) {
    clock.advance(60_000);
    const result = await engine.flush();
    if (result.remaining === 0) break;
  }
  const snapshot = await engine.snapshot();
  check("8. réseau instable : les cinq finissent par passer", applied.join(",") === "1,2,3,4,5", applied.join(","));
  check("8. aucune mutation appliquée deux fois", new Set(applied).size === applied.length);
  check("8. file vide et aucun échec définitif", snapshot.pending === 0 && snapshot.failed === 0);
}

// ---------------------------------------------------------------------------
// Refus définitif : conservé et signalé, jamais jeté en silence.
// ---------------------------------------------------------------------------
{
  const storage = makeStorage();
  const clock = makeClock();
  let accept = false;
  const engine = new OfflineQueueEngine({
    storage,
    handlers: {
      "op": async () => {
        if (!accept) throw rlsError();
      },
      "autre": async () => {},
    },
    classify: classifySupabaseFailure,
    now: clock.now,
    newId,
  });

  await engine.enqueue("op", { n: 1 });
  await engine.enqueue("autre", { n: 2 });
  const result = await engine.flush();
  const snapshot = await engine.snapshot();
  check("refus définitif : déplacé en échec, pas supprimé", snapshot.failed === 1 && result.failed === 1);
  check("refus définitif : la mutation suivante passe quand même", result.synced === 1);
  check("refus définitif : l'échec est consultable avec sa raison", (await engine.listFailed())[0]?.reason.includes("row-level security") === true);

  accept = true;
  const revived = await engine.retryFailed();
  const afterRetry = await engine.flush();
  check("échec définitif : peut être remis en file et repasser", revived === 1 && afterRetry.synced === 1);
  check("et la liste d'échecs est alors vide", (await engine.snapshot()).failed === 0);
}

// ---------------------------------------------------------------------------
// Opération inconnue et nombre d'essais borné.
// ---------------------------------------------------------------------------
{
  const storage = makeStorage();
  const clock = makeClock();
  const engine = new OfflineQueueEngine({
    storage,
    handlers: {},
    classify: classifySupabaseFailure,
    now: clock.now,
    newId,
  });
  await engine.enqueue("inconnue", { n: 1 });
  await engine.flush();
  check("opération inconnue : conservée en échec, pas perdue", (await engine.snapshot()).failed === 1);

  const storage2 = makeStorage();
  const bounded = new OfflineQueueEngine({
    storage: storage2,
    handlers: { "op": async () => { throw networkError(); } },
    classify: classifySupabaseFailure,
    now: clock.now,
    newId,
    maxAttempts: 3,
    retryBaseMs: 10,
  });
  await bounded.enqueue("op", { n: 1 });
  for (let i = 0; i < 6; i++) {
    clock.advance(60_000);
    await bounded.flush();
  }
  const snapshot = await bounded.snapshot();
  check("essais bornés : la mutation finit en échec, jamais en boucle infinie", snapshot.pending === 0 && snapshot.failed === 1);
  check("essais bornés : la raison mentionne l'abandon", (await bounded.listFailed())[0]?.reason.includes("abandon") === true);
}

// ---------------------------------------------------------------------------
// Reprise de l'ancien format de file (appareils déjà installés).
// ---------------------------------------------------------------------------
{
  const legacy = JSON.stringify([
    { id: "vieux-1", table: "workout_sessions", payload: { id: "s1", status: "completed" }, createdAt: "2026-09-01T10:00:00.000Z" },
  ]);
  const storage = makeStorage(legacy);
  const clock = makeClock();
  const applied: unknown[] = [];
  const engine = new OfflineQueueEngine({
    storage,
    handlers: { "legacy.upsert": async (p) => void applied.push(p) },
    classify: classifySupabaseFailure,
    now: clock.now,
    newId,
    legacyKind: "legacy.upsert",
  });

  check("ancien format : les mutations sont reprises", (await engine.snapshot()).pending === 1);
  const result = await engine.flush();
  check("ancien format : rejouées sans perte", result.synced === 1);
  check(
    "ancien format : table et ligne préservées",
    JSON.stringify(applied) === JSON.stringify([{ table: "workout_sessions", row: { id: "s1", status: "completed" } }]),
    JSON.stringify(applied)
  );
}

// ---------------------------------------------------------------------------
// File illisible : mise en quarantaine, jamais écrasée sans trace.
// ---------------------------------------------------------------------------
{
  const storage = makeStorage("{ceci n'est pas du JSON");
  const clock = makeClock();
  let quarantined: string | null = null;
  const engine = new OfflineQueueEngine({
    storage,
    handlers: {},
    classify: classifySupabaseFailure,
    now: clock.now,
    newId,
    quarantine: async (raw) => {
      quarantined = raw;
    },
  });
  const snapshot = await engine.snapshot();
  check("file illisible : contenu mis en quarantaine", quarantined === "{ceci n'est pas du JSON");
  check("file illisible : l'application continue et le signale", snapshot.pending === 0 && snapshot.lastError !== null);
}

// ---------------------------------------------------------------------------
// Purge : réservée à la suppression de compte.
// ---------------------------------------------------------------------------
{
  const storage = makeStorage();
  const clock = makeClock();
  const engine = new OfflineQueueEngine({
    storage,
    handlers: { "op": async () => { throw rlsError(); } },
    classify: classifySupabaseFailure,
    now: clock.now,
    newId,
  });

  await engine.enqueue("op", { n: 1 });
  await engine.enqueue("op", { n: 2 });
  await engine.flush();
  const before = await engine.snapshot();
  check("purge : la file contient bien des mutations avant", before.pending + before.failed > 0);

  await engine.clear();
  const after = await engine.snapshot();
  check("purge : plus rien en attente ni en échec", after.pending === 0 && after.failed === 0);
  check("purge : plus d'erreur affichée", after.lastError === null);
  check("purge : le disque est bien vidé", !(storage.raw() ?? "").includes('"n":1'), storage.raw() ?? "");
}

// ---------------------------------------------------------------------------
// Classification des erreurs : le choix le plus lourd de conséquences.
// ---------------------------------------------------------------------------
{
  const cases: [string, unknown, FailureKind][] = [
    ["coupure réseau React Native", new TypeError("Network request failed"), "retryable"],
    ["fetch échoué", new Error("fetch failed"), "retryable"],
    ["délai dépassé", new Error("Request timed out"), "retryable"],
    ["requête annulée", new Error("The operation was aborted"), "retryable"],
    ["serveur indisponible", { code: "503", message: "Service Unavailable" }, "retryable"],
    ["trop de requêtes", { code: "429", message: "Too Many Requests" }, "retryable"],
    ["pooler saturé", { code: "53300", message: "too many connections" }, "retryable"],
    ["jeton expiré", { code: "PGRST301", message: "JWT expired" }, "auth"],
    ["refus RLS", { code: "42501", message: "violates row-level security policy" }, "permanent"],
    ["contrainte violée", { code: "23514", message: "violates check constraint" }, "permanent"],
    ["ligne absente", { code: "PGRST116", message: "0 rows" }, "permanent"],
    ["charge invalide", new Error("Charge invalide pour la fin de séance."), "permanent"],
  ];
  for (const [label, error, expected] of cases) {
    const got = classifySupabaseFailure(error);
    check(`classification : ${label} → ${expected}`, got === expected, `obtenu ${got}`);
  }
}

console.log("");
if (failures === 0) {
  console.log("TOUS LES CAS PASSENT");
} else {
  console.log(`${failures} CAS EN ÉCHEC`);
  process.exitCode = 1;
}
}

void main();
