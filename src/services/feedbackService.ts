import { supabase } from "@/lib/supabase";
import type {
  ExerciseFeedback,
  FeedbackRating,
  SkillSignal,
  SkillSignalDirection,
  SkillSignalSource,
  TrainingSkill,
} from "@/types/database";

export interface SaveExerciseFeedbackInput {
  sessionId: string;
  exerciseId: string;
  skill: TrainingSkill;
  rating: FeedbackRating;
}

/**
 * Enregistre le ressenti du joueur sur un exercice.
 *
 * L'upsert sur (session_id, exercise_id) laisse le joueur revenir sur son
 * choix pendant la séance sans créer de doublon.
 */
export async function saveExerciseFeedback(input: SaveExerciseFeedbackInput): Promise<ExerciseFeedback> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Utilisateur non authentifié.");

  const { data, error } = await supabase
    .from("exercise_feedback")
    .upsert(
      {
        player_id: auth.user.id,
        session_id: input.sessionId,
        exercise_id: input.exerciseId,
        skill: input.skill,
        rating: input.rating,
      },
      { onConflict: "session_id,exercise_id" }
    )
    .select("*")
    .single();
  if (error) throw error;

  await emitSignalForRating(input, auth.user.id);
  return data as ExerciseFeedback;
}

/**
 * Traduit un ressenti en signal de compétence, quand il en porte un.
 *
 * « Adapté » n'apprend rien au moteur : le joueur est au bon niveau, aucun
 * signal n'est émis. Un échec revient plus lourd qu'une réussite facile, pour
 * que le moteur réagisse vite à un exercice hors de portée.
 */
async function emitSignalForRating(input: SaveExerciseFeedbackInput, playerId: string): Promise<void> {
  const interpretation: Partial<Record<FeedbackRating, { direction: SkillSignalDirection; weight: number }>> = {
    trop_facile: { direction: "strength", weight: 1 },
    difficile: { direction: "weakness", weight: 1 },
    impossible: { direction: "weakness", weight: 2 },
  };
  const signal = interpretation[input.rating];
  if (!signal) return;

  // Un signal manquant ne doit pas faire échouer l'enregistrement du ressenti,
  // qui est ce que le joueur vient d'exprimer.
  await recordSkillSignal({
    playerId,
    skill: input.skill,
    source: "feedback",
    direction: signal.direction,
    weight: signal.weight,
    sessionId: input.sessionId,
  }).catch(() => undefined);
}

export interface RecordSkillSignalInput {
  playerId?: string;
  skill: TrainingSkill;
  source: SkillSignalSource;
  direction: SkillSignalDirection;
  weight?: number;
  note?: string;
  sessionId?: string;
}

/**
 * Point d'entrée unique des observations sur une compétence.
 *
 * Le moteur de recommandation ne lit que `skill_signals` pour repérer les
 * points faibles : brancher l'analyse vidéo plus tard consistera à appeler
 * cette fonction avec `source: "video"`, sans modifier le moteur.
 */
export async function recordSkillSignal(input: RecordSkillSignalInput): Promise<SkillSignal> {
  let playerId = input.playerId;
  if (!playerId) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Utilisateur non authentifié.");
    playerId = auth.user.id;
  }

  const { data, error } = await supabase
    .from("skill_signals")
    .insert({
      player_id: playerId,
      skill: input.skill,
      source: input.source,
      direction: input.direction,
      weight: input.weight ?? 1,
      note: input.note ?? null,
      session_id: input.sessionId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as SkillSignal;
}

export async function fetchSessionFeedback(sessionId: string): Promise<ExerciseFeedback[]> {
  const { data, error } = await supabase
    .from("exercise_feedback")
    .select("*")
    .eq("session_id", sessionId);
  if (error) throw error;
  return (data ?? []) as ExerciseFeedback[];
}

/** Ressentis les plus récents, du plus récent au plus ancien. */
export async function fetchRecentFeedback(limit = 60): Promise<ExerciseFeedback[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("exercise_feedback")
    .select("*")
    .eq("player_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ExerciseFeedback[];
}

/** Signaux les plus récents, toutes sources confondues (feedback, vidéo à venir…). */
export async function fetchRecentSignals(limit = 80): Promise<SkillSignal[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("skill_signals")
    .select("*")
    .eq("player_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as SkillSignal[];
}
