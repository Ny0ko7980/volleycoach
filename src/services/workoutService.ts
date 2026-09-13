import { supabase } from "@/lib/supabase";
import type {
  Exercise,
  Objective,
  PlayerLevel,
  Position,
  Workout,
  WorkoutExercise,
  WorkoutSession,
} from "@/types/database";
import { fetchExercises } from "@/services/exerciseService";

export interface GenerateWorkoutParams {
  objective: Objective;
  durationMinutes: number;
  level: PlayerLevel;
  position: Position;
  /** Matériel réellement disponible ; par défaut, aucune contrainte. */
  availableEquipment?: string[];
  /** Nombre de joueurs présents, pour écarter les exercices impraticables. */
  players?: number;
  /** Tags à éviter (zone à ménager, par exemple). */
  excludeTags?: string[];
}

type Phase = "echauffement" | "technique" | "situation" | "physique" | "retour_au_calme";

const PHASE_LABELS: Record<Phase, string> = {
  echauffement: "Échauffement",
  technique: "Technique",
  situation: "Situation de jeu",
  physique: "Travail physique",
  retour_au_calme: "Retour au calme",
};

interface SessionPlan {
  technique: number;
  situation: number;
  physique: number;
}

/**
 * Composition de la séance selon la durée demandée, de 20 à 120 minutes.
 * L'échauffement et le retour au calme sont systématiques.
 */
function sessionPlan(durationMinutes: number): SessionPlan {
  if (durationMinutes < 30) return { technique: 2, situation: 0, physique: 0 };
  if (durationMinutes < 45) return { technique: 3, situation: 0, physique: 0 };
  if (durationMinutes < 60) return { technique: 3, situation: 0, physique: 1 };
  if (durationMinutes < 90) return { technique: 4, situation: 1, physique: 1 };
  if (durationMinutes < 120) return { technique: 5, situation: 1, physique: 2 };
  return { technique: 6, situation: 2, physique: 2 };
}

const SHARED_SKILLS_LIMIT = 2;

/**
 * Empêche de retenir deux exercices quasi identiques : même famille de geste et
 * au moins deux compétences travaillées en commun.
 */
function tooSimilar(candidate: Exercise, selected: Exercise[]): boolean {
  const candidateSkills = new Set(candidate.skills ?? []);
  if (candidateSkills.size === 0) return false;

  return selected.some((exercise) => {
    if (!exercise.category || exercise.category !== candidate.category) return false;
    const shared = (exercise.skills ?? []).filter((skill) => candidateSkills.has(skill));
    return shared.length >= SHARED_SKILLS_LIMIT;
  });
}

function shuffled(exercises: Exercise[]): Exercise[] {
  return [...exercises].sort(() => Math.random() - 0.5);
}

/**
 * Retient au plus `count` exercices en respectant le temps disponible et en
 * écartant les doublons. Si la contrainte de similarité bloque tout, elle est
 * relâchée plutôt que de renvoyer un bloc vide.
 */
function selectExercises(
  pool: Exercise[],
  count: number,
  budgetMinutes: number,
  alreadySelected: Exercise[]
): Exercise[] {
  if (count <= 0 || pool.length === 0) return [];

  const chosen: Exercise[] = [];
  let usedMinutes = 0;

  for (const exercise of shuffled(pool)) {
    if (chosen.length >= count) break;
    if (usedMinutes + exercise.duration_minutes > budgetMinutes && chosen.length > 0) continue;
    if (tooSimilar(exercise, [...alreadySelected, ...chosen])) continue;
    chosen.push(exercise);
    usedMinutes += exercise.duration_minutes;
  }

  if (chosen.length === 0) {
    const fallback = shuffled(pool)[0];
    if (fallback) chosen.push(fallback);
  }
  return chosen;
}

const LEVEL_VOLUME: Record<PlayerLevel, { sets: number; rest: number }> = {
  debutant: { sets: 3, rest: 40 },
  intermediaire: { sets: 4, rest: 30 },
  avance: { sets: 5, rest: 25 },
  competition: { sets: 5, rest: 20 },
};

/**
 * Générateur de séance : compose une séance structurée (échauffement, technique,
 * situation de jeu, travail physique, retour au calme) adaptée au poste, au
 * niveau, à la durée et au matériel disponible, sans retenir deux exercices
 * quasi identiques.
 */
