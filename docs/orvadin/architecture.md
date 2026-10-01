# Architecture technique — Orvadin Coach

Propriétaire des propositions : `cto`. Écriture : le Director seul, sur constat vérifié
(`README.md` §5).

Ce fichier décrit l'état technique **réel**, jamais l'état prévu. Le prévu vit dans `decisions.md`
(décisions) et `product.md` (DÉCIDÉ / ENVISAGÉ). Chaque constat porte sa source, l'état du code
(branche ou commit) ou de la base, et sa date.

**Ordre de preuve :** 1. le code et la base de données ; 2. ce fichier ; 3. la documentation
historique (README du dépôt, anciens commentaires). Si ce fichier contredit le code ou la base,
c'est lui qu'on corrige et l'écart est signalé.

## Identifiant du projet Supabase

- Projet de production « Coach Volley », **`project_id` = `acywvbxezaoioapdmicl`**.
- Source : outil `list_projects` (lecture seule), 2026-10-01. C'est le seul projet du compte.
- Ce n'est pas un secret : l'identifiant fait partie de l'URL publique
  `https://<project_id>.supabase.co` embarquée dans l'application. Aucune clé ni aucun jeton ne
  doit jamais être consigné dans ce fichier.
- Le CTO n'a pas l'outil `list_projects`. Si cet identifiant est absent ou rejeté, il le signale
  au lieu de le deviner.

## États du code par branche (git, 2026-10-01)

Aucune branche n'est la vérité absolue tant qu'elles divergent (`README.md` §5.8 ; stratégie de
branches : Q-005).

| Branche | Commit | Constat |
|---|---|---|
| `main` | `0ca6d65` (2026-09-20) | Application « Coach Volley ». 15 migrations (`0001` à `0015`). |
| `claude/orvadin-agents-setup-fdqo21` | basée sur `main` ; configuration : `8775888`, `a53da93`, `78a0081`, puis la gouvernance | Configuration des agents, documentation et garde `.claude/settings.json` (cette branche seule la contient). Aucun fichier de l'application (`app/`, `src/`, `supabase/`, `scripts/`, `assets/`, `package.json`, `app.json`, `eas.json`) ne diffère de `main`. |
| `claude/coach-volley-app-051xnb` | `6f37ab8` (2026-09-28) | 21 commits après `main`, sans pull request ouverte. Nom affiché « ORVADIN » (`d66d84d`). 23 migrations (15 + 8 horodatées). Titres de commits annonçant aussi : file hors ligne réparée, session Supabase dans le stockage sécurisé, adoption de React Query (comportement non vérifié). |
| `claude/fitness-tracking-app-ijmkxv` | `2b09842` (2026-09-09) | Branche ancienne, liée à la pull request n° 1 (ouverte). Non examinée. |

## Base de données de production (outils Supabase en lecture, 2026-10-01)

- **18 tables** dans le schéma `public`, **RLS activée sur les 18** : `clubs`, `teams`,
  `player_profiles`, `team_members`, `exercises`, `workouts`, `workout_exercises`,
  `workout_sessions`, `statistics`, `goals`, `achievements`, `player_achievements`,
  `ai_conversations`, `ai_messages`, `exercise_feedback`, `player_skill_scores`, `skill_signals`,
  `ai_usage`.
- **23 migrations appliquées** : `0001` à `0015` et 8 horodatées (voir ci-dessous).
- **Edge Functions :** une seule, `ai-coach`, ACTIVE, version 10, `verify_jwt` = true.
- **Non vérifié :** le contenu des politiques RLS, le corps des fonctions et le code déployé de
  l'Edge Function (les outils en lecture ne les renvoient pas).

## Migrations : code et base (constat)

| Source | Migrations |
|---|---|
| `main` (`0ca6d65`) | 15 fichiers, `0001` à `0015` |
| `claude/coach-volley-app-051xnb` (`6f37ab8`) | 23 fichiers : les 15 précédents + 8 horodatés |
| Base de production | 23 migrations : mêmes versions et mêmes noms que `claude/coach-volley-app-051xnb` |

