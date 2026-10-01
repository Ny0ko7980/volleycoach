# Architecture technique — Orvadin Coach

Propriétaire des propositions : `cto`. Règles d'écriture et statuts : `README.md`.
En cas de divergence, `decisions.md` fait foi.

Ce document décrit l'architecture **réelle**, constatée dans le dépôt, pas une architecture
supposée. Toute affirmation cite sa source (`chemin:ligne`). Tout ce qui n'a pas été vérifié
est marqué « non vérifié ».

Distinguer toujours :
- ce qui est constaté **dans le code** du dépôt (migrations, services, configuration) ;
- ce qui est constaté **dans la base réelle** (Supabase en ligne), qui peut différer du code.

## État du document

Squelette. La première mission du CTO est de le documenter à partir du dépôt, en **PROPOSÉ**,
pour relecture d'Adrien. Rien ci-dessous n'est VALIDÉ.

## Identifiant du projet Supabase (PROPOSÉ)

Consigné le 2026-10-01 à la demande d'Adrien, pour que le CTO puisse utiliser ses outils
Supabase en lecture seule (chacun exige un `project_id`).

- Projet Supabase de production : « Coach Volley », **`project_id` = `acywvbxezaoioapdmicl`**.
- Source : outil `list_projects` (lecture seule), 2026-10-01. C'est le seul projet du compte.
- Ce n'est pas un secret : l'identifiant fait partie de l'URL publique
  `https://<project_id>.supabase.co` embarquée dans l'application (`README.md`, § 2). Aucune
  clé ni aucun jeton ne doit jamais être consigné dans ce fichier.
- Le CTO n'a pas l'outil `list_projects`. Si cet identifiant est absent ou rejeté, il le signale
  au lieu de le deviner.

## Périmètre d'analyse : branches du dépôt (constat — PROPOSÉ)

Constaté le 2026-10-01 avec git, en lecture seule. L'état du code dépend de la branche lue :

- `main` (`0ca6d65`, 2026-09-20) et la branche de travail des agents
  (`claude/orvadin-agents-setup-fdqo21`, basée sur `main`) : application « Coach Volley ».
- `claude/coach-volley-app-051xnb` (distante) : 21 commits postérieurs à `main`
  (2026-09-27 et 2026-09-28), sans pull request ouverte (la PR #2 est fermée). D'après leurs
  titres : renommage du nom affiché en ORVADIN (`d66d84d`), migrations horodatées
  `2026092x_*` présentes en production (`f6c89d5` et trois commits suivants), réparation de la
  file hors ligne, session Supabase placée dans le stockage sécurisé du système.
- Tout constat technique ou produit doit dire quelle branche il décrit. Ne pas déduire de `main`
  l'état de la production.

## Technologies connues (brief d'Adrien, vérifiables dans `package.json` — PROPOSÉ)

- Expo et React Native (Expo Router)
- Supabase (base, authentification, Edge Functions, RLS)
- React Query
- Système hors ligne
- Authentification Supabase

Le CTO confirme et complète cette liste à partir du dépôt.

## À documenter par le CTO

| Sujet | Où regarder en premier | État |
|---|---|---|
| Structure de l'application (routes, composants, services, stores) | `app/`, `src/` | à documenter |
| Données et schéma | `supabase/migrations/` (0001 à 0015), `src/types/database.ts` | à documenter |
| Sécurité et RLS | `supabase/migrations/` (RLS), `scripts/check-rls.ts`, `scripts/verify-rls-production.sql` | à documenter |
| Authentification | `src/lib/supabase.ts`, `src/store/authStore.ts`, `app/(auth)/` | à documenter |
| Fonctionnement hors ligne | `src/services/offlineQueue.ts`, `src/lib/queryClient.ts` | à documenter |
| Edge Functions | `supabase/functions/` | à documenter |
| Coach IA | `src/services/aiCoachService.ts`, `src/services/aiPlanner.ts` | à documenter |
| Moteur de recommandation | `src/services/recommendationEngine.ts` | à documenter |
| Build et déploiement | `eas.json`, `app.json` | à documenter |
| Dépendances | `package.json`, `package-lock.json` | à documenter |
| Stratégie de tests | `scripts/check-*.ts`, `package.json` | à documenter (voir Q-004) |
| Cohérence iOS / Android | `app.json`, composants | à documenter |
| Dette technique | transverse | à documenter |
| Écart code / base réelle | MCP Supabase en lecture seule, si disponible | non vérifié |

## Décisions techniques

Voir `decisions.md` (domaine « technique »). Aucune décision technique n'est enregistrée à ce jour.
