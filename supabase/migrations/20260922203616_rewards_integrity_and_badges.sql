-- =====================================================================
-- C7 : une séance ne peut être récompensée qu'une seule fois
-- T6 : badges "100 exercices", "régularité en réception" et "objectif
--      atteint" implémentés ; "nouveau record" retiré du catalogue
-- O2 : XP, séries et quota IA calculés sur le fuseau Europe/Paris
-- =====================================================================

alter table public.workout_sessions add column if not exists rewarded_at timestamptz;
comment on column public.workout_sessions.rewarded_at is
  'Date d''attribution des récompenses (XP, série, badges). Empêche toute double attribution ; non modifiable par le joueur.';

-- Les séances déjà terminées ont déjà donné leur XP : on les marque.
update public.workout_sessions
   set rewarded_at = coalesce(completed_at, now())
 where status = 'completed' and rewarded_at is null;

-- --------------------------------------------------------------- T6
create or replace function public.award_achievements(p_player uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare
  v_streak int;
  v_sessions int;
  v_exercises int;
  v_goals int;
  v_a record;
  v_value int;
  v_ok boolean;
begin
  select coalesce(streak_count, 0) into v_streak from public.player_profiles where id = p_player;

  select count(*) into v_sessions
    from public.workout_sessions
   where player_id = p_player and status = 'completed';

  select count(*) into v_exercises
    from public.workout_exercises we
    join public.workout_sessions s on s.workout_id = we.workout_id
   where s.player_id = p_player and s.status = 'completed';

  select count(*) into v_goals
    from public.goals
   where player_id = p_player
     and (status = 'achieved'
          or (target_value is not null and current_value is not null and current_value >= target_value));

  for v_a in
    select a.* from public.achievements a
     where not exists (
       select 1 from public.player_achievements pa
        where pa.player_id = p_player and pa.achievement_id = a.id
     )
  loop
    v_value := coalesce((v_a.criteria->>'value')::int, 999999);
    v_ok := case v_a.criteria->>'type'
      when 'session_count'  then v_sessions  >= v_value
      when 'streak'         then v_streak    >= v_value
      when 'exercise_count' then v_exercises >= v_value
      when 'goal_achieved'  then v_goals     >= v_value
      when 'objective_session_count' then (
        select count(*)
          from public.workout_sessions s
          join public.workouts w on w.id = s.workout_id
         where s.player_id = p_player
           and s.status = 'completed'
           and w.objective = v_a.criteria->>'objective'
      ) >= v_value
      else false
    end;

    if v_ok then
      insert into public.player_achievements (player_id, achievement_id)
      values (p_player, v_a.id)
      on conflict do nothing;
    end if;
  end loop;
end;
$fn$;

-- Badge sans règle d'attribution possible tant que la notion de record
-- n'est pas définie côté app : retiré du catalogue pour ne pas afficher
-- un badge impossible à débloquer.
delete from public.player_achievements pa
 using public.achievements a
 where a.id = pa.achievement_id and a.code = 'new_record';
delete from public.achievements where code = 'new_record';

-- --------------------------------------------------------------- C7
create or replace function public.grant_session_rewards(p_player uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare
  v_profile public.player_profiles;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_streak int;
  v_new_xp int;
begin
  select * into v_profile from public.player_profiles where id = p_player;
  if v_profile.id is null then
    return;
  end if;

  if v_profile.last_training_date is null then
    v_streak := 1;
  elsif v_profile.last_training_date = v_today then
    v_streak := greatest(coalesce(v_profile.streak_count, 0), 1);
  elsif v_profile.last_training_date = v_today - 1 then
    v_streak := coalesce(v_profile.streak_count, 0) + 1;
  else
    v_streak := 1;
  end if;

  v_new_xp := coalesce(v_profile.xp, 0) + 50;

  update public.player_profiles
     set xp = v_new_xp,
         current_level = (v_new_xp / 200) + 1,
         streak_count = v_streak,
         longest_streak = greatest(v_streak, coalesce(v_profile.longest_streak, 0)),
         last_training_date = v_today
   where id = p_player;

  perform public.award_achievements(p_player);
end;
$fn$;

create or replace function public.mark_session_rewardable()
returns trigger language plpgsql security invoker set search_path = public as $fn$
begin
  -- Le joueur ne peut pas remettre le marqueur à zéro pour rejouer la récompense.
  if current_user = 'authenticated' then
    if tg_op = 'UPDATE' then
      new.rewarded_at := old.rewarded_at;
    else
      new.rewarded_at := null;
    end if;
  end if;

  if new.status = 'completed' and new.rewarded_at is null then
    new.rewarded_at := now();
  end if;

  return new;
end;
$fn$;

create or replace function public.apply_rewards_after_session()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.rewarded_at is not null and (tg_op = 'INSERT' or old.rewarded_at is null) then
    perform public.grant_session_rewards(new.player_id);
  end if;
  return null;
end;
$fn$;

drop trigger if exists trg_session_rewardable on public.workout_sessions;
create trigger trg_session_rewardable
  before insert or update on public.workout_sessions
  for each row execute function public.mark_session_rewardable();

drop trigger if exists trg_apply_rewards_after_session on public.workout_sessions;
create trigger trg_apply_rewards_after_session
  after insert or update on public.workout_sessions
  for each row execute function public.apply_rewards_after_session();

-- Les badges liés aux objectifs se débloquent aussi hors séance.
create or replace function public.award_on_goal_progress()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  perform public.award_achievements(new.player_id);
  return null;
end;
$fn$;

drop trigger if exists trg_award_on_goal_progress on public.goals;
create trigger trg_award_on_goal_progress
  after insert or update on public.goals
  for each row execute function public.award_on_goal_progress();

-- L'appel historique de l'app reste valide : il renvoie le profil à jour,
-- les récompenses étant désormais attribuées par la base à la fin de séance.
create or replace function public.apply_session_rewards()
returns public.player_profiles
language plpgsql security definer set search_path = public as $fn$
declare
  v_profile public.player_profiles;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;
  select * into v_profile from public.player_profiles where id = auth.uid();
  if v_profile.id is null then
    raise exception 'Profil introuvable.';
  end if;
  return v_profile;
end;
$fn$;

-- --------------------------------------------------------------- O2
create or replace function public.consume_ai_quota()
returns table(allowed boolean, used integer, quota integer)
language plpgsql security definer set search_path = public as $fn$
declare
  c_limit constant int := 30;
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'Europe/Paris')::date;
  v_count int;
begin
  if v_uid is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;

  insert into public.ai_usage as u (player_id, day, message_count, updated_at)
  values (v_uid, v_day, 1, now())
  on conflict (player_id, day) do update
    set message_count = u.message_count + 1,
        updated_at = now()
    where u.message_count < c_limit
  returning u.message_count into v_count;

  if v_count is null then
    select u.message_count into v_count
      from public.ai_usage u
     where u.player_id = v_uid and u.day = v_day;
    return query select false, coalesce(v_count, c_limit), c_limit;
  else
    return query select true, v_count, c_limit;
  end if;
end;
$fn$;

-- Fonctions internes : jamais appelables depuis l'app.
revoke execute on function public.award_achievements(uuid) from public, anon, authenticated;
revoke execute on function public.grant_session_rewards(uuid) from public, anon, authenticated;
revoke execute on function public.mark_session_rewardable() from public, anon, authenticated;
revoke execute on function public.apply_rewards_after_session() from public, anon, authenticated;
revoke execute on function public.award_on_goal_progress() from public, anon, authenticated;
grant execute on function public.consume_ai_quota() to authenticated;
grant execute on function public.apply_session_rewards() to authenticated;
