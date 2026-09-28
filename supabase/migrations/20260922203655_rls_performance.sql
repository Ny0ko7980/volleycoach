-- =====================================================================
-- O1 : index sur les clés étrangères, règles "FOR ALL" séparées,
--      auth.uid() et is_admin() évalués une seule fois par requête
-- =====================================================================

-- ------------------------------------------- 1. Index clés étrangères
create index if not exists idx_ai_conversations_player      on public.ai_conversations(player_id);
create index if not exists idx_exercise_feedback_exercise   on public.exercise_feedback(exercise_id);
create index if not exists idx_exercises_created_by         on public.exercises(created_by);
create index if not exists idx_player_achievements_achv     on public.player_achievements(achievement_id);
create index if not exists idx_player_profiles_team         on public.player_profiles(team_id);
create index if not exists idx_skill_signals_session        on public.skill_signals(session_id);
create index if not exists idx_statistics_session           on public.statistics(session_id);
create index if not exists idx_team_members_player          on public.team_members(player_id);
create index if not exists idx_teams_club                   on public.teams(club_id);
create index if not exists idx_teams_coach                  on public.teams(coach_id);
create index if not exists idx_workout_exercises_exercise   on public.workout_exercises(exercise_id);
create index if not exists idx_workout_sessions_workout     on public.workout_sessions(workout_id);
create index if not exists idx_workouts_player              on public.workouts(player_id);

-- ------------------------------ 2. Règles "FOR ALL" séparées par action
drop policy if exists "achievements_write_admin" on public.achievements;
create policy "achievements_insert_admin" on public.achievements for insert to authenticated with check (public.is_admin());
create policy "achievements_update_admin" on public.achievements for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "achievements_delete_admin" on public.achievements for delete to authenticated using (public.is_admin());

drop policy if exists "clubs_write_admin" on public.clubs;
create policy "clubs_insert_admin" on public.clubs for insert to authenticated with check (public.is_admin());
create policy "clubs_update_admin" on public.clubs for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "clubs_delete_admin" on public.clubs for delete to authenticated using (public.is_admin());

drop policy if exists "exercises_write_admin" on public.exercises;
create policy "exercises_insert_admin" on public.exercises for insert to authenticated with check (public.is_admin());
create policy "exercises_update_admin" on public.exercises for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "exercises_delete_admin" on public.exercises for delete to authenticated using (public.is_admin());

drop policy if exists "teams_write_admin_or_coach" on public.teams;
create policy "teams_insert_admin_or_coach" on public.teams for insert to authenticated
  with check (public.is_admin() or coach_id = auth.uid());
create policy "teams_update_admin_or_coach" on public.teams for update to authenticated
  using (public.is_admin() or coach_id = auth.uid())
  with check (public.is_admin() or coach_id = auth.uid());
create policy "teams_delete_admin_or_coach" on public.teams for delete to authenticated
  using (public.is_admin() or coach_id = auth.uid());

drop policy if exists "workout_exercises_write" on public.workout_exercises;
create policy "workout_exercises_insert" on public.workout_exercises for insert to authenticated
  with check (exists (select 1 from public.workouts w
                       where w.id = workout_exercises.workout_id
                         and (w.player_id = auth.uid() or public.is_admin())));
create policy "workout_exercises_update" on public.workout_exercises for update to authenticated
  using (exists (select 1 from public.workouts w
                  where w.id = workout_exercises.workout_id
                    and (w.player_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.workouts w
                       where w.id = workout_exercises.workout_id
                         and (w.player_id = auth.uid() or public.is_admin())));
create policy "workout_exercises_delete" on public.workout_exercises for delete to authenticated
  using (exists (select 1 from public.workouts w
                  where w.id = workout_exercises.workout_id
                    and (w.player_id = auth.uid() or public.is_admin())));

-- --------------------------- 3. Une seule évaluation par requête
do $do$
declare
  p record;
  v_using text;
  v_check text;
  v_sql text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
      from pg_policies
     where schemaname = 'public'
  loop
    v_using := p.qual;
    v_check := p.with_check;

    if v_using is not null then
      v_using := replace(v_using, 'public.is_admin()', 'is_admin()');
      v_using := replace(v_using, 'is_admin()', '(select public.is_admin())');
      v_using := replace(v_using, 'auth.uid()', '(select auth.uid())');
    end if;

    if v_check is not null then
      v_check := replace(v_check, 'public.is_admin()', 'is_admin()');
      v_check := replace(v_check, 'is_admin()', '(select public.is_admin())');
      v_check := replace(v_check, 'auth.uid()', '(select auth.uid())');
    end if;

    if v_using is distinct from p.qual or v_check is distinct from p.with_check then
      v_sql := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
      if v_using is not null then v_sql := v_sql || format(' using (%s)', v_using); end if;
      if v_check is not null then v_sql := v_sql || format(' with check (%s)', v_check); end if;
      execute v_sql;
    end if;
  end loop;
end
$do$;
