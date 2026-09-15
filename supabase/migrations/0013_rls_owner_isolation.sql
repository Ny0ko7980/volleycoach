-- Coach Volley — isolation stricte des données par joueur (correctif B1)
--
-- CE QUI ÉTAIT EXPLOITABLE
-- =======================
-- Un joueur pouvait lire ET détruire les données d'un autre, en trois maillons :
--
--   1. `teams_select_authenticated` était `using (true)` : tout utilisateur
--      connecté listait toutes les équipes, avec leur `invite_code` — le code
--      censé rester le secret partagé par le coach.
--
--   2. `team_members_write_admin_or_coach` validait l'écriture avec
--      `is_team_coach_of(player_id)`. `player_id` étant l'attaquant lui-même,
--      il suffisait d'être coach de SA PROPRE équipe (un bouton dans l'app)
--      pour s'insérer comme coach de n'importe quelle autre équipe, sans code.
--
--   3. Les policies des tables joueur étaient `for all` avec la clause coach
--      dans le `using`. Or `using` gouverne aussi UPDATE et DELETE, pas
--      seulement SELECT : le faux coach pouvait effacer séances, statistiques,
--      objectifs, scores et signaux de ses « joueurs ».
--
-- PRINCIPE DU CORRECTIF
-- =====================
-- Toute ÉCRITURE sur une donnée de joueur est strictement réservée à son
-- propriétaire. La lecture par un coach reste possible là où l'application en
-- a réellement besoin (le roster : profil, poste, niveau, série), et nulle
-- part ailleurs.
--
-- Le prédicat `is_team_coach_of()` n'est pas fautif en soi : il le devenait
-- parce qu'on pouvait se déclarer coach de n'importe quelle équipe. On ferme
-- cette porte plutôt que de retirer la fonctionnalité — l'adhésion et la
-- création d'équipe passent déjà par des fonctions `security definer`
-- (`join_team_by_code`, `create_team_as_coach`), qui continuent de fonctionner
-- sans policy d'insertion directe.
--
-- RLS n'est désactivée nulle part : elle est au contraire réaffirmée, et les
-- policies trop larges sont remplacées par des policies par commande.

