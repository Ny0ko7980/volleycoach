-- Coach Volley — vérification de la RLS sur la base réelle (B1 / migration 0013)
--
-- CE SCRIPT EST STRICTEMENT EN LECTURE SEULE.
-- Il ne contient aucun INSERT, UPDATE, DELETE, DROP, TRUNCATE ni ALTER.
-- La seule transaction ouverte se termine par un ROLLBACK, et elle ne fait
-- que des SELECT : aucune donnée utilisateur n'est lue en écriture, modifiée
-- ni supprimée.
--
-- À coller dans l'éditeur SQL Supabase, section par section.


-- ===========================================================================
-- 1. La migration 0013 est-elle enregistrée comme appliquée ?
-- ===========================================================================
-- Attendu : une ligne « 0013 » dans la liste.

select version, name
from supabase_migrations.schema_migrations
order by version desc
limit 6;


-- ===========================================================================
-- 2a. Les anciennes policies vulnérables ont-elles disparu ?
-- ===========================================================================
-- Attendu : AUCUNE LIGNE. Toute ligne renvoyée ici signifie que la faille est
-- encore ouverte (les policies permissives se cumulent en OR : il suffit
-- qu'une seule des anciennes subsiste pour rouvrir l'accès croisé).

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and policyname in (
    'teams_select_authenticated',
    'team_members_write_admin_or_coach',
    'team_members_select_self_or_coach',
    'team_members_leave_self',
    'workout_sessions_owner',
    'statistics_owner',
    'goals_owner',
    'exercise_feedback_owner',
    'player_skill_scores_owner',
    'skill_signals_owner',
    'player_achievements_owner_select'
  );


-- ===========================================================================
-- 2b. Les nouvelles policies sont-elles bien actives ?
-- ===========================================================================
-- Attendu : 29 lignes, exactement les 29 policies créées par la 0013.
-- (Filtrer par motif ne suffirait pas : des policies antérieures, comme
--  player_profiles_select_own, portent des noms de forme identique.)

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and policyname in (
    'teams_select_member_or_coach',
    'team_members_select_self_or_team_coach',
    'team_members_delete_self_or_team_coach',
    'team_members_insert_admin',
    'workout_sessions_select_own',
    'workout_sessions_insert_own',
    'workout_sessions_update_own',
    'workout_sessions_delete_own',
    'statistics_select_own',
    'statistics_insert_own',
    'statistics_update_own',
    'statistics_delete_own',
    'goals_select_own',
    'goals_insert_own',
    'goals_update_own',
    'goals_delete_own',
    'exercise_feedback_select_own',
    'exercise_feedback_insert_own',
    'exercise_feedback_update_own',
    'exercise_feedback_delete_own',
    'player_skill_scores_select_own',
    'player_skill_scores_insert_own',
    'player_skill_scores_update_own',
    'player_skill_scores_delete_own',
    'skill_signals_select_own',
    'skill_signals_insert_own',
    'skill_signals_update_own',
    'skill_signals_delete_own',
    'player_achievements_select_own'
  )
order by tablename, cmd, policyname;


-- ===========================================================================
-- 2c. Aucune policy ne doit plus donner une écriture via la relation coach
-- ===========================================================================
-- Attendu : AUCUNE LIGNE.
-- Une policy `for all` (cmd = 'ALL') dont le USING mentionne is_team_coach_of
-- accorde aussi UPDATE et DELETE — c'est exactement le troisième maillon de
-- la faille.

select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
  and cmd = 'ALL'
  and qual ilike '%is_team_coach_of%';


-- ===========================================================================
-- 2d. La RLS est-elle active sur toutes les tables ?
-- ===========================================================================
-- Attendu : rls_active = true partout.

select c.relname as table_name, c.relrowsecurity as rls_active
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relrowsecurity, c.relname;


-- ===========================================================================
-- 3. Test de comportement réel, en lecture seule
-- ===========================================================================
-- On se fait passer pour un vrai joueur (le plus ancien compte non-admin et
-- non-coach) et on compte ce qu'il peut voir des données des AUTRES.
-- Uniquement des SELECT, et la transaction est annulée à la fin.
--
-- Attendu : TOUS LES COMPTEURS À 0.
-- Un compteur > 0 signifie que ce joueur voit les données privées d'un autre.

begin;

select set_config(
  'request.jwt.claim.sub',
  (select p.id::text
     from public.player_profiles p
    where p.role <> 'admin'
      and not exists (
        select 1 from public.team_members tm
         where tm.player_id = p.id and tm.role = 'coach'
      )
    order by p.created_at
    limit 1),
  true
) as joueur_simule;

set local role authenticated;

select
  (select count(*) from public.player_profiles    where id        <> auth.uid()) as profils_autres,
  (select count(*) from public.workout_sessions   where player_id <> auth.uid()) as seances_autres,
  (select count(*) from public.statistics         where player_id <> auth.uid()) as stats_autres,
  (select count(*) from public.goals              where player_id <> auth.uid()) as objectifs_autres,
  (select count(*) from public.exercise_feedback  where player_id <> auth.uid()) as ressentis_autres,
  (select count(*) from public.player_skill_scores where player_id <> auth.uid()) as scores_autres,
  (select count(*) from public.skill_signals      where player_id <> auth.uid()) as signaux_autres,
  (select count(*) from public.ai_conversations   where player_id <> auth.uid()) as conversations_autres,
  (select count(*) from public.workouts           where player_id <> auth.uid()) as workouts_autres,
  (select count(*) from public.teams
     where coach_id <> auth.uid()
       and not public.is_member_of_team(id))                                     as equipes_autres;

reset role;

rollback;


-- ===========================================================================
-- 4. Contrôle de sanité : le catalogue partagé reste lisible
-- ===========================================================================
-- Attendu : le nombre d'exercices et de badges, non nuls. Si ces compteurs
-- tombaient à 0, la 0013 aurait cassé le fonctionnement normal.

begin;

select set_config(
  'request.jwt.claim.sub',
  (select p.id::text from public.player_profiles p where p.role <> 'admin' order by p.created_at limit 1),
  true
) as joueur_simule;

set local role authenticated;

select
  (select count(*) from public.exercises)    as exercices_lisibles,
  (select count(*) from public.achievements) as badges_lisibles;

reset role;

rollback;
