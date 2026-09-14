import { supabase } from "@/lib/supabase";
import type { PlayerSkillScore, TrainingSkill } from "@/types/database";
import { SCORED_SKILLS } from "@/constants/skills";
import { fetchStatistics } from "@/services/statisticsService";
import { fetchRecentFeedback } from "@/services/feedbackService";
import { computeSkillScores, MIN_SAMPLE_SIZE, NEUTRAL_SCORE, type SkillScoreResult } from "@/services/skillScoring";

// Persistance des scores de compétence. Le calcul lui-même vit dans
// `skillScoring` (fonction pure) ; ce module ne fait que lire les données du
// joueur et écrire le résultat.

export { MIN_SAMPLE_SIZE, computeSkillScores, type SkillScoreResult } from "@/services/skillScoring";

/**
 * Recalcule les scores depuis les données du joueur et les enregistre.
 *
 * Les scores sont persistés plutôt que recalculés à chaque affichage afin que
 * le moteur de recommandation, l'écran Progression et une éventuelle analyse
 * côté serveur lisent tous la même valeur.
 */
export async function refreshSkillScores(): Promise<SkillScoreResult[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const [feedback, statistics] = await Promise.all([fetchRecentFeedback(200), fetchStatistics()]);
  const results = computeSkillScores(feedback, statistics);

  const rows = results.map((result) => ({
    player_id: auth.user!.id,
    skill: result.skill,
    score: result.score,
    sample_size: result.sampleSize,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("player_skill_scores").upsert(rows, { onConflict: "player_id,skill" });
  if (error) throw error;
  return results;
}

export async function fetchSkillScores(): Promise<SkillScoreResult[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("player_skill_scores")
    .select("*")
    .eq("player_id", auth.user.id);
  if (error) throw error;

  const stored = new Map((data ?? []).map((row) => [row.skill as TrainingSkill, row as PlayerSkillScore]));
  return SCORED_SKILLS.map((skill) => {
    const row = stored.get(skill);
    return {
      skill,
      score: row?.score ?? NEUTRAL_SCORE,
      sampleSize: row?.sample_size ?? 0,
      reliable: (row?.sample_size ?? 0) >= MIN_SAMPLE_SIZE,
    };
  });
}
