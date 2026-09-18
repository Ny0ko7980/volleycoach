import type { ExerciseFeedback, Statistic, TrainingSkill } from "@/types/database";
import { SCORED_SKILLS, skillForStatCategory } from "@/constants/skills";
import { computeCategoryScore } from "@/services/statisticsScoring";

// Calcul pur des scores de compétence : aucune lecture ni écriture, pour
// pouvoir être vérifié sans base de données et remonter côté serveur si
// nécessaire.

/**
 * En dessous de ce nombre d'observations, aucun score n'est affiché : l'app
 * annonce qu'il manque des séances plutôt que d'exhiber un chiffre précis
 * qu'aucune donnée ne soutient.
 */
export const MIN_SAMPLE_SIZE = 3;

export const NEUTRAL_SCORE = 50;

export interface SkillScoreResult {
  skill: TrainingSkill;
  score: number;
  sampleSize: number;
  /** `false` tant que le seuil d'observations n'est pas atteint. */
  reliable: boolean;
}

/**
 * Calcule un score interne de progression par compétence, entre 0 et 100.
 *
 * Ce n'est pas une mesure de niveau réel. Le score résume trois choses déjà
 * enregistrées par le joueur :
 *
 *   - son ressenti sur les exercices de la compétence (un exercice « trop
 *     facile » tire vers le haut, un exercice « impossible » vers le bas) ;
 *   - le volume de travail sur la compétence, qui rapproche le score de sa
 *     valeur réelle sans jamais la déterminer seul ;
 *   - la tendance de ses statistiques, quand la compétence en possède.
 *
 * Fonction pure : elle ne lit rien et n'écrit rien, ce qui la rend testable et
 * réutilisable côté serveur si le calcul doit y remonter un jour.
 */
export function computeSkillScores(
  feedback: ExerciseFeedback[],
  statistics: Statistic[]
): SkillScoreResult[] {
  const statsBySkill = new Map<TrainingSkill, Statistic[]>();
  for (const stat of statistics) {
    const skill = skillForStatCategory(stat.category);
    if (!skill) continue;
    const bucket = statsBySkill.get(skill);
    if (bucket) bucket.push(stat);
    else statsBySkill.set(skill, [stat]);
  }

  return SCORED_SKILLS.map((skill) => {
    const skillFeedback = feedback.filter((entry) => entry.skill === skill);
    const skillStats = statsBySkill.get(skill) ?? [];
    const sampleSize = skillFeedback.length + skillStats.length;

    if (sampleSize < MIN_SAMPLE_SIZE) {
      return { skill, score: NEUTRAL_SCORE, sampleSize, reliable: false };
    }

    // Ressenti : « trop facile » et « adapté » créditent, les deux autres
    // pénalisent. Un exercice impossible pèse plus lourd qu'un exercice
    // simplement difficile.
    const feedbackPoints = skillFeedback.reduce((total, entry) => {
      if (entry.rating === "trop_facile") return total + 12;
      if (entry.rating === "adapte") return total + 6;
      if (entry.rating === "difficile") return total - 6;
      return total - 12;
    }, 0);
    const feedbackContribution =
      skillFeedback.length > 0 ? clamp(feedbackPoints / skillFeedback.length, -20, 20) : 0;

    // Volume : jusqu'à 15 points pour la régularité du travail, plafonnés
    // pour qu'accumuler des séances ne suffise jamais à atteindre 100.
    const volumeContribution = Math.min(15, sampleSize * 1.5);

    // Statistiques : on réutilise le score de catégorie existant, ramené
    // autour de 0 pour qu'il ajuste le score plutôt qu'il ne le remplace.
    const statContribution = skillStats.length > 0 ? (computeCategoryScore(skillStats) - NEUTRAL_SCORE) * 0.3 : 0;

    const score = Math.round(
      clamp(NEUTRAL_SCORE + feedbackContribution + volumeContribution + statContribution, 0, 100)
    );
    return { skill, score, sampleSize, reliable: true };
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