Les 8 migrations horodatées, **présentes en base et sur `claude/coach-volley-app-051xnb`,
absentes de `main`** :

| Version | Nom | Commit sur `051xnb` | md5 consigné au rapatriement |
|---|---|---|---|
| `20260922203536` | `security_hardening_audit_2` | `f6c89d5` | oui |
| `20260922203616` | `rewards_integrity_and_badges` | `f6c89d5` | oui |
| `20260922203655` | `rls_performance` | `f6c89d5` | oui |
| `20260922204017` | `complete_legacy_exercises` | `f6c89d5` | oui |
| `20260922204106` | `revoke_trigger_functions` | `f6c89d5` | oui |
| `20260928044219` | `private_rls_helpers` | `bb7ae93` | non |
| `20260928141928` | `ai_quota_status_without_debit` | `a9dd462` | non |
| `20260928145210` | `pin_ai_daily_quota_search_path` | `1e0cd75` | non |

- Le commit `f6c89d5` (2026-09-28) a rapatrié les cinq premières depuis
  `supabase_migrations.schema_migrations` avec un contrôle md5. Recalcul du 2026-10-01 : les cinq
  md5 concordent avec ceux du message de commit (calculés sans le retour à la ligne final), et
  ces fichiers n'ont pas été modifiés depuis.
- L'égalité exacte entre le SQL de chaque fichier et le SQL appliqué en base est **non vérifiée**
  (elle exige un `SELECT` sur `supabase_migrations.schema_migrations` ; `execute_sql` est sous
  garde, D-014).
- **Écart constaté, aucune correction faite :** 8 migrations de la base n'ont pas de fichier sur
  `main`. La stratégie d'alignement relève de Q-005.
- `scripts/verify-rls-production.sql:160` appelle `public.is_member_of_team(id)`, que la migration
  `20260928044219` supprime (`supabase/migrations/20260928044219_private_rls_helpers.sql:195`).
  Constaté sur `main` et sur `claude/coach-volley-app-051xnb`. Le script n'a pas été exécuté.

## Pile technique (`package.json`, 2026-10-01)

| Paquet | `main` (`0ca6d65`) | `051xnb` (`6f37ab8`) |
|---|---|---|
| `expo` | `~57.0.21` | `~57.0.21` |
| `react-native` | `0.86.3` | `0.86.3` |
| `react` | `19.2.3` | `19.2.3` |
| `expo-router` | `~57.0.20` | `~57.0.20` |
| `@supabase/supabase-js` | `^2.116.0` | `^2.116.0` |
| `@tanstack/react-query` | `^5.102.8` | `^5.102.8` |
| `zustand` | `^5.0.15` | `^5.0.15` |
| `@react-native-async-storage/async-storage` | `2.2.0` | `2.2.0` |
| `@react-native-community/netinfo` | `12.0.1` | `12.0.1` |
| `expo-secure-store` | `~57.0.3` | `~57.0.3` |
| `typescript` | `~5.9.3` | `~5.9.3` |

- Présents seulement sur `051xnb` : `expo-system-ui`, `expo-updates`. Présents seulement sur `main` :
  `date-fns`, `expo-device`.
- **Script `test`** : sur `main`, `jest`, alors que `jest` n'est dans aucune liste de dépendances
  (Q-004) ; sur `051xnb`, une chaîne `typecheck`, `lint` et les scripts `*:check`
  (`exercises`, `engine`, `coach`, `offline`, `session`, `goals`, `dataflow`), sans `jest`.

## Non documenté (à vérifier par le CTO, par branche)

Structure de l'application (routes, composants, services, stores) ; sécurité et contenu des
politiques RLS ; authentification ; fonctionnement hors ligne ; code déployé de l'Edge Function ;
Coach IA ; moteur de recommandation ; build et déploiement (`eas.json`, `app.json`) ; cohérence
iOS / Android ; dette technique.
