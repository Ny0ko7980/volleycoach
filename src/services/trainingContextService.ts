import type { PlayerProfile } from "@/types/database";
import type { PlayerTrainingContext } from "@/services/recommendationEngine";
import { fetchRecentFeedback, fetchRecentSignals } from "@/services/feedbackService";
import { fetchSessionHistory } from "@/services/workoutService";
import { fetchSkillScores } from "@/services/skillScoreService";

// Seul point d'accès réseau du moteur de recommandation : il assemble le
// contexte du joueur, que `recommendSession` consomme ensuite sans rien lire.

/** Rassemble tout ce dont le moteur a besoin, en une passe. */
export async function buildTrainingContext(profile: PlayerProfile): Promise<PlayerTrainingContext> {
  const [recentSessions, recentFeedback, signals, scores] = await Promise.all([
    fetchSessionHistory(12),
    fetchRecentFeedback(80),
    fetchRecentSignals(80),
    fetchSkillScores(),
  ]);
  return { profile, recentSessions, recentFeedback, signals, scores };
}
