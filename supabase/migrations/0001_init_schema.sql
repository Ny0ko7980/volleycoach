-- Coach Volley — schéma initial
-- Convention: chaque table métier référence auth.users via player_profiles.id
-- (player_profiles.id = auth.users.id), ce qui évite une table "users" dupliquée
-- et laisse Supabase Auth gérer l'identité/les mots de passe/les sessions.

create extension if not exists "pgcrypto";

-- ============================================================================
-- CLUBS / TEAMS (architecture prête pour la gestion équipe/club, v1 simplifiée)
-- ============================================================================

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete set null,
  name text not null,
  coach_id uuid, -- references player_profiles(id), FK ajoutée plus bas
  created_at timestamptz not null default now()
);

-- ============================================================================
-- PLAYER PROFILES (1-1 avec auth.users)
-- ============================================================================

create table if not exists public.player_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  age int check (age between 5 and 100),
  height_cm numeric(5,1),
  position text not null default 'outside_hitter'
    check (position in ('setter','outside_hitter','opposite','middle_blocker','libero')),
  level text not null default 'debutant'
    check (level in ('debutant','intermediaire','avance','competition')),
  club text,
  team_id uuid references public.teams(id) on delete set null,
  training_frequency text
    check (training_frequency in ('1x_semaine','2x_semaine','3x_semaine','4x_semaine','5x_plus_semaine')),
  experience_years numeric(4,1) default 0,
  goals text[] not null default '{}',
  role text not null default 'player' check (role in ('player','coach','admin')),
  is_premium boolean not null default false,
  xp int not null default 0,
  current_level int not null default 1,
  streak_count int not null default 0,
  longest_streak int not null default 0,
  last_training_date date,
  onboarding_completed boolean not null default false,
  notifications_enabled boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teams
  add constraint teams_coach_fk foreign key (coach_id) references public.player_profiles(id) on delete set null;

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  role text not null default 'player' check (role in ('player','coach')),
  joined_at timestamptz not null default now(),
  primary key (team_id, player_id)
);

-- ============================================================================
-- EXERCISES (bibliothèque, gérable par un admin)
-- ============================================================================

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  positions text[] not null default '{}', -- vide = tous les postes
  level text not null default 'debutant'
    check (level in ('debutant','intermediaire','avance','competition')),
  objective text not null
    check (objective in (
      'reception','service','attaque','bloc','detente','vitesse',
      'defense','precision','regularite','competition','global'
    )),
  duration_minutes int not null default 10,
  equipment text[] not null default '{}',
  difficulty int not null default 2 check (difficulty between 1 and 5),
  instructions text not null,
  common_mistakes text,
  tips text,
  media_url text,
  created_by uuid references public.player_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- WORKOUTS (séances, générées ou modèles) + WORKOUT_EXERCISES (contenu)
-- ============================================================================

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.player_profiles(id) on delete cascade,
  title text not null,
  objective text not null,
  duration_minutes int not null,
  difficulty int not null default 2 check (difficulty between 1 and 5),
  warmup text not null default 'Échauffement articulaire + mobilité — 5 min',
  cooldown text not null default 'Étirements légers + respiration — 5 min',
  is_template boolean not null default false,
  generated boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  order_index int not null default 0,
  sets int not null default 3,
  reps text not null default '10',
  rest_seconds int not null default 30,
  notes text
);

-- ============================================================================
-- WORKOUT_SESSIONS (journal d'entraînement — instance réelle d'une séance)
-- ============================================================================

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  status text not null default 'planned'
    check (status in ('planned','in_progress','completed','skipped')),
  current_exercise_index int not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  duration_minutes int,
  perceived_difficulty int check (perceived_difficulty between 1 and 5),
  performance_rating int check (performance_rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- STATISTICS
-- ============================================================================

create table if not exists public.statistics (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  category text not null check (category in ('service','reception','attaque','bloc','defense','physique')),
  metric text not null,
  value numeric not null,
  unit text,
  session_id uuid references public.workout_sessions(id) on delete set null,
  notes text,
  recorded_at timestamptz not null default now()
);

-- ============================================================================
-- GOALS
-- ============================================================================

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  name text not null,
  category text not null default 'global',
  current_value numeric not null default 0,
  target_value numeric not null,
  unit text,
  status text not null default 'active' check (status in ('active','achieved','abandoned')),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- GAMIFICATION: ACHIEVEMENTS (catalogue) + PLAYER_ACHIEVEMENTS (débloqués)
-- ============================================================================

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  icon text not null default '🏅',
  criteria jsonb not null -- ex: {"type":"streak","value":7} ou {"type":"session_count","value":1}
);

create table if not exists public.player_achievements (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (player_id, achievement_id)
);

-- ============================================================================
-- COACH IA: CONVERSATIONS + MESSAGES
-- ============================================================================

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  title text not null default 'Nouvelle conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index if not exists idx_statistics_player_category on public.statistics(player_id, category, recorded_at desc);
create index if not exists idx_workout_sessions_player on public.workout_sessions(player_id, created_at desc);
create index if not exists idx_workout_exercises_workout on public.workout_exercises(workout_id, order_index);
create index if not exists idx_goals_player on public.goals(player_id, status);
create index if not exists idx_exercises_objective on public.exercises(objective, level);
create index if not exists idx_ai_messages_conversation on public.ai_messages(conversation_id, created_at);
create index if not exists idx_player_achievements_player on public.player_achievements(player_id);

-- ============================================================================
-- updated_at triggers
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_player_profiles_updated_at before update on public.player_profiles
  for each row execute function public.set_updated_at();
create trigger trg_exercises_updated_at before update on public.exercises
  for each row execute function public.set_updated_at();
create trigger trg_goals_updated_at before update on public.goals
  for each row execute function public.set_updated_at();
create trigger trg_ai_conversations_updated_at before update on public.ai_conversations
  for each row execute function public.set_updated_at();

-- Auto-création d'un player_profile minimal à l'inscription (auth.users insert)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.player_profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
