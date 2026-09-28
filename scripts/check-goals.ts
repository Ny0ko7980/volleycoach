// Contrôle de la progression des objectifs.
//
// Un objectif est un état, pas un journal : sa valeur courante et son statut
// doivent être les mêmes que la saisie parte tout de suite ou qu'elle soit
// rejouée le lendemain, au retour du réseau. Ce script vérifie la règle pure,
// la validation de la charge écrite sur le disque, et le comportement complet
// de la file hors-ligne sur ce cas — avec un stockage et un réseau simulés,
// donc sans émulateur ni base de données.
//
// Lancement : npm run goals:check

import {
  goalProgressDedupeKey,
  goalProgressPercent,
  goalStatusFor,
  isGoalProgressPayload,
  type UpdateGoalProgressInput,
} from "@/services/goals/goalRules";
import { OfflineQueueEngine, type QueueStorage } from "@/services/offline/queueEngine";
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

function makeStorage(): QueueStorage & { raw: () => string | null } {
  let value: string | null = null;
  return {
    read: async () => value,
    write: async (next) => {
      value = next;
    },
    raw: () => value,
  };
}

let idCounter = 0;
const newId = () => `g${++idCounter}`;
const networkError = () => new TypeError("Network request failed");
const rlsError = () => ({ code: "42501", message: "new row violates row-level security policy" });

const OPERATION = "goal.update_progress";

/**
 * Table `goals` simulée. Le gestionnaire applique exactement ce que fait
 * `updateGoalProgress` : écrire la valeur et recalculer le statut à partir de
 * la cible portée par la charge.
 */
function makeGoalsTable(rows: Record<string, { current: number; target: number; status: string }>) {
  const writes: UpdateGoalProgressInput[] = [];
  let online = true;
  return {
    rows,
    writes,
    setOnline: (value: boolean) => {
      online = value;
    },
    apply: async (payload: unknown) => {
      if (!online) throw networkError();
      if (!isGoalProgressPayload(payload)) throw new Error("Charge invalide pour une progression d'objectif.");
      const row = rows[payload.goalId];
      if (!row) throw { code: "PGRST116", message: "0 rows" };
      writes.push(payload);
      row.current = payload.currentValue;
      row.status = goalStatusFor(payload.currentValue, payload.targetValue);
    },
  };
}

/** Horloge manipulable : les délais d'attente entre tentatives sont franchis sans attendre. */
function makeClock(start = 1_700_000_000_000) {
  let current = start;
  return { now: () => current, advance: (ms: number) => (current += ms) };
}

function makeEngine(
  apply: (payload: unknown) => Promise<void>,
  storage: QueueStorage,
  clock = makeClock()
) {
  return new OfflineQueueEngine({
    storage,
    handlers: { [OPERATION]: apply },
    classify: classifySupabaseFailure,
    now: clock.now,
    newId,
  });
}

function enqueueProgress(engine: OfflineQueueEngine, input: UpdateGoalProgressInput) {
  return engine.enqueue(OPERATION, input, { dedupeKey: goalProgressDedupeKey(OPERATION, input.goalId) });
}

