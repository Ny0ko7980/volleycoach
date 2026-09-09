-- Coach Volley — Row Level Security
-- Principe: un joueur ne peut lire/écrire que ses propres données.
-- Les contenus "catalogue" (exercises, achievements, clubs, teams) sont
-- lisibles par tout utilisateur authentifié, mais seuls role='admin' peut
-- écrire dans exercises/achievements. Un coach d'équipe peut lire les
-- données de ses joueurs (team_members) pour les écrans "Équipe".

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.player_profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.is_team_coach_of(target_player uuid)
returns boolean as $$
  select exists (
    select 1
    from public.team_members my_membership
    join public.team_members their_membership
      on my_membership.team_id = their_membership.team_id
    where my_membership.player_id = auth.uid()
      and my_membership.role = 'coach'
      and their_membership.player_id = target_player
  );
$$ language sql stable security definer set search_path = public;

alter table public.clubs enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.player_profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.statistics enable row level security;
alter table public.goals enable row level security;
alter table public.achievements enable row level security;
alter table public.player_achievements enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

-- CLUBS / TEAMS: lecture publique authentifiée, écriture admin uniquement
create policy "clubs_select_authenticated" on public.clubs
  for select to authenticated using (true);
create policy "clubs_write_admin" on public.clubs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "teams_select_authenticated" on public.teams
  for select to authenticated using (true);
create policy "teams_write_admin_or_coach" on public.teams
  for all to authenticated
  using (public.is_admin() or coach_id = auth.uid())
  with check (public.is_admin() or coach_id = auth.uid());

create policy "team_members_select_self_or_coach" on public.team_members
  for select to authenticated
  using (player_id = auth.uid() or public.is_team_coach_of(player_id) or public.is_admin());
create policy "team_members_write_admin_or_coach" on public.team_members
  for all to authenticated
  using (public.is_admin() or public.is_team_coach_of(player_id))
  with check (public.is_admin() or public.is_team_coach_of(player_id));

-- PLAYER_PROFILES: chacun voit/modifie son propre profil ; un coach d'équipe
-- peut lire (pas écrire) le profil de ses joueurs ; un admin voit tout.
create policy "player_profiles_select_own" on public.player_profiles
  for select to authenticated
  using (id = auth.uid() or public.is_team_coach_of(id) or public.is_admin());
create policy "player_profiles_insert_own" on public.player_profiles
  for insert to authenticated with check (id = auth.uid());
create policy "player_profiles_update_own" on public.player_profiles
  for update to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- EXERCISES: catalogue public en lecture, écriture réservée aux admins
create policy "exercises_select_authenticated" on public.exercises
  for select to authenticated using (true);
create policy "exercises_write_admin" on public.exercises
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- WORKOUTS: propriétaire uniquement (les templates globaux, player_id null,
-- sont lisibles par tous mais non modifiables par les joueurs)
create policy "workouts_select_own_or_template" on public.workouts
  for select to authenticated
  using (player_id = auth.uid() or is_template = true or public.is_admin());
create policy "workouts_insert_own" on public.workouts
  for insert to authenticated with check (player_id = auth.uid());
create policy "workouts_update_own" on public.workouts
  for update to authenticated using (player_id = auth.uid() or public.is_admin())
  with check (player_id = auth.uid() or public.is_admin());
create policy "workouts_delete_own" on public.workouts
  for delete to authenticated using (player_id = auth.uid() or public.is_admin());

-- WORKOUT_EXERCISES: héritent de la visibilité de la séance parente
create policy "workout_exercises_select" on public.workout_exercises
  for select to authenticated
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_id
      and (w.player_id = auth.uid() or w.is_template = true or public.is_admin())
  ));
create policy "workout_exercises_write" on public.workout_exercises
  for all to authenticated
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_id and (w.player_id = auth.uid() or public.is_admin())
  ))
  with check (exists (
    select 1 from public.workouts w
    where w.id = workout_id and (w.player_id = auth.uid() or public.is_admin())
  ));

-- WORKOUT_SESSIONS / STATISTICS / GOALS / AI_* : strictement propriétaire
create policy "workout_sessions_owner" on public.workout_sessions
  for all to authenticated
  using (player_id = auth.uid() or public.is_team_coach_of(player_id) or public.is_admin())
  with check (player_id = auth.uid());

create policy "statistics_owner" on public.statistics
  for all to authenticated
  using (player_id = auth.uid() or public.is_team_coach_of(player_id) or public.is_admin())
  with check (player_id = auth.uid());

create policy "goals_owner" on public.goals
  for all to authenticated
  using (player_id = auth.uid() or public.is_team_coach_of(player_id) or public.is_admin())
  with check (player_id = auth.uid());

-- ACHIEVEMENTS: catalogue public en lecture, écriture admin
create policy "achievements_select_authenticated" on public.achievements
  for select to authenticated using (true);
create policy "achievements_write_admin" on public.achievements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "player_achievements_owner_select" on public.player_achievements
  for select to authenticated
  using (player_id = auth.uid() or public.is_team_coach_of(player_id) or public.is_admin());
create policy "player_achievements_owner_insert" on public.player_achievements
  for insert to authenticated with check (player_id = auth.uid());

-- AI_CONVERSATIONS / AI_MESSAGES: strictement propriétaire
create policy "ai_conversations_owner" on public.ai_conversations
  for all to authenticated
  using (player_id = auth.uid()) with check (player_id = auth.uid());

create policy "ai_messages_owner" on public.ai_messages
  for all to authenticated
  using (exists (
    select 1 from public.ai_conversations c
    where c.id = conversation_id and c.player_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.ai_conversations c
    where c.id = conversation_id and c.player_id = auth.uid()
  ));
