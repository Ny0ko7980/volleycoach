-- Coach Volley — entraînements personnalisés
--
-- Ajoute ce qui manque au moteur de séance pour s'adapter au joueur :
--   1. les préférences d'entraînement (matériel, durée, zones à ménager) ;
--   2. le ressenti du joueur, exercice par exercice puis sur la séance ;
--   3. un score de progression par compétence ;
--   4. une table de signaux, point d'entrée unique de tout ce qui peut
--      désigner une compétence comme faible ou forte — aujourd'hui le
--      feedback, demain l'analyse vidéo.
--
-- Aucune table existante n'est remplacée : `workout_sessions` portait déjà
-- `perceived_difficulty` / `performance_rating` / `comment`, qui restent la
-- difficulté et la performance ressenties. On ne leur ajoute que la fatigue
-- et la satisfaction, absentes du schéma.
--
-- L'axe de compétence est celui de `exercises.category` (migration 0008) :
-- les mêmes 12 valeurs, pour qu'un score se traduise directement en
-- exercices sélectionnables sans table de correspondance.

-- ---------------------------------------------------------------------------
-- 1. Préférences d'entraînement du joueur
-- ---------------------------------------------------------------------------

alter table public.player_profiles
  add column if not exists preferred_duration_minutes int,
  add column if not exists available_equipment text[] not null default '{}',
  add column if not exists avoid_tags text[] not null default '{}';

comment on column public.player_profiles.available_equipment is
  'Matériel dont le joueur dispose. Vide = aucune contrainte connue, le moteur ne filtre pas.';
comment on column public.player_profiles.avoid_tags is
  'Tags d''exercices à écarter (zone à ménager, contre-indication). Alimente excludeTags.';

alter table public.player_profiles drop constraint if exists player_profiles_preferred_duration_check;
alter table public.player_profiles add constraint player_profiles_preferred_duration_check
  check (preferred_duration_minutes is null or preferred_duration_minutes between 10 and 180);

-- ---------------------------------------------------------------------------
-- 2. Ressenti de fin de séance
-- ---------------------------------------------------------------------------

alter table public.workout_sessions
  add column if not exists fatigue_level int,
  add column if not exists satisfaction int;

alter table public.workout_sessions drop constraint if exists workout_sessions_fatigue_check;
alter table public.workout_sessions add constraint workout_sessions_fatigue_check
  check (fatigue_level is null or fatigue_level between 1 and 5);

alter table public.workout_sessions drop constraint if exists workout_sessions_satisfaction_check;
alter table public.workout_sessions add constraint workout_sessions_satisfaction_check
  check (satisfaction is null or satisfaction between 1 and 5);

-- ---------------------------------------------------------------------------
-- 3. Ressenti exercice par exercice
-- ---------------------------------------------------------------------------

create table if not exists public.exercise_feedback (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  -- on delete restrict, comme workout_exercises : un exercice cité par un
  -- historique ne doit jamais disparaître sous les pieds du joueur.
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  skill text not null,
  rating text not null,
  created_at timestamptz not null default now(),
  -- Un seul ressenti par exercice et par séance : le joueur peut revenir sur
  -- son choix, l'upsert écrase alors la valeur précédente.
  unique (session_id, exercise_id)
);

alter table public.exercise_feedback drop constraint if exists exercise_feedback_rating_check;
alter table public.exercise_feedback add constraint exercise_feedback_rating_check
  check (rating in ('trop_facile', 'adapte', 'difficile', 'impossible'));

alter table public.exercise_feedback drop constraint if exists exercise_feedback_skill_check;
alter table public.exercise_feedback add constraint exercise_feedback_skill_check
  check (skill in (
    'reception','defense','passe','attaque','service','bloc',
    'deplacements','detente','renforcement','mobilite','lecture_jeu','echauffement'
  ));

create index if not exists idx_exercise_feedback_player
  on public.exercise_feedback(player_id, created_at desc);
