// Types TypeScript miroir du schéma SQL (supabase/migrations/0001_init_schema.sql).
// Maintenus à la main pour rester indépendants de la CLI Supabase ; peuvent être
// remplacés par `supabase gen types typescript` une fois le projet lié.

export type Position = "setter" | "outside_hitter" | "opposite" | "middle_blocker" | "libero";
export type PlayerLevel = "debutant" | "intermediaire" | "avance" | "competition";
export type TrainingFrequency = "1x_semaine" | "2x_semaine" | "3x_semaine" | "4x_semaine" | "5x_plus_semaine";
export type PlayerRole = "player" | "coach" | "admin";
export type Objective =
  | "reception"
  | "service"
  | "attaque"
  | "bloc"
  | "detente"
  | "vitesse"
  | "defense"
  | "precision"
  | "regularite"
  | "competition"
  | "global";
export type StatCategory = "service" | "reception" | "attaque" | "bloc" | "defense" | "physique";
export type GoalStatus = "active" | "achieved" | "abandoned";
export type SessionStatus = "planned" | "in_progress" | "completed" | "skipped";
export type MessageRole = "user" | "assistant";

export interface PlayerProfile {
  id: string;
  username: string;
  age: number | null;
  height_cm: number | null;
  position: Position;
  level: PlayerLevel;
  club: string | null;
  team_id: string | null;
  training_frequency: TrainingFrequency | null;
  experience_years: number;
  goals: Objective[];
  role: PlayerRole;
  is_premium: boolean;
  xp: number;
  current_level: number;
  streak_count: number;
  longest_streak: number;
  last_training_date: string | null;
  onboarding_completed: boolean;
  notifications_enabled: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  positions: Position[];
  level: PlayerLevel;
  objective: Objective;
  duration_minutes: number;
  equipment: string[];
  difficulty: number;
  instructions: string;
  common_mistakes: string | null;
  tips: string | null;
  media_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workout {
  id: string;
  player_id: string | null;
  title: string;
  objective: string;
  duration_minutes: number;
  difficulty: number;
  warmup: string;
  cooldown: string;
  is_template: boolean;
  generated: boolean;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes: string | null;
  exercise?: Exercise;
}

export interface WorkoutSession {
  id: string;
  player_id: string;
  workout_id: string | null;
  status: SessionStatus;
  current_exercise_index: number;
  started_at: string | null;
  completed_at: string | null;
  duration_minutes: number | null;
  perceived_difficulty: number | null;
  performance_rating: number | null;
  comment: string | null;
  created_at: string;
  workout?: Workout & { workout_exercises?: WorkoutExercise[] };
}

export interface Statistic {
  id: string;
  player_id: string;
  category: StatCategory;
  metric: string;
  value: number;
  unit: string | null;
  session_id: string | null;
  notes: string | null;
  recorded_at: string;
}

export interface Goal {
  id: string;
  player_id: string;
  name: string;
  category: string;
  current_value: number;
  target_value: number;
  unit: string | null;
  status: GoalStatus;
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  criteria: { type: string; value?: number; objective?: string };
}

export interface PlayerAchievement {
  id: string;
  player_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

export interface AiConversation {
  id: string;
  player_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface Club {
  id: string;
  name: string;
  city: string | null;
  created_at: string;
}

export interface Team {
  id: string;
  club_id: string | null;
  name: string;
  coach_id: string | null;
  created_at: string;
}

// Placeholder minimal pour le typage générique du client Supabase.
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Database {
  public: {
    Tables: Record<string, { Row: Record<string, unknown> }>;
  };
}
