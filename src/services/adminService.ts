import { supabase } from "@/lib/supabase";
import type { Exercise, Objective, PlayerLevel, Position } from "@/types/database";

export interface GlobalStats {
  totalPlayers: number;
  totalExercises: number;
  totalCompletedSessions: number;
  totalGoalsAchieved: number;
}

export async function fetchGlobalStats(): Promise<GlobalStats> {
  const [players, exercises, sessions, goals] = await Promise.all([
    supabase.from("player_profiles").select("id", { count: "exact", head: true }),
    supabase.from("exercises").select("id", { count: "exact", head: true }),
    supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("goals").select("id", { count: "exact", head: true }).eq("status", "achieved"),
  ]);

  if (players.error) throw players.error;
  if (exercises.error) throw exercises.error;
  if (sessions.error) throw sessions.error;
  if (goals.error) throw goals.error;

  return {
    totalPlayers: players.count ?? 0,
    totalExercises: exercises.count ?? 0,
    totalCompletedSessions: sessions.count ?? 0,
    totalGoalsAchieved: goals.count ?? 0,
  };
}

export interface ExerciseInput {
  name: string;
  description: string;
  positions: Position[];
  level: PlayerLevel;
  objective: Objective;
  durationMinutes: number;
  equipment: string[];
  difficulty: number;
  instructions: string;
  commonMistakes?: string;
  tips?: string;
}

export async function createExerciseAsAdmin(input: ExerciseInput): Promise<Exercise> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Utilisateur non authentifié.");

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      name: input.name,
      description: input.description,
      positions: input.positions,
      level: input.level,
      objective: input.objective,
      duration_minutes: input.durationMinutes,
      equipment: input.equipment,
      difficulty: input.difficulty,
      instructions: input.instructions,
      common_mistakes: input.commonMistakes ?? null,
      tips: input.tips ?? null,
      created_by: auth.user.id,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Exercise;
}

export async function updateExerciseAsAdmin(id: string, input: ExerciseInput): Promise<Exercise> {
  const { data, error } = await supabase
    .from("exercises")
    .update({
      name: input.name,
      description: input.description,
      positions: input.positions,
      level: input.level,
      objective: input.objective,
      duration_minutes: input.durationMinutes,
      equipment: input.equipment,
      difficulty: input.difficulty,
      instructions: input.instructions,
      common_mistakes: input.commonMistakes ?? null,
      tips: input.tips ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Exercise;
}

export async function deleteExerciseAsAdmin(id: string): Promise<void> {
  const { error } = await supabase.from("exercises").delete().eq("id", id);
  if (error) throw error;
}