-- ---------------------------------------------------------------------------
-- 0. Réaffirmation de RLS (idempotent — protège d'une désactivation manuelle)
-- ---------------------------------------------------------------------------

alter table public.teams               enable row level security;
alter table public.team_members        enable row level security;
alter table public.player_profiles     enable row level security;
alter table public.workout_sessions    enable row level security;
alter table public.statistics          enable row level security;
alter table public.goals               enable row level security;
alter table public.player_achievements enable row level security;
alter table public.exercise_feedback   enable row level security;
alter table public.player_skill_scores enable row level security;
alter table public.skill_signals       enable row level security;

-- ---------------------------------------------------------------------------
-- 1. Prédicats ancrés sur une équipe précise
-- ---------------------------------------------------------------------------
-- `is_team_coach_of(joueur)` est transitif : « existe-t-il une équipe où je
-- suis coach et où ce joueur est membre ». C'est ce qu'il faut pour lire un
-- profil. Pour décider qui peut écrire dans `team_members`, il faut au
-- contraire un prédicat ancré sur L'ÉQUIPE visée, sinon l'attaquant se
-- qualifie lui-même via sa propre équipe.

create or replace function public.is_coach_of_team(p_team_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id
      and player_id = auth.uid()
      and role = 'coach'
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.is_member_of_team(p_team_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id
      and player_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

grant execute on function public.is_coach_of_team(uuid)  to authenticated;
grant execute on function public.is_member_of_team(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. teams — ne plus exposer toutes les équipes ni leurs codes d'invitation
-- ---------------------------------------------------------------------------
-- On ne voit que les équipes dont on est membre, ou celles qu'on entraîne.
-- Rejoindre reste possible : `join_team_by_code` est `security definer` et
-- retrouve l'équipe par son code sans passer par cette policy.

drop policy if exists "teams_select_authenticated" on public.teams;

drop policy if exists "teams_select_member_or_coach" on public.teams;
create policy "teams_select_member_or_coach" on public.teams
  for select to authenticated
  using (
    coach_id = auth.uid()
    or public.is_member_of_team(id)
    or public.is_admin()
  );

-- `teams_write_admin_or_coach` (0002) reste : elle est déjà restreinte à
-- `coach_id = auth.uid()`, on ne peut donc pas modifier l'équipe d'un autre.

-- ---------------------------------------------------------------------------
-- 3. team_members — fermer l'auto-promotion en coach
-- ---------------------------------------------------------------------------
-- Plus aucune policy d'INSERT pour un joueur : l'adhésion passe uniquement par
-- `join_team_by_code` (qui force `role = 'player'`) et `create_team_as_coach`,
-- toutes deux `security definer`. Aucune policy d'UPDATE non plus : changer le
-- rôle d'un membre n'est pas une fonctionnalité de l'application.

drop policy if exists "team_members_write_admin_or_coach" on public.team_members;
drop policy if exists "team_members_select_self_or_coach" on public.team_members;
drop policy if exists "team_members_leave_self"           on public.team_members;

drop policy if exists "team_members_select_self_or_team_coach" on public.team_members;
create policy "team_members_select_self_or_team_coach" on public.team_members
  for select to authenticated
  using (
    player_id = auth.uid()
    or public.is_coach_of_team(team_id)
    or public.is_admin()
  );

-- Quitter son équipe, ou en retirer un joueur quand on en est le coach.
drop policy if exists "team_members_delete_self_or_team_coach" on public.team_members;
create policy "team_members_delete_self_or_team_coach" on public.team_members
  for delete to authenticated
  using (
    player_id = auth.uid()
    or public.is_coach_of_team(team_id)
    or public.is_admin()
  );

drop policy if exists "team_members_insert_admin" on public.team_members;
create policy "team_members_insert_admin" on public.team_members
  for insert to authenticated
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Tables de données du joueur — écriture réservée au propriétaire
-- ---------------------------------------------------------------------------
-- Les anciennes policies étaient `for all` avec la clause coach dans le
-- `using`, ce qui autorisait un coach à modifier et supprimer. On les remplace
-- par quatre policies par commande : le coach n'apparaît dans aucune.
--
-- L'administrateur conserve la LECTURE (les compteurs de l'écran
-- Administration lisent `workout_sessions` et `goals`), mais plus l'écriture
-- sur les données d'un joueur.

drop policy if exists "workout_sessions_owner"    on public.workout_sessions;
drop policy if exists "statistics_owner"          on public.statistics;
drop policy if exists "goals_owner"               on public.goals;
drop policy if exists "exercise_feedback_owner"   on public.exercise_feedback;
drop policy if exists "player_skill_scores_owner" on public.player_skill_scores;
drop policy if exists "skill_signals_owner"       on public.skill_signals;

-- workout_sessions
drop policy if exists "workout_sessions_select_own" on public.workout_sessions;
create policy "workout_sessions_select_own" on public.workout_sessions
  for select to authenticated using (player_id = auth.uid() or public.is_admin());
drop policy if exists "workout_sessions_insert_own" on public.workout_sessions;
create policy "workout_sessions_insert_own" on public.workout_sessions
  for insert to authenticated with check (player_id = auth.uid());
drop policy if exists "workout_sessions_update_own" on public.workout_sessions;
create policy "workout_sessions_update_own" on public.workout_sessions
  for update to authenticated using (player_id = auth.uid()) with check (player_id = auth.uid());
drop policy if exists "workout_sessions_delete_own" on public.workout_sessions;
create policy "workout_sessions_delete_own" on public.workout_sessions
  for delete to authenticated using (player_id = auth.uid());

-- statistics
drop policy if exists "statistics_select_own" on public.statistics;
create policy "statistics_select_own" on public.statistics
  for select to authenticated using (player_id = auth.uid() or public.is_admin());
drop policy if exists "statistics_insert_own" on public.statistics;
create policy "statistics_insert_own" on public.statistics
  for insert to authenticated with check (player_id = auth.uid());
drop policy if exists "statistics_update_own" on public.statistics;
create policy "statistics_update_own" on public.statistics
  for update to authenticated using (player_id = auth.uid()) with check (player_id = auth.uid());
drop policy if exists "statistics_delete_own" on public.statistics;
create policy "statistics_delete_own" on public.statistics
  for delete to authenticated using (player_id = auth.uid());

-- goals
drop policy if exists "goals_select_own" on public.goals;
create policy "goals_select_own" on public.goals
  for select to authenticated using (player_id = auth.uid() or public.is_admin());
drop policy if exists "goals_insert_own" on public.goals;
create policy "goals_insert_own" on public.goals
  for insert to authenticated with check (player_id = auth.uid());
drop policy if exists "goals_update_own" on public.goals;
create policy "goals_update_own" on public.goals
  for update to authenticated using (player_id = auth.uid()) with check (player_id = auth.uid());
drop policy if exists "goals_delete_own" on public.goals;
create policy "goals_delete_own" on public.goals
  for delete to authenticated using (player_id = auth.uid());

-- exercise_feedback
drop policy if exists "exercise_feedback_select_own" on public.exercise_feedback;
create policy "exercise_feedback_select_own" on public.exercise_feedback
  for select to authenticated using (player_id = auth.uid() or public.is_admin());
drop policy if exists "exercise_feedback_insert_own" on public.exercise_feedback;
create policy "exercise_feedback_insert_own" on public.exercise_feedback
  for insert to authenticated with check (player_id = auth.uid());
drop policy if exists "exercise_feedback_update_own" on public.exercise_feedback;
create policy "exercise_feedback_update_own" on public.exercise_feedback
  for update to authenticated using (player_id = auth.uid()) with check (player_id = auth.uid());
drop policy if exists "exercise_feedback_delete_own" on public.exercise_feedback;
create policy "exercise_feedback_delete_own" on public.exercise_feedback
  for delete to authenticated using (player_id = auth.uid());

-- player_skill_scores
drop policy if exists "player_skill_scores_select_own" on public.player_skill_scores;
create policy "player_skill_scores_select_own" on public.player_skill_scores
  for select to authenticated using (player_id = auth.uid() or public.is_admin());
drop policy if exists "player_skill_scores_insert_own" on public.player_skill_scores;
create policy "player_skill_scores_insert_own" on public.player_skill_scores
  for insert to authenticated with check (player_id = auth.uid());
drop policy if exists "player_skill_scores_update_own" on public.player_skill_scores;
create policy "player_skill_scores_update_own" on public.player_skill_scores
  for update to authenticated using (player_id = auth.uid()) with check (player_id = auth.uid());
drop policy if exists "player_skill_scores_delete_own" on public.player_skill_scores;
create policy "player_skill_scores_delete_own" on public.player_skill_scores
  for delete to authenticated using (player_id = auth.uid());

-- skill_signals
drop policy if exists "skill_signals_select_own" on public.skill_signals;
create policy "skill_signals_select_own" on public.skill_signals
  for select to authenticated using (player_id = auth.uid() or public.is_admin());
drop policy if exists "skill_signals_insert_own" on public.skill_signals;
create policy "skill_signals_insert_own" on public.skill_signals
  for insert to authenticated with check (player_id = auth.uid());
drop policy if exists "skill_signals_update_own" on public.skill_signals;
create policy "skill_signals_update_own" on public.skill_signals
  for update to authenticated using (player_id = auth.uid()) with check (player_id = auth.uid());
drop policy if exists "skill_signals_delete_own" on public.skill_signals;
create policy "skill_signals_delete_own" on public.skill_signals
  for delete to authenticated using (player_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. player_achievements — badges visibles par leur seul titulaire
-- ---------------------------------------------------------------------------
-- L'écran Équipe n'affiche pas les badges des coéquipiers : la clause coach
-- élargissait la lecture sans usage réel.

drop policy if exists "player_achievements_owner_select" on public.player_achievements;

drop policy if exists "player_achievements_select_own" on public.player_achievements;
create policy "player_achievements_select_own" on public.player_achievements
  for select to authenticated
  using (player_id = auth.uid() or public.is_admin());

-- `player_achievements_admin_write` (0005) reste : seuls un admin et la
-- fonction `apply_session_rewards()` (security definer) attribuent un badge.

-- ---------------------------------------------------------------------------
-- 6. player_profiles — inchangée, et pourquoi
-- ---------------------------------------------------------------------------
-- `player_profiles_select_own` (0002) autorise la lecture par le coach :
--   using (id = auth.uid() or is_team_coach_of(id) or is_admin())
-- C'est exactement ce dont l'écran Équipe a besoin (poste, niveau, série des
-- joueurs du roster), et c'est de la LECTURE seule — l'écriture passe par
-- `player_profiles_update_own`, restreinte à `id = auth.uid()`.
--
-- Ce prédicat redevient sûr une fois la section 3 appliquée : on ne peut plus
-- se déclarer coach d'une équipe qu'on n'a pas créée. On la laisse donc en
-- place plutôt que de casser la fonctionnalité Équipe.