async function main(): Promise<void> {
  // -------------------------------------------------------------------------
  // 1. La progression affichée reflète la valeur par rapport à la cible.
  // -------------------------------------------------------------------------
  check("1. départ à zéro : 0 %", goalProgressPercent({ current_value: 0, target_value: 50 }) === 0);
  check("1. à mi-chemin : 50 %", goalProgressPercent({ current_value: 25, target_value: 50 }) === 50);
  check("1. cible atteinte : 100 %", goalProgressPercent({ current_value: 50, target_value: 50 }) === 100);
  check("1. cible dépassée : borné à 100 %", goalProgressPercent({ current_value: 80, target_value: 50 }) === 100);
  check("1. valeur négative : borné à 0 %", goalProgressPercent({ current_value: -10, target_value: 50 }) === 0);
  check("1. cible nulle : 0 % et pas de division par zéro", goalProgressPercent({ current_value: 5, target_value: 0 }) === 0);
  check("1. arrondi à l'entier", goalProgressPercent({ current_value: 1, target_value: 3 }) === 33);

  // -------------------------------------------------------------------------
  // 2. Le statut « atteint » est appliqué quand la cible est atteinte.
  // -------------------------------------------------------------------------
  check("2. sous la cible : en cours", goalStatusFor(49, 50) === "active");
  check("2. cible exacte : atteint", goalStatusFor(50, 50) === "achieved");
  check("2. cible dépassée : atteint", goalStatusFor(51, 50) === "achieved");
  check("2. correction sous la cible : redevient en cours", goalStatusFor(40, 50) === "active");
  check(
    "2. règle idempotente : deux applications donnent le même statut",
    goalStatusFor(50, 50) === goalStatusFor(50, 50)
  );

  // -------------------------------------------------------------------------
  // 3. Charge relue sur le disque : elle vient d'une version antérieure et
  //    rien ne garantit sa forme.
  // -------------------------------------------------------------------------
  check("3. charge complète acceptée", isGoalProgressPayload({ goalId: "a", currentValue: 3, targetValue: 5 }));
  check("3. charge nulle refusée", !isGoalProgressPayload(null));
  check("3. charge non-objet refusée", !isGoalProgressPayload("a"));
  check("3. identifiant vide refusé", !isGoalProgressPayload({ goalId: "", currentValue: 3, targetValue: 5 }));
  check("3. identifiant manquant refusé", !isGoalProgressPayload({ currentValue: 3, targetValue: 5 }));
  check("3. valeur texte refusée", !isGoalProgressPayload({ goalId: "a", currentValue: "3", targetValue: 5 }));
  check("3. cible manquante refusée", !isGoalProgressPayload({ goalId: "a", currentValue: 3 }));
  check("3. NaN refusé", !isGoalProgressPayload({ goalId: "a", currentValue: Number.NaN, targetValue: 5 }));
  check("3. infini refusé", !isGoalProgressPayload({ goalId: "a", currentValue: Number.POSITIVE_INFINITY, targetValue: 5 }));
  check(
    "3. clé de dédoublonnage propre à chaque objectif",
    goalProgressDedupeKey(OPERATION, "a") !== goalProgressDedupeKey(OPERATION, "b")
  );

  // -------------------------------------------------------------------------
  // 4. Hors ligne : la saisie est conservée, puis appliquée au retour.
  // -------------------------------------------------------------------------
  {
    const table = makeGoalsTable({ g1: { current: 0, target: 50, status: "active" } });
    const storage = makeStorage();
    const engine = makeEngine(table.apply, storage);

    table.setOnline(false);
    await enqueueProgress(engine, { goalId: "g1", currentValue: 20, targetValue: 50 });
    const offline = await engine.snapshot();
    check("4. hors ligne : la saisie est mise en attente", offline.pending === 1);
    check("4. hors ligne : rien n'est écrit en base", table.rows.g1?.current === 0);
    check("4. hors ligne : la saisie est sur le disque", (storage.raw() ?? "").includes('"currentValue":20'));

    table.setOnline(true);
    const result = await engine.flush();
    const synced = await engine.snapshot();
    check("4. reconnexion : la saisie part", result.synced === 1 && synced.pending === 0);
    check("4. reconnexion : la valeur est celle saisie hors ligne", table.rows.g1?.current === 20);
    check("4. reconnexion : le statut reste en cours", table.rows.g1?.status === "active");
  }

  // -------------------------------------------------------------------------
  // 5. Plusieurs saisies hors ligne sur le même objectif : une seule écriture,
  //    la dernière valeur. Une progression est un état, pas un journal.
  // -------------------------------------------------------------------------
  {
    const table = makeGoalsTable({ g1: { current: 0, target: 50, status: "active" } });
    const engine = makeEngine(table.apply, makeStorage());

    table.setOnline(false);
    await enqueueProgress(engine, { goalId: "g1", currentValue: 10, targetValue: 50 });
    await enqueueProgress(engine, { goalId: "g1", currentValue: 25, targetValue: 50 });
    await enqueueProgress(engine, { goalId: "g1", currentValue: 30, targetValue: 50 });
    const pending = await engine.snapshot();
    check("5. trois saisies se réduisent à une seule en attente", pending.pending === 1, `${pending.pending}`);

    table.setOnline(true);
    await engine.flush();
    check("5. une seule écriture serveur", table.writes.length === 1, `${table.writes.length}`);
    check("5. la dernière valeur l'emporte", table.rows.g1?.current === 30);
  }

  // -------------------------------------------------------------------------
  // 6. Deux objectifs différents ne se recouvrent pas.
  // -------------------------------------------------------------------------
  {
    const table = makeGoalsTable({
      g1: { current: 0, target: 50, status: "active" },
      g2: { current: 0, target: 10, status: "active" },
    });
    const engine = makeEngine(table.apply, makeStorage());

    table.setOnline(false);
    await enqueueProgress(engine, { goalId: "g1", currentValue: 10, targetValue: 50 });
    await enqueueProgress(engine, { goalId: "g2", currentValue: 4, targetValue: 10 });
    check("6. deux objectifs : deux saisies en attente", (await engine.snapshot()).pending === 2);

    table.setOnline(true);
    await engine.flush();
    check("6. chaque objectif reçoit sa valeur", table.rows.g1?.current === 10 && table.rows.g2?.current === 4);
  }

  // -------------------------------------------------------------------------
  // 7. Objectif atteint hors ligne : le statut bascule à la synchronisation.
  // -------------------------------------------------------------------------
  {
    const table = makeGoalsTable({ g1: { current: 40, target: 50, status: "active" } });
    const engine = makeEngine(table.apply, makeStorage());

    table.setOnline(false);
    await enqueueProgress(engine, { goalId: "g1", currentValue: 50, targetValue: 50 });
    check("7. hors ligne : le statut n'a pas encore bougé", table.rows.g1?.status === "active");

    table.setOnline(true);
    await engine.flush();
    check("7. synchronisation : le statut devient atteint", table.rows.g1?.status === "achieved");
    check("7. synchronisation : la valeur est la cible", table.rows.g1?.current === 50);
  }

  // -------------------------------------------------------------------------
  // 8. Rejeu : la même charge appliquée deux fois laisse le même état.
  //    C'est la propriété qui autorise une nouvelle tentative sans risque.
  // -------------------------------------------------------------------------
  {
    const table = makeGoalsTable({ g1: { current: 0, target: 50, status: "active" } });
    const payload: UpdateGoalProgressInput = { goalId: "g1", currentValue: 50, targetValue: 50 };
    await table.apply(payload);
    const first = { ...table.rows.g1 };
    await table.apply(payload);
    const second = { ...table.rows.g1 };
    check("8. rejeu : état identique après une seconde application", JSON.stringify(first) === JSON.stringify(second));
    check("8. rejeu : statut atteint conservé", second.status === "achieved");
  }

  // -------------------------------------------------------------------------
  // 9. Coupure pendant l'envoi : la saisie n'est pas perdue et repart.
  // -------------------------------------------------------------------------
  {
    const table = makeGoalsTable({ g1: { current: 0, target: 50, status: "active" } });
    const clock = makeClock();
    const engine = makeEngine(table.apply, makeStorage(), clock);

    table.setOnline(false);
    await enqueueProgress(engine, { goalId: "g1", currentValue: 15, targetValue: 50 });
    const firstFlush = await engine.flush();
    check("9. coupure : rien n'est synchronisé", firstFlush.synced === 0);
    check("9. coupure : la saisie reste en attente", (await engine.snapshot()).pending === 1);
    check("9. coupure : elle n'est pas comptée en échec définitif", (await engine.snapshot()).failed === 0);

    // Une tentative ratée impose un délai avant la suivante : sans franchir ce
    // délai, la file a raison de ne rien réessayer tout de suite.
    const immediate = await engine.flush();
    check("9. coupure : pas de nouvelle tentative avant le délai d'attente", immediate.synced === 0);

    table.setOnline(true);
    clock.advance(60_000);
    const secondFlush = await engine.flush();
    check("9. retour du réseau : elle part enfin", secondFlush.synced === 1 && table.rows.g1?.current === 15);
  }

  // -------------------------------------------------------------------------
  // 10. Refus définitif : l'échec est visible, la file ne tourne pas en rond.
  // -------------------------------------------------------------------------
  {
    const storage = makeStorage();
    const engine = makeEngine(async () => {
      throw rlsError();
    }, storage);

    await enqueueProgress(engine, { goalId: "g1", currentValue: 15, targetValue: 50 });
    await engine.flush();
    const snapshot = await engine.snapshot();
    check("10. refus définitif : la saisie sort de la file d'attente", snapshot.pending === 0);
    check("10. refus définitif : elle est conservée en échec, pas perdue", snapshot.failed === 1);
    check("10. refus définitif : l'échec est annoncé", snapshot.lastError !== null);

    const again = await engine.flush();
    check("10. refus définitif : aucune nouvelle tentative automatique", again.synced === 0 && again.failed === 0);
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