create index if not exists idx_exercise_feedback_skill
  on public.exercise_feedback(player_id, skill, created_at desc);

-- ---------------------------------------------------------------------------
-- 4. Score de progression par compétence
-- ---------------------------------------------------------------------------
--
-- Score interne et non scientifique : il résume les séances, les ressentis et
-- les statistiques du joueur. `sample_size` permet à l'interface de dire
-- honnêtement « pas assez de séances » au lieu d'afficher un chiffre inventé.

create table if not exists public.player_skill_scores (
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  skill text not null,
  score int not null,
  sample_size int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (player_id, skill)
);

alter table public.player_skill_scores drop constraint if exists player_skill_scores_score_check;
alter table public.player_skill_scores add constraint player_skill_scores_score_check
  check (score between 0 and 100);

alter table public.player_skill_scores drop constraint if exists player_skill_scores_skill_check;
alter table public.player_skill_scores add constraint player_skill_scores_skill_check
  check (skill in (
    'reception','defense','passe','attaque','service','bloc',
    'deplacements','detente','renforcement','mobilite','lecture_jeu','echauffement'
  ));

-- ---------------------------------------------------------------------------
-- 5. Signaux de compétence — point d'entrée de la future analyse vidéo
-- ---------------------------------------------------------------------------
--
-- Tout ce qui peut désigner une compétence comme faible ou forte écrit ici,
-- avec sa source. Le moteur de recommandation ne lit que cette table : ajouter
-- l'analyse vidéo plus tard consistera à insérer des lignes `source='video'`,
-- sans toucher au moteur.

create table if not exists public.skill_signals (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  skill text not null,
  source text not null,
  direction text not null,
  -- Poids relatif du signal (1 = signal ordinaire). Permet de faire peser
  -- davantage une observation vidéo qu'un ressenti isolé.
  weight numeric not null default 1,
  note text,
  session_id uuid references public.workout_sessions(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.skill_signals drop constraint if exists skill_signals_source_check;
alter table public.skill_signals add constraint skill_signals_source_check
  check (source in ('feedback', 'session', 'statistic', 'video', 'coach', 'manual'));

alter table public.skill_signals drop constraint if exists skill_signals_direction_check;
alter table public.skill_signals add constraint skill_signals_direction_check
  check (direction in ('weakness', 'strength'));

alter table public.skill_signals drop constraint if exists skill_signals_skill_check;
alter table public.skill_signals add constraint skill_signals_skill_check
  check (skill in (
    'reception','defense','passe','attaque','service','bloc',
    'deplacements','detente','renforcement','mobilite','lecture_jeu','echauffement'
  ));

alter table public.skill_signals drop constraint if exists skill_signals_weight_check;
alter table public.skill_signals add constraint skill_signals_weight_check
  check (weight > 0 and weight <= 5);

create index if not exists idx_skill_signals_player
  on public.skill_signals(player_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 6. RLS — même motif que les autres tables du joueur (0002)
-- ---------------------------------------------------------------------------

alter table public.exercise_feedback enable row level security;
alter table public.player_skill_scores enable row level security;
alter table public.skill_signals enable row level security;

drop policy if exists "exercise_feedback_owner" on public.exercise_feedback;
create policy "exercise_feedback_owner" on public.exercise_feedback
  for all to authenticated
  using (player_id = auth.uid() or public.is_team_coach_of(player_id) or public.is_admin())
  with check (player_id = auth.uid());

drop policy if exists "player_skill_scores_owner" on public.player_skill_scores;
create policy "player_skill_scores_owner" on public.player_skill_scores
  for all to authenticated
  using (player_id = auth.uid() or public.is_team_coach_of(player_id) or public.is_admin())
  with check (player_id = auth.uid());

drop policy if exists "skill_signals_owner" on public.skill_signals;
create policy "skill_signals_owner" on public.skill_signals
  for all to authenticated
  using (player_id = auth.uid() or public.is_team_coach_of(player_id) or public.is_admin())
  with check (player_id = auth.uid());
