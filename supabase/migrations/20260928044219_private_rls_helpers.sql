-- ============================================================================
-- Les aides de politique RLS quittent le schéma public
--
-- `is_admin()`, `is_coach_of_team()`, `is_member_of_team()` et
-- `is_team_coach_of()` n'existent que pour être appelées depuis les politiques
-- RLS. Tant qu'elles vivent dans `public`, PostgREST les publie comme des RPC :
-- n'importe quel compte connecté peut les appeler directement sur
-- /rest/v1/rpc/<nom>. Aucun écran de l'application ne le fait, et l'analyseur
-- de sécurité Supabase le signale.
--
-- On ne peut pas simplement retirer le droit d'exécution : une expression de
-- politique est évaluée avec les droits du compte qui interroge la table, donc
-- révoquer EXECUTE à `authenticated` fait échouer la lecture elle-même
-- (« permission denied for function is_admin ») — vérifié sur une base jetable
-- avant d'écrire cette migration. `is_admin()` est utilisée par 34 politiques
-- sur 15 tables : la casser rendrait l'application inutilisable.
--
-- La solution est donc de les déplacer dans un schéma que l'API n'expose pas.
-- Les politiques continuent de les appeler, PostgREST ne les voit plus.
--
-- Aucune donnée touchée : uniquement des fonctions, des politiques et des
-- droits.
-- ============================================================================

create schema if not exists private;

-- Le schéma n'est pas dans la liste des schémas exposés par l'API : ce qu'il
-- contient est inatteignable depuis /rest/v1/, quel que soit le jeton.
revoke all on schema private from public;
-- `authenticated` doit pouvoir traverser le schéma, sinon les politiques qui
-- appellent ces fonctions échouent.
grant usage on schema private to authenticated;

-- --------------------------------------------------------------------------
-- 1. Les quatre aides, à l'identique, dans `private`
-- --------------------------------------------------------------------------
create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.player_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function private.is_coach_of_team(p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id
      and player_id = auth.uid()
      and role = 'coach'
  );
$$;

create or replace function private.is_member_of_team(p_team_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team_id
      and player_id = auth.uid()
  );
$$;

create or replace function private.is_team_coach_of(target_player uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.team_members my_membership
    join public.team_members their_membership
      on my_membership.team_id = their_membership.team_id
    where my_membership.player_id = auth.uid()
      and my_membership.role = 'coach'
      and their_membership.player_id = target_player
  );
$$;

revoke execute on all functions in schema private from public;
grant execute on function private.is_admin()                  to authenticated;
grant execute on function private.is_coach_of_team(uuid)      to authenticated;
grant execute on function private.is_member_of_team(uuid)     to authenticated;
grant execute on function private.is_team_coach_of(uuid)      to authenticated;

-- --------------------------------------------------------------------------
-- 2. Repointer les politiques existantes
--
-- Réécriture programmatique plutôt que 38 `alter policy` à la main : le texte
-- des expressions est lu depuis le catalogue, donc on ne peut pas se tromper
-- sur une politique. Les expressions sont stockées sous leur forme
-- déparsée — `( SELECT is_admin() AS is_admin)`, sans préfixe de schéma —, on
-- remplace donc le nom suivi d'une parenthèse, ce qui laisse l'alias
-- `AS is_admin` intact.
--
-- L'ordre des remplacements rend l'opération rejouable : un nom déjà préfixé
-- est d'abord ramené à sa forme nue avant d'être préfixé à nouveau, sinon
-- rejouer la migration produirait `private.private.is_admin()`.
-- --------------------------------------------------------------------------
do $do$
declare
  helpers text[] := array['is_admin', 'is_coach_of_team', 'is_member_of_team', 'is_team_coach_of'];
  p record;
  h text;
  v_using text;
  v_check text;
  v_sql text;
  v_count int := 0;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
      from pg_policies
     where schemaname = 'public'
  loop
    v_using := p.qual;
    v_check := p.with_check;

    foreach h in array helpers loop
      if v_using is not null then
        v_using := replace(v_using, 'private.' || h || '(', h || '(');
        v_using := replace(v_using, 'public.'  || h || '(', h || '(');
        v_using := replace(v_using, h || '(', 'private.' || h || '(');
      end if;
      if v_check is not null then
        v_check := replace(v_check, 'private.' || h || '(', h || '(');
        v_check := replace(v_check, 'public.'  || h || '(', h || '(');
        v_check := replace(v_check, h || '(', 'private.' || h || '(');
      end if;
    end loop;

    if v_using is distinct from p.qual or v_check is distinct from p.with_check then
      v_sql := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
      if v_using is not null then v_sql := v_sql || format(' using (%s)', v_using); end if;
      if v_check is not null then v_sql := v_sql || format(' with check (%s)', v_check); end if;
      execute v_sql;
      v_count := v_count + 1;
    end if;
  end loop;

  raise notice 'Politiques repointées vers private : %', v_count;
end
$do$;

-- --------------------------------------------------------------------------
-- 3. La fonction de garde des colonnes privilégiées appelle aussi `is_admin()`
--
-- Elle est SECURITY INVOKER et s'exécute sous le compte qui écrit : c'est
-- justement pour cela que `authenticated` a besoin du droit d'exécution sur
-- `private.is_admin()`, accordé plus haut.
-- --------------------------------------------------------------------------
create or replace function public.protect_privileged_profile_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  -- Seules les écritures faites directement par un compte joueur sont bridées.
  -- Le serveur (service_role), les fonctions internes et l'éditeur SQL passent.
  if current_user <> 'authenticated' then
    return new;
  end if;
  if private.is_admin() then
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
$$;

-- Cette fonction n'est déclenchée que par un trigger : personne n'a besoin de
-- l'appeler (rappel de 20260922204106, que le `create or replace` ci-dessus
-- laisse intact, mais qu'on réaffirme pour que la migration soit autonome).
revoke execute on function public.protect_privileged_profile_columns() from authenticated;

-- --------------------------------------------------------------------------
-- 4. Retirer les versions publiques
--
-- PostgreSQL refuse de supprimer une fonction encore référencée par une
-- politique : si l'étape 2 avait manqué une politique, ce `drop` échouerait et
-- la migration entière serait annulée. C'est le filet de sécurité voulu.
-- --------------------------------------------------------------------------
drop function if exists public.is_admin();
drop function if exists public.is_coach_of_team(uuid);
drop function if exists public.is_member_of_team(uuid);
drop function if exists public.is_team_coach_of(uuid);
