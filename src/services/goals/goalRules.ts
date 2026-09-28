import type { Goal, GoalStatus } from "@/types/database";

/**
 * Règles d'un objectif, sans dépendance à React Native ni à Supabase.
 *
 * Isolées ici pour une raison précise : ce sont elles qui décident qu'un
 * objectif est atteint, et elles doivent donner le même résultat qu'elles
 * soient appliquées à la saisie du joueur ou au rejeu d'une écriture mise en
 * file hors-ligne. Un module pur se vérifie en une commande
 * (`npm run goals:check`), sans émulateur ni base de données.
 */

/**
 * Statut d'un objectif à partir de sa valeur et de sa cible.
 *
 * Une valeur repassée sous la cible refait basculer l'objectif en cours : le
 * joueur qui se corrige après une saisie erronée ne reste pas bloqué sur un
 * « Atteint » faux.
 */
export function goalStatusFor(currentValue: number, targetValue: number): GoalStatus {
  return currentValue >= targetValue ? "achieved" : "active";
}

/** Progression affichée, bornée à 0–100 %. */
export function goalProgressPercent(goal: Pick<Goal, "current_value" | "target_value">): number {
  if (goal.target_value === 0) return 0;
  return Math.max(0, Math.min(100, Math.round((goal.current_value / goal.target_value) * 100)));
}

export interface UpdateGoalProgressInput {
  goalId: string;
  currentValue: number;
  /**
   * Cible connue de l'appelant. Elle est passée plutôt que relue : cela
   * supprime un aller-retour, et surtout cela rend l'écriture idempotente —
   * indispensable puisqu'un rejeu hors-ligne peut l'appliquer plusieurs fois.
   */
  targetValue: number;
}

/**
 * Valide une charge lue sur le disque.
 *
 * La file hors-ligne relit du JSON écrit par une version antérieure de
 * l'application : rien ne garantit sa forme. Une charge illisible doit être
 * refusée franchement plutôt que produire une écriture absurde.
 */
export function isGoalProgressPayload(payload: unknown): payload is UpdateGoalProgressInput {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as Partial<UpdateGoalProgressInput>;
  return (
    typeof candidate.goalId === "string" &&
    candidate.goalId.length > 0 &&
    typeof candidate.currentValue === "number" &&
    Number.isFinite(candidate.currentValue) &&
    typeof candidate.targetValue === "number" &&
    Number.isFinite(candidate.targetValue)
  );
}

/** Clé de dédoublonnage : un objectif n'a qu'une valeur courante en attente. */
export function goalProgressDedupeKey(operation: string, goalId: string): string {
  return `${operation}:${goalId}`;
}
