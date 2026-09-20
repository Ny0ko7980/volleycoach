import type { Exercise } from "@/types/database";
import type { PlayerTrainingContext, SessionRecommendation } from "@/services/recommendationEngine";

/**
 * Point de branchement d'une IA dans la recommandation.
 *
 * Contrat volontairement étroit : l'IA ne reçoit que des exercices déjà
 * sélectionnés par la logique déterministe et ne peut que les réordonner ou en
 * écarter. Elle ne peut pas en inventer, ni en faire apparaître un qui ne
 * serait pas dans la bibliothèque VolleyCoach — la garantie ne repose pas sur
 * la consigne donnée au modèle, mais sur le fait que la fonction filtre sa
 * réponse contre la liste de candidats.
 *
 * Tant qu'aucun planificateur n'est branché, `refineSelection` renvoie la
 * sélection déterministe : l'application fonctionne à l'identique.
 */

export interface AiPlanner {
  /**
   * Renvoie les identifiants d'exercices retenus, dans l'ordre souhaité.
   * Tout identifiant absent de `candidates` sera ignoré par l'appelant.
   */
  rank(input: {
    context: PlayerTrainingContext;
    recommendation: SessionRecommendation;
    candidates: Exercise[];
  }): Promise<string[]>;
}

let planner: AiPlanner | null = null;

/**
 * Installe un planificateur IA. Appelé au démarrage si la fonctionnalité est
 * activée ; jamais appelé aujourd'hui, la logique déterministe suffisant à
 * faire fonctionner l'application.
 */
export function setAiPlanner(next: AiPlanner | null): void {
  planner = next;
}

export function hasAiPlanner(): boolean {
  return planner !== null;
}

/**
 * Affine une sélection d'exercices.
 *
 * Toute anomalie — pas de planificateur, erreur réseau, réponse vide ou
 * identifiants inconnus — ramène silencieusement à la sélection déterministe.
 * Une séance doit pouvoir être produite même IA indisponible.
 */
export async function refineSelection(input: {
  context: PlayerTrainingContext;
  recommendation: SessionRecommendation;
  candidates: Exercise[];
}): Promise<Exercise[]> {
  if (!planner) return input.candidates;

  try {
    const orderedIds = await planner.rank(input);
    const byId = new Map(input.candidates.map((exercise) => [exercise.id, exercise]));
    const refined = orderedIds
      .map((id) => byId.get(id))
      .filter((exercise): exercise is Exercise => exercise !== undefined);
    return refined.length > 0 ? refined : input.candidates;
  } catch {
    return input.candidates;
  }
}
