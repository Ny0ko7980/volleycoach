-- ============================================================================
-- Le quota du Coach IA n'est plus débité par un échec technique
--
-- `consume_ai_quota()` teste et incrémente en une seule instruction, ce qui est
-- exactement ce qu'il faut pour être à l'abri des appels simultanés. Mais
-- l'Edge Function l'appelait AVANT de solliciter le modèle : un appel qui
-- échouait — modèle injoignable, délai dépassé, erreur serveur — coûtait quand
-- même une des trente questions quotidiennes du joueur, pour une réponse de
-- repli qu'il n'avait pas demandée.
--
-- On sépare donc la consultation du débit. La fonction ci-dessous ne fait que
-- lire, et l'Edge Function ne débite qu'après avoir réellement obtenu une
-- réponse.
--
-- Deux appels simultanés peuvent en théorie passer tous les deux le test et
-- dépasser le plafond d'une unité. C'est assumé : le plafond borne une
-- dépense, il n'a pas à être exact à l'unité près, et un joueur n'envoie pas
-- deux questions à la même milliseconde depuis un téléphone.
-- ============================================================================

-- Valeur unique du plafond. Dans `private`, donc hors de l'API REST : personne
-- n'a besoin de l'appeler depuis un client.
create or replace function private.ai_daily_quota()
returns int language sql immutable as $$
  select 30;
$$;

revoke all on function private.ai_daily_quota() from public;

-- Consultation sans débit.
create or replace function public.ai_quota_status()
returns table (allowed boolean, used int, quota int)
language plpgsql stable security definer set search_path = public as $$
declare
  c_limit constant int := private.ai_daily_quota();
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'Europe/Paris')::date;
  v_count int;
begin
  if v_uid is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;

  select u.message_count into v_count
    from public.ai_usage u
   where u.player_id = v_uid and u.day = v_day;

  v_count := coalesce(v_count, 0);
  return query select v_count < c_limit, v_count, c_limit;
end;
$$;

revoke all on function public.ai_quota_status() from public;
revoke all on function public.ai_quota_status() from anon;
grant execute on function public.ai_quota_status() to authenticated;

comment on function public.ai_quota_status() is
  'Consulte le quota quotidien du Coach IA pour auth.uid(), sans le débiter.';

-- Le plafond avait été recopié dans la fonction de débit : on le fait pointer
-- sur la valeur unique pour qu'il n'existe plus qu'un seul endroit à changer.
create or replace function public.consume_ai_quota()
returns table(allowed boolean, used integer, quota integer)
language plpgsql security definer set search_path = public as $$
declare
  c_limit constant int := private.ai_daily_quota();
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
$$;