export async function generateWorkout(
  params: GenerateWorkoutParams
): Promise<Workout & { exercises: WorkoutExercise[] }> {
  const { objective, durationMinutes, level, position, availableEquipment, players, excludeTags } = params;

  const context = { level, availableEquipment, players, excludeTags };
  const [warmupPool, techniquePool, situationPool, physiquePool, cooldownPool] = await Promise.all([
    fetchExercises({ category: "echauffement", availableEquipment, players }),
    fetchExercises({ ...context, objective, position }),
    fetchExercises({ ...context, objective: "competition" }),
    fetchExercises({ ...context, categories: ["detente", "renforcement", "deplacements"] }),
    fetchExercises({ category: "mobilite" }),
  ]);

  // Si le poste restreint trop le choix, on élargit avant d'abandonner.
  const technique = techniquePool.length > 0 ? techniquePool : await fetchExercises({ objective });
  if (technique.length === 0) {
    throw new Error("Aucun exercice disponible pour cet objectif. Réessaie avec un autre objectif.");
  }

  const plan = sessionPlan(durationMinutes);
  const warmup = selectExercises(warmupPool, 1, durationMinutes, []);
  const cooldown = selectExercises(cooldownPool, 1, durationMinutes, []);
  const warmupMinutes = warmup.reduce((total, exercise) => total + exercise.duration_minutes, 0);
  const cooldownMinutes = cooldown.reduce((total, exercise) => total + exercise.duration_minutes, 0);

  const coreBudget = Math.max(durationMinutes - warmupMinutes - cooldownMinutes, 10);
  const physiqueBudget = plan.physique > 0 ? Math.round(coreBudget * 0.25) : 0;
  const situationBudget = plan.situation > 0 ? Math.round(coreBudget * 0.25) : 0;
  const techniqueBudget = coreBudget - physiqueBudget - situationBudget;

  const techniqueBlock = selectExercises(technique, plan.technique, techniqueBudget, []);
  const situationBlock = selectExercises(situationPool, plan.situation, situationBudget, techniqueBlock);
  const physiqueBlock = selectExercises(physiquePool, plan.physique, physiqueBudget, [
    ...techniqueBlock,
    ...situationBlock,
  ]);

  const blocks: { phase: Phase; exercises: Exercise[] }[] = [
    { phase: "echauffement", exercises: warmup },
    { phase: "technique", exercises: techniqueBlock },
    { phase: "situation", exercises: situationBlock },
    { phase: "physique", exercises: physiqueBlock },
    { phase: "retour_au_calme", exercises: cooldown },
  ];
  const ordered = blocks.flatMap(({ phase, exercises }) =>
    exercises.map((exercise) => ({ phase, exercise }))
  );

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Utilisateur non authentifié.");

  const difficulties = ordered.map(({ exercise }) => exercise.difficulty);
  const averageDifficulty = difficulties.reduce((sum, value) => sum + value, 0) / difficulties.length;

  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      player_id: auth.user.id,
      title: `Séance ${objective} — ${durationMinutes} min`,
      objective,
      duration_minutes: durationMinutes,
      difficulty: Math.min(5, Math.max(1, Math.round(averageDifficulty))),
      warmup: describeBlock(warmup, "Échauffement articulaire + mobilité dynamique — 5 min"),
      cooldown: describeBlock(cooldown, "Étirements légers + respiration — 5 min"),
      generated: true,
    })
    .select("*")
    .single();
  if (workoutError) throw workoutError;

  const volume = LEVEL_VOLUME[level];
  const rows = ordered.map(({ phase, exercise }, index) => ({
    workout_id: workout.id,
    exercise_id: exercise.id,
    order_index: index,
    sets: phase === "echauffement" || phase === "retour_au_calme" ? 1 : volume.sets,
    reps: phase === "echauffement" || phase === "retour_au_calme" ? "1 passage" : exerciseReps(exercise.objective, level),
    rest_seconds: phase === "echauffement" || phase === "retour_au_calme" ? 0 : volume.rest,
    notes: PHASE_LABELS[phase],
  }));

  const { data: workoutExercises, error: weError } = await supabase
    .from("workout_exercises")
    .insert(rows)
    .select("*, exercise:exercises(*)");
  if (weError) throw weError;

  return { ...(workout as Workout), exercises: (workoutExercises ?? []) as WorkoutExercise[] };
}

function describeBlock(exercises: Exercise[], fallback: string): string {
  if (exercises.length === 0) return fallback;
  return exercises
    .map((exercise) => `${exercise.name} — ${exercise.duration_minutes} min`)
    .join(" · ");
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
  const [, amount, unit] = match;
  if (!amount) return value;
  return `${Math.round(Number(amount) * multiplier)}${unit ?? ""}`;
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
