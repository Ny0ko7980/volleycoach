-- Coach Volley — durcissement sécurité RLS
--
-- Deux failles découvertes en construisant l'interface admin (0004 a ajouté
-- des fonctionnalités qui dépendent de player_profiles.role='admin', ce qui
-- a mis en évidence que rien n'empêchait un joueur de se l'attribuer
-- lui-même) :
--
-- 1. player_profiles_update_own (0002) autorise un joueur à modifier N'IMPORTE
--    QUELLE colonne de sa propre ligne, y compris `role` et `is_premium`.
--    Un joueur pouvait donc s'auto-promouvoir admin ou s'auto-accorder le
--    Premium via un appel API direct (hors de l'UI, qui ne propose jamais
--    ces champs, mais RLS ne protège que la ligne, pas les colonnes).
--
-- 2. player_achievements_owner_insert (0002) autorise un joueur à insérer
--    n'importe quel achievement_id pour lui-même, sans vérification des
--    critères — un joueur pouvait donc "forger" n'importe quel badge.
--    De même, la mise à jour de xp/streak_count/current_level se faisait
--    côté client (gamificationService.ts), un joueur malveillant pouvait
--    donc s'attribuer un score arbitraire.
--
-- Correctifs: (a) trigger bloquant toute modification de role/is_premium
-- par un non-admin, (b) fonction SECURITY DEFINER apply_session_rewards()
-- qui recalcule XP/série/badges côté serveur à partir des données déjà en
-- base (aucune valeur envoyée par le client n'est utilisée), (c) retrait de
-- la policy d'auto-insertion de badges.

create or replace function public.protect_privileged_profile_columns()
returns trigger as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.is_premium := old.is_premium;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_protect_privileged_profile_columns on public.player_profiles;
create trigger trg_protect_privileged_profile_columns
  before update on public.player_profiles
  for each row execute function public.protect_privileged_profile_columns();

-- Un joueur ne peut plus s'auto-attribuer un badge: seule la fonction
-- apply_session_rewards() (ci-dessous, SECURITY DEFINER) peut désormais
-- insérer dans player_achievements, en plus d'un admin.
drop policy if exists "player_achievements_owner_insert" on public.player_achievements;

create policy "player_achievements_admin_write" on public.player_achievements
  for insert to authenticated
  with check (public.is_admin());

create or replace function public.apply_session_rewards()
returns public.player_profiles as $$
declare
  v_profile public.player_profiles;
  v_today date := current_date;
  v_streak int;
  v_new_xp int;
  v_level int;
  v_session_count int;
  v_achievement record;
begin
  select * into v_profile from public.player_profiles where id = auth.uid();
  if v_profile.id is null then
    raise exception 'Profil introuvable.';
  end if;

  if v_profile.last_training_date is null then
    v_streak := 1;
  elsif v_profile.last_training_date = v_today then
    v_streak := v_profile.streak_count;
  elsif v_profile.last_training_date = v_today - 1 then
    v_streak := v_profile.streak_count + 1;
  else
    v_streak := 1;
  end if;

  v_new_xp := v_profile.xp + 50;
  v_level := (v_new_xp / 200) + 1;

  update public.player_profiles
  set xp = v_new_xp,
      current_level = v_level,
      streak_count = v_streak,
      longest_streak = greatest(v_streak, v_profile.longest_streak),
      last_training_date = v_today
  where id = auth.uid()
  returning * into v_profile;

  select count(*) into v_session_count
  from public.workout_sessions
  where player_id = auth.uid() and status = 'completed';

  for v_achievement in
    select a.* from public.achievements a
    where not exists (
      select 1 from public.player_achievements pa
      where pa.player_id = auth.uid() and pa.achievement_id = a.id
    )
  loop
    if (v_achievement.criteria->>'type' = 'session_count'
          and v_session_count >= coalesce((v_achievement.criteria->>'value')::int, 999999))
        or (v_achievement.criteria->>'type' = 'streak'
          and v_streak >= coalesce((v_achievement.criteria->>'value')::int, 999999))
    then
      insert into public.player_achievements (player_id, achievement_id)
      values (auth.uid(), v_achievement.id)
      on conflict do nothing;
    end if;
  end loop;

  return v_profile;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.apply_session_rewards() to authenticated;
