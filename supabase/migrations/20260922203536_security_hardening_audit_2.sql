-- =====================================================================
-- Durcissement de sécurité (suite de l'audit)
-- C4 : authentification exigée dans les fonctions, accès anon supprimé
-- C5 : séances "modèles" réservées aux admins
-- C6 : trigger de protection corrigé (serveur autorisé, insertion couverte)
-- C8 : search_path fixé, codes d'invitation à aléa fort
-- C3 : âge obligatoire dès que l'onboarding est validé
-- =====================================================================

-- --------------------------------------------------------------- C4
create or replace function public.create_team_as_coach(p_name text, p_club_id uuid default null)
returns public.teams language plpgsql security definer set search_path = public as $fn$
declare
  v_team public.teams;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Le nom de l''équipe est obligatoire.';
  end if;

  insert into public.teams (name, club_id, coach_id)
  values (trim(p_name), p_club_id, auth.uid())
  returning * into v_team;

  insert into public.team_members (team_id, player_id, role)
  values (v_team.id, auth.uid(), 'coach');

  update public.player_profiles set team_id = v_team.id where id = auth.uid();

  return v_team;
end;
$fn$;

create or replace function public.join_team_by_code(p_code text)
returns public.teams language plpgsql security definer set search_path = public as $fn$
declare
  v_team public.teams;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;

  select * into v_team from public.teams where invite_code = upper(trim(p_code));
  if v_team.id is null then
    raise exception 'Code d''invitation invalide.';
  end if;

  insert into public.team_members (team_id, player_id, role)
  values (v_team.id, auth.uid(), 'player')
  on conflict (team_id, player_id) do nothing;

  update public.player_profiles set team_id = v_team.id where id = auth.uid();

  return v_team;
end;
$fn$;

create or replace function public.leave_team()
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;
  delete from public.team_members where player_id = auth.uid();
  update public.player_profiles set team_id = null where id = auth.uid();
end;
$fn$;

-- --------------------------------------------------------------- C5
drop policy if exists "workouts_insert_own" on public.workouts;
create policy "workouts_insert_own" on public.workouts
  for insert to authenticated
  with check (
    (player_id = auth.uid() and coalesce(is_template, false) = false)
    or public.is_admin()
  );

drop policy if exists "workouts_update_own" on public.workouts;
create policy "workouts_update_own" on public.workouts
  for update to authenticated
  using (player_id = auth.uid() or public.is_admin())
  with check (
    (player_id = auth.uid() and coalesce(is_template, false) = false)
    or public.is_admin()
  );

-- --------------------------------------------------------------- C6
create or replace function public.protect_privileged_profile_columns()
returns trigger language plpgsql security invoker set search_path = public as $fn$
begin
  -- Seules les écritures faites directement par un compte joueur sont bridées.
  -- Le serveur (service_role), les fonctions internes et l'éditeur SQL passent.
  if current_user <> 'authenticated' then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role := 'player';
    new.is_premium := false;
    new.xp := 0;
    new.current_level := 1;
    new.streak_count := 0;
    new.longest_streak := 0;
    new.last_training_date := null;
  else
    new.role := old.role;
    new.is_premium := old.is_premium;
    new.xp := old.xp;
    new.current_level := old.current_level;
    new.streak_count := old.streak_count;
    new.longest_streak := old.longest_streak;
    new.last_training_date := old.last_training_date;
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_protect_privileged_profile_columns on public.player_profiles;
create trigger trg_protect_privileged_profile_columns
  before insert or update on public.player_profiles
  for each row execute function public.protect_privileged_profile_columns();

-- --------------------------------------------------------------- C8
alter function public.set_updated_at() set search_path = public;

create or replace function public.generate_invite_code()
returns text language sql volatile set search_path = public as $fn$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
$fn$;

-- --------------------------------------------------------------- C3
alter table public.player_profiles
  add constraint player_profiles_age_required_when_onboarded
  check (not coalesce(onboarding_completed, false) or age is not null);

-- --------------------------------------------- C4 (droits d'exécution)
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;

grant execute on function public.apply_session_rewards() to authenticated;
grant execute on function public.consume_ai_quota() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.create_team_as_coach(text, uuid) to authenticated;
grant execute on function public.join_team_by_code(text) to authenticated;
grant execute on function public.leave_team() to authenticated;
grant execute on function public.generate_invite_code() to authenticated;
-- utilisées par les règles RLS : indispensables aux comptes connectés
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_coach_of_team(uuid) to authenticated;
grant execute on function public.is_member_of_team(uuid) to authenticated;
grant execute on function public.is_team_coach_of(uuid) to authenticated;
-- création du profil à l'inscription
grant execute on function public.handle_new_user() to supabase_auth_admin;
