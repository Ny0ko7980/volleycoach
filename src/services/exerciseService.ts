import { supabase } from "@/lib/supabase";
import type { Exercise, Objective, PlayerLevel, Position } from "@/types/database";

export interface ExerciseFilters {
  position?: Position;
  level?: PlayerLevel;
  objective?: Objective;
  maxDuration?: number;
  difficulty?: number;
  equipment?: string;
}

export async function fetchExercises(filters: ExerciseFilters = {}): Promise<Exercise[]> {
  let query = supabase.from("exercises").select("*").order("name", { ascending: true });

  if (filters.position) query = query.or(`positions.cs.{${filters.position}},positions.eq.{}`);
  if (filters.level) query = query.eq("level", filters.level);
  if (filters.objective) query = query.eq("objective", filters.objective);
  if (filters.maxDuration) query = query.lte("duration_minutes", filters.maxDuration);
  if (filters.difficulty) query = query.lte("difficulty", filters.difficulty);
  if (filters.equipment) query = query.contains("equipment", [filters.equipment]);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Exercise[];
}

export async function fetchExerciseById(id: string): Promise<Exercise | null> {
  const { data, error } = await supabase.from("exercises").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Exercise | null;
}
