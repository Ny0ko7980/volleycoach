-- `private.ai_daily_quota()` avait été déclarée sans `search_path` figé.
-- Elle ne fait que renvoyer une constante, donc le risque pratique est nul,
-- mais une fonction sans search_path épinglé est exactement ce que l'analyseur
-- de sécurité Supabase signale — et à juste titre : la règle ne vaut que si on
-- ne s'autorise pas d'exception « parce que ce cas-ci est inoffensif ».
create or replace function private.ai_daily_quota()
returns int language sql immutable set search_path = '' as $$
  select 30;
$$;

revoke all on function private.ai_daily_quota() from public;
