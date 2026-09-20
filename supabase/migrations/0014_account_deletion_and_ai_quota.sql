-- Coach Volley — suppression de compte (C1) et plafond d'usage du Coach IA (C2)
--
-- C1. SUPPRESSION DE COMPTE
-- =========================
-- L'App Store (guideline 5.1.1 v) impose qu'une application permettant de
-- créer un compte permette aussi de le supprimer depuis l'application, sans
-- passer par un e-mail ou un formulaire externe. Le RGPD (art. 17) impose la
-- même chose côté européen. Rien de tel n'existait.
--
-- Le schéma rend la suppression simple et complète : toutes les tables joueur
-- référencent `player_profiles(id)` en `on delete cascade`, et
-- `player_profiles.id` référence `auth.users(id)` en `on delete cascade`.
-- Supprimer la ligne `auth.users` suffit donc à effacer profil, séances,
-- statistiques, objectifs, badges, conversations IA, messages, feedbacks,
-- scores et signaux. Les actions référentielles s'exécutent avec les droits du
-- propriétaire des tables et ne sont pas filtrées par RLS : la cascade est
-- intégrale, y compris pour les lignes que le joueur ne pourrait pas supprimer
-- lui-même directement.
--
-- Deux références volontairement en `on delete set null` survivent :
--   - `exercises.created_by` : la bibliothèque est un contenu partagé, la
--     supprimer priverait tous les autres joueurs de leurs exercices ;
--   - `teams.coach_id` : l'équipe et ses autres membres ne sont pas les
--     données du partant. L'équipe reste, sans coach désigné.
-- Dans les deux cas, plus aucune donnée personnelle ne subsiste (la colonne
-- est mise à NULL), ce qui satisfait l'effacement tout en ne détruisant pas
-- les données d'autrui.
--
-- La suppression d'une ligne de `auth.users` n'est pas accessible au rôle
-- `authenticated`. Elle passe donc par une fonction `security definer`, qui
-- n'accepte aucun paramètre : elle ne peut effacer que `auth.uid()`, jamais
-- le compte d'un tiers, même si un attaquant appelle le RPC directement.

create or replace function public.delete_my_account()
returns void as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentification requise.' using errcode = '28000';
  end if;

  -- Aucun paramètre, aucune indirection : la cible est toujours l'appelant.
  delete from auth.users where id = v_uid;
end;
$$ language plpgsql security definer set search_path = public;

-- `security definer` + exécution ouverte à tous serait une porte ouverte aux
-- appels anonymes : on restreint explicitement au rôle authentifié.
revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;

comment on function public.delete_my_account() is
  'Supprime définitivement le compte de l''appelant (auth.uid()) et, par cascade, toutes ses données. Irréversible.';

-- ---------------------------------------------------------------------------
-- C2. PLAFOND QUOTIDIEN D'APPELS AU MODÈLE DE LANGAGE
-- ---------------------------------------------------------------------------
-- L'Edge Function `ai-coach` appelait l'API Anthropic sans aucune limite :
-- un compte de test suffisait à générer un coût illimité. On compte les appels
-- réellement facturés (ceux qui atteignent le modèle), par joueur et par jour.
--
-- Le moteur de règles, lui, reste sans limite : il est local, gratuit et
-- déterministe. Quand le plafond est atteint, le Coach IA continue donc de
-- répondre — aucune fonctionnalité n'est retirée, seule la dépense est bornée.

create table if not exists public.ai_usage (
  player_id uuid not null references public.player_profiles(id) on delete cascade,
  day date not null,
  message_count int not null default 0 check (message_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (player_id, day)
);

alter table public.ai_usage enable row level security;

-- Le joueur peut consulter sa propre consommation. Personne n'écrit
-- directement : la seule écriture passe par `consume_ai_quota()` ci-dessous,
-- qui est la seule à pouvoir incrémenter le compteur.
drop policy if exists ai_usage_select_own on public.ai_usage;
create policy ai_usage_select_own on public.ai_usage
  for select to authenticated
  using (player_id = auth.uid());

-- Consomme une unité de quota pour l'appelant et indique si l'appel est permis.
--
-- Le plafond est une constante DANS la fonction, jamais un paramètre : un
-- paramètre serait fourni par l'appelant, donc relevable à volonté par qui
-- appelle le RPC directement avec son propre jeton.
--
-- L'incrément et le test sont faits en une seule instruction : le `on conflict`
-- verrouille la ligne, deux requêtes simultanées ne peuvent pas passer toutes
-- les deux au-dessus du plafond.
create or replace function public.consume_ai_quota()
returns table (allowed boolean, used int, quota int) as $$
declare
  c_limit constant int := 30;
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'utc')::date;
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
    -- Le `where` a bloqué la mise à jour : le plafond est déjà atteint.
    select u.message_count into v_count
      from public.ai_usage u
     where u.player_id = v_uid and u.day = v_day;
    return query select false, coalesce(v_count, c_limit), c_limit;
  else
    return query select true, v_count, c_limit;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function public.consume_ai_quota() from public;
revoke all on function public.consume_ai_quota() from anon;
grant execute on function public.consume_ai_quota() to authenticated;

comment on function public.consume_ai_quota() is
  'Incrémente et teste le quota quotidien d''appels au modèle de langage pour auth.uid(). Le plafond est interne à la fonction.';

-- Permet de purger les compteurs anciens d'un seul balayage : la table n'a
-- aucune valeur historique, seule la journée en cours sert à quelque chose.
create index if not exists ai_usage_day_idx on public.ai_usage (day);
