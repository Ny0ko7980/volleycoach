import { supabase } from "@/lib/supabase";
import type { Objective, PlayerLevel, Position, Workout, WorkoutExercise, WorkoutSession } from "@/types/database";
import { fetchExercises } from "@/services/exerciseService";

export interface GenerateWorkoutParams {
  objective: Objective;
  durationMinutes: number;
  level: PlayerLevel;
  position: Position;
}

/**
 * Générateur de séance basé sur des règles (poste/niveau/objectif/durée).
 * Sélectionne 2 à 4 exercices de la bibliothèque adaptés au profil, avec un
 * volume (séries/répétitions/récupération) calculé selon le niveau, jusqu'à
 * remplir la durée demandée.
 */
export async function generateWorkout(params: GenerateWorkoutParams): Promise<Workout & { exercises: WorkoutExercise[] }> {
  const { objective, durationMinutes, level, position } = params;

  const candidates = await fetchExercises({ objective, position });
  const pool = candidates.length > 0 ? candidates : await fetchExercises({ objective });
  if (pool.length === 0) {
    throw new Error("Aucun exercice disponible pour cet objectif. Réessaie avec un autre objectif.");
  }

  const warmupCooldownTime = 10; // 5 min échauffement + 5 min retour au calme
  const availableTime = Math.max(durationMinutes - warmupCooldownTime, 10);

  const levelVolume: Record<PlayerLevel, { sets: number; rest: number }> = {
    debutant: { sets: 3, rest: 40 },
    intermediaire: { sets: 4, rest: 30 },
    avance: { sets: 5, rest: 25 },
    competition: { sets: 5, rest: 20 },
  };
  const volume = levelVolume[level];

  const selected: typeof pool = [];
  let usedTime = 0;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  for (const ex of shuffled) {
    if (usedTime + ex.duration_minutes > availableTime && selected.length > 0) continue;
    selected.push(ex);
    usedTime += ex.duration_minutes;
    if (usedTime >= availableTime || selected.length >= 4) break;
  }
  if (selected.length === 0 && shuffled[0]) selected.push(shuffled[0]);

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Utilisateur non authentifié.");

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      player_id: auth.user.id,
      title: `Séance ${objective} — ${durationMinutes} min`,
      objective,
      duration_minutes: durationMinutes,
      difficulty: Math.min(5, Math.max(1, Math.round(selected.reduce((s, e) => s + e.difficulty, 0) / selected.length))),
      warmup: "Échauffement articulaire + mobilité dynamique — 5 min",
      cooldown: "Étirements légers + respiration — 5 min",
      generated: true,
    })
    .select("*")
    .single();
  if (workoutError) throw workoutError;

  const rows = selected.map((ex, index) => ({
    workout_id: workout.id,
    exercise_id: ex.id,
    order_index: index,
    sets: volume.sets,
    reps: exerciseReps(ex.objective, level),
    rest_seconds: volume.rest,
  }));

  const { data: workoutExercises, error: weError } = await supabase
    .from("workout_exercises")
    .insert(rows)
    .select("*, exercise:exercises(*)");
  if (weError) throw weError;

  return { ...(workout as Workout), exercises: (workoutExercises ?? []) as WorkoutExercise[] };
}

function exerciseReps(objective: string, level: PlayerLevel): string {
  const base: Record<string, string> = {
    reception: "20 ballons",
    service: "8 services",
    attaque: "8 attaques",
    bloc: "8 sauts",
    detente: "8 sauts",
    vitesse: "6 allers-retours",
    defense: "6 plongeons",
    precision: "15 passes",
    regularite: "1 enchaînement complet",
    competition: "1 rotation",
    global: "10 répétitions",
  };
  const multiplier = level === "avance" || level === "competition" ? 1.25 : 1;
  const value = base[objective] ?? "10 répétitions";
  const match = value.match(/^(\d+)(.*)$/);
  if (!match) return value;
  const num = Math.round(Number(match[1]) * multiplier);
  return `${num}${match[2]}`;
}

export async function fetchWorkoutWithExercises(workoutId: string) {
  const { data, error } = await supabase
    .from("workouts")
    .select("*, workout_exercises(*, exercise:exercises(*))")
    .eq("id", workoutId)
    .single();
  if (error) throw error;
  return data as Workout & { workout_exercises: WorkoutExercise[] };
}

export async function startWorkoutSession(workoutId: string): Promise<WorkoutSession> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Utilisateur non authentifié.");

  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      player_id: auth.user.id,
      workout_id: workoutId,
      status: "in_progress",
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as WorkoutSession;
}

export async function updateSessionProgress(sessionId: string, currentExerciseIndex: number) {
  const { error } = await supabase
    .from("workout_sessions")
    .update({ current_exercise_index: currentExerciseIndex })
    .eq("id", sessionId);
  if (error) throw error;
}

export interface CompleteSessionInput {
  durationMinutes: number;
  perceivedDifficulty: number;
  performanceRating: number;
  comment?: string;
}

export async function completeWorkoutSession(sessionId: string, input: CompleteSessionInput): Promise<WorkoutSession> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      duration_minutes: input.durationMinutes,
      perceived_difficulty: input.perceivedDifficulty,
      performance_rating: input.performanceRating,
      comment: input.comment ?? null,
    })
    .eq("id", sessionId)
    .select("*")
    .single();
  if (error) throw error;
  return data as WorkoutSession;
}

export async function fetchSessionHistory(limit = 30): Promise<WorkoutSession[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*, workout:workouts(*)")
    .eq("player_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as WorkoutSession[];
}

export async function fetchTodaySession(): Promise<WorkoutSession | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*, workout:workouts(*)")
    .eq("player_id", auth.user.id)
    .in("status", ["planned", "in_progress"])
    .gte("created_at", startOfDay.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as WorkoutSession | null;
}
