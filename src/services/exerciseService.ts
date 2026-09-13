import { supabase } from "@/lib/supabase";
import type {
  Exercise,
  ExerciseCategory,
  Intensity,
  Objective,
  PlayerLevel,
  Position,
} from "@/types/database";

export interface ExerciseFilters {
  position?: Position;
  level?: PlayerLevel;
  objective?: Objective;
  /** Famille de geste, plus fine que l'objectif d'entraînement. */
  category?: ExerciseCategory;
  /** Plusieurs familles de geste acceptées (bloc physique d'une séance, par exemple). */
  categories?: ExerciseCategory[];
  maxDuration?: number;
  difficulty?: number;
  /** Exercice nécessitant ce matériel précis. */
  equipment?: string;
  /** Ne garder que les exercices réalisables avec le matériel disponible. */
  availableEquipment?: string[];
  /** Nombre de joueurs présents : l'exercice doit être praticable à cet effectif. */
  players?: number;
  intensity?: Intensity;
  maxPhysicalLoad?: number;
  maxTechnicalLoad?: number;
  /** Uniquement les exercices réalisables seul. */
  soloOnly?: boolean;
  /** Uniquement les exercices ne nécessitant pas de ballon. */
  withoutBall?: boolean;
  /** Écarte les exercices portant l'un de ces tags (zone à ménager, par exemple). */
  excludeTags?: string[];
}

export async function fetchExercises(filters: ExerciseFilters = {}): Promise<Exercise[]> {
  let query = supabase.from("exercises").select("*").order("name", { ascending: true });

  // Un tableau vide signifie "tous les postes" / "tous les niveaux".
  if (filters.position) query = query.or(`positions.cs.{${filters.position}},positions.eq.{}`);
  if (filters.level) query = query.or(`levels.cs.{${filters.level}},levels.eq.{}`);

  if (filters.objective) query = query.eq("objective", filters.objective);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.categories?.length) query = query.in("category", filters.categories);
  if (filters.maxDuration) query = query.lte("duration_minutes", filters.maxDuration);
  if (filters.difficulty) query = query.lte("difficulty", filters.difficulty);
  if (filters.equipment) query = query.contains("equipment", [filters.equipment]);
  if (filters.availableEquipment) query = query.containedBy("equipment", filters.availableEquipment);
  if (filters.intensity) query = query.eq("intensity", filters.intensity);
  if (filters.maxPhysicalLoad) query = query.lte("physical_load", filters.maxPhysicalLoad);
  if (filters.maxTechnicalLoad) query = query.lte("technical_load", filters.maxTechnicalLoad);
  if (filters.soloOnly) query = query.eq("solo_compatible", true);
  if (filters.withoutBall) query = query.eq("ball_required", false);
  if (filters.excludeTags?.length) query = query.not("tags", "ov", `{${filters.excludeTags.join(",")}}`);

  if (filters.players) {
    query = query.lte("players_min", filters.players).gte("players_max", filters.players);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Exercise[];
}

export async function fetchExerciseById(id: string): Promise<Exercise | null> {
  const { data, error } = await supabase.from("exercises").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Exercise | null;
}
