# Coach Volley 🏐

Application mobile complète (iOS/Android) de coaching volley-ball : profil joueur,
génération de séances personnalisées, bibliothèque d'exercices, statistiques,
progression, Coach IA, gamification, notifications, mode hors-ligne partiel.

**Stack** : Expo + React Native + TypeScript strict (Expo Router) · Supabase
(Postgres + Auth + Storage + Edge Functions + RLS) · Zustand · React Query ·
react-native-chart-kit.

Ce projet n'est **pas une maquette** : chaque écran lit/écrit réellement dans
Supabase, l'authentification est fonctionnelle, le générateur de séances et le
Coach IA fonctionnent de bout en bout dès l'installation (voir section Coach IA).

---

## 1. Prérequis

- Node.js 18+
- Un compte [Supabase](https://supabase.com) (gratuit) — ou la [CLI Supabase](https://supabase.com/docs/guides/cli) pour du développement local
- Expo Go (test rapide) ou Xcode/Android Studio (build natif)

## 2. Installation

```bash
npm install
cp .env.example .env
```

Remplis `.env` avec les valeurs de ton projet Supabase (Project Settings → API) :

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

> La clé `anon` est publique par design (c'est le fonctionnement normal de
> Supabase) : la sécurité réelle vient des policies **Row Level Security**
> appliquées à chaque table (voir `supabase/migrations/0002_rls_policies.sql`),
> pas du secret de la clé.

## 3. Base de données Supabase

Depuis le dashboard Supabase → SQL Editor, exécute dans l'ordre :

1. `supabase/migrations/0001_init_schema.sql` — 13 tables + relations + triggers
2. `supabase/migrations/0002_rls_policies.sql` — policies RLS (isolation stricte par joueur)
3. `supabase/migrations/0003_seed_data.sql` — 18 exercices + 9 badges de départ
4. `supabase/migrations/0004_team_management.sql` — code d'invitation équipe + fonctions `create_team_as_coach`/`join_team_by_code`/`leave_team`
5. `supabase/migrations/0005_security_hardening.sql` — verrouille `role`/`is_premium` (non modifiables par un joueur, même via API directe) + déplace le calcul XP/série/badges côté serveur (`apply_session_rewards()`)
6. `supabase/migrations/0006_more_exercises.sql` — 16 exercices supplémentaires (34 au total)
7. `supabase/migrations/0007_exercise_media.sql` — vidéos d'exemple (liens YouTube) — **annulée par la migration 0010**, voir ci-dessous
8. `supabase/migrations/0008_exercise_library_schema.sql` — colonnes de la bibliothèque enrichie (catégorie, niveaux, compétences, effectif, intensité, charges, consignes détaillées, progressions/régressions, tags), ajoutées en optionnel
9. `supabase/migrations/0009_exercise_library_seed.sql` — bibliothèque de 300 exercices (fichier **généré**, voir ci-dessous)
10. `supabase/migrations/0010_remove_exercise_media.sql` — retire les vidéos de la 0007 : plusieurs interdisaient l'intégration (erreur 152), ce qui affichait un cadre d'erreur dans la fiche
11. `supabase/migrations/0011_training_personalization.sql` — entraînements personnalisés : préférences du joueur, ressenti par exercice et par séance, scores de compétence, signaux de compétence

### Vidéos d'exercice

Aucun exercice n'a de vidéo par défaut. Le lecteur et le champ « Lien vidéo »
de l'admin restent en place : renseigne un lien dans Profil → Administration →
Exercices pour qu'une vidéo apparaisse dans la fiche.

Deux formats acceptés :

- **Fichier vidéo direct** (Supabase Storage, par exemple) — lecture native,
  aucune restriction. C'est l'option fiable.
- **Lien YouTube** — vérifie d'abord que la vidéo autorise l'intégration en
  ouvrant `https://www.youtube.com/embed/<id>` dans un navigateur. Si tu vois
  une erreur 150, 152 ou 153, son propriétaire l'interdit et elle ne pourra pas
  être lue dans l'app.

### Bibliothèque d'exercices

Les 300 exercices sont écrits en TypeScript, pas en SQL : `src/data/exercises/`
contient un fichier par catégorie (réception, défense, passe, attaque, service,
bloc, déplacements, détente, renforcement, mobilité, lecture du jeu,
échauffement) et un `index.ts` qui les agrège. C'est la source de vérité.

```bash
npm run exercises:check   # valide la bibliothèque (échoue en listant chaque problème)
npm run exercises:build   # régénère supabase/migrations/0009_exercise_library_seed.sql
```

`exercises:check` vérifie le total (300), les effectifs par catégorie, les
identifiants et noms dupliqués, les champs obligatoires, les valeurs
d'énumérations, la cohérence `playersMin`/`playersMax`, les charges, la
cohérence solo/ballon, et détecte les exercices trop proches par le nom ou la
description. Ajoute `-- --partial` pour tolérer une bibliothèque en cours
d'écriture.

Le fichier `0009_exercise_library_seed.sql` est **généré** : ne le modifie
jamais à la main, édite le TypeScript et relance `npm run exercises:build`.
L'insertion est idempotente (upsert sur `slug`) et n'efface rien : les exercices
déjà en base portant le même nom sont enrichis sur place, ce qui préserve
l'historique des séances déjà réalisées (`workout_exercises` référence
`exercises` en `on delete restrict`).

### Devenir administrateur

Aucun compte n'est admin par défaut (et un joueur ne peut plus se
l'auto-attribuer depuis la migration 0005). Pour donner les droits admin à
ton propre compte après inscription, exécute dans le SQL Editor Supabase :

```sql
update public.player_profiles set role = 'admin' where id = '<uuid-de-ton-compte>';
```

(Récupère ton UUID dans Authentication → Users.) Le bouton "⚙️ Administration"
apparaît alors dans l'onglet Profil.

Ou, avec la CLI Supabase liée à ton projet :

```bash
supabase link --project-ref <ton-project-ref>
supabase db push
```

### Auth

Dans Authentication → Providers, l'auth email/mot de passe est activée par
défaut. `supabase/config.toml` désactive la confirmation email pour aller vite
en développement — réactive-la en production (`enable_confirmations = true`).
Un trigger (`handle_new_user`) crée automatiquement une ligne
`player_profiles` à l'inscription.

### Edge Function — Coach IA

```bash
supabase functions deploy ai-coach
# Optionnel : améliore la qualité des réponses en connectant un vrai LLM
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxx
```

**Sans clé configurée**, le Coach IA fonctionne quand même : il utilise un
moteur de règles volleyball embarqué (`supabase/functions/ai-coach/rulesEngine.ts`)
qui couvre réception, service, attaque, bloc, détente, défense, exercices
maison, conseils par poste, et redirige systématiquement vers un professionnel
de santé en cas de mention de douleur/blessure. **Avec la clé**, les mêmes
garde-fous s'appliquent mais les réponses passent par l'API Anthropic avec le
contexte complet du joueur (profil, statistiques récentes, séances récentes)
construit côté serveur.

## 4. Lancer l'application

```bash
npm start        # Metro + QR code (Expo Go)
npm run ios      # simulateur iOS
npm run android  # émulateur Android
```

## 5. Commandes utiles

```bash
npm run typecheck        # TypeScript strict
npm run lint             # ESLint
npm run exercises:check  # valide les 300 exercices de la bibliothèque
npm run exercises:build  # régénère la migration 0009 depuis src/data/exercises
npm run engine:check     # vérifie le comportement du moteur de recommandation
npm run coach:check      # vérifie le routage des réponses du Coach IA
```

## 6. Entraînements personnalisés

Deux parcours partent de l'écran Entraînement, sous « Que veux-tu faire aujourd'hui ? » :

- **Séance recommandée** — VolleyCoach choisit quoi travailler à partir du profil du joueur, de son historique et de ses retours, puis annonce la séance et, quand une donnée le justifie, la raison de ce choix.
- **Choisir mon entraînement** — le joueur impose la compétence, la durée, l'intensité et le matériel. La séance passe par le **même moteur** : son poste, son niveau et ses ressentis continuent d'écarter les exercices inadaptés.

### L'axe de compétence

Les scores et la recommandation raisonnent sur les **12 catégories d'exercices** (`exercises.category`) : réception, défense, passe, attaque, service, bloc, déplacements, détente, renforcement, mobilité, lecture du jeu, échauffement. C'est volontaire — une compétence désigne ainsi toujours un ensemble d'exercices réellement présents en bibliothèque, sans table de correspondance à maintenir.

Le champ `exercises.skills` (246 valeurs libres : « plateforme », « pas chassés »…) reste descriptif et sert à l'anti-doublon, pas au score : il est trop fin pour ça.

### Découpage

| Fichier | Rôle | Accès réseau |
|---|---|---|
| `src/services/recommendationEngine.ts` | Décide quoi travailler, à quelle intensité, à quelle difficulté | Aucun (fonction pure) |
| `src/services/trainingContextService.ts` | Assemble le contexte du joueur | Oui |
| `src/services/workoutService.ts` | Choisit les exercices et crée la séance | Oui |
| `src/services/skillScoring.ts` | Calcule les scores de compétence | Aucun (fonction pure) |
| `src/services/skillScoreService.ts` | Lit et enregistre les scores | Oui |
| `src/services/feedbackService.ts` | Ressentis et signaux de compétence | Oui |
| `src/services/aiPlanner.ts` | Point de branchement d'une IA | Selon l'implémentation |

Le moteur étant pur, `npm run engine:check` lui soumet des contextes construits à la main et vérifie ses garanties.

### Adaptation

Après chaque exercice, le joueur indique s'il l'a trouvé trop facile, adapté, difficile ou impossible. En fin de séance, trois échelles : fatigue, difficulté globale, satisfaction.

Ces retours agissent ainsi :

- **Difficulté** — bornée à ±1 point autour de la difficulté de base du niveau, jamais davantage : la progression se fait par paliers. Un « impossible » pèse quatre fois plus lourd qu'un « trop facile », pour ne jamais enfermer un joueur dans des exercices hors de portée.
- **Priorité** — une compétence signalée faible remonte, avec une décroissance de moitié tous les 21 jours : un point faible corrigé cesse d'orienter les séances.
- **Variété** — ce qui vient d'être travaillé passe derrière.
- **Fatigue** — une fatigue moyenne ≥ 4 sur les 7 derniers jours ramène l'intensité au plus bas et supprime le bloc physique.

### Scores de compétence

Ce ne sont **pas** des mesures de niveau : ils résument les séances, les ressentis et les statistiques déjà enregistrées. En dessous de trois observations pour une compétence, l'app annonce qu'il manque des données au lieu d'afficher un chiffre — c'est `sample_size` qui le garantit, pas une convention d'affichage.

### Préparation de l'analyse vidéo

La table `skill_signals` est le point d'entrée unique de tout ce qui peut désigner une compétence comme faible ou forte, avec sa source (`feedback`, `session`, `statistic`, `video`, `coach`, `manual`). Le moteur ne lit qu'elle.

Brancher l'analyse vidéo plus tard consistera donc à appeler `recordSkillSignal({ skill: "reception", source: "video", direction: "weakness", note: "plateforme instable" })` — sans toucher au moteur ni au générateur de séance.

### Place de l'IA

`aiPlanner.ts` définit un contrat volontairement étroit : l'IA reçoit des exercices **déjà sélectionnés** par la logique déterministe et ne peut que les réordonner ou en écarter. La garantie qu'elle n'invente pas d'exercice ne repose pas sur la consigne donnée au modèle mais sur le code : `refineSelection` filtre la réponse contre la liste de candidats et ignore tout identifiant inconnu.

Aucun planificateur n'est branché aujourd'hui ; toute anomalie (absence d'IA, erreur réseau, réponse vide) ramène à la sélection déterministe. L'application fonctionne à l'identique sans IA.

## 7. Build (EAS)

```bash
npm install -g eas-cli
eas login
eas init                 # crée le projet EAS et écrit extra.eas.projectId
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Diffuser une bêta sur TestFlight (iOS)

Prérequis : un compte **Apple Developer Program** payant (99 €/an). Le compte
gratuit ne permet pas TestFlight.

Les variables `EXPO_PUBLIC_*` vivent dans `.env`, qui n'est pas versionné : le
build EAS tourne sur un serveur distant et ne les verrait pas. Il faut donc les
déclarer une fois sur EAS.

```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL      --value "https://<ref>.supabase.co" --visibility plaintext --environment production
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<clé anon>"                --visibility plaintext --environment production

eas build --profile production --platform ios
eas submit --profile production --platform ios --latest
```

`eas build` demande les identifiants Apple et génère lui-même le certificat de
distribution et le profil de provisioning. `eas submit` envoie le `.ipa` sur
App Store Connect et crée la fiche de l'app si elle n'existe pas encore.

Ensuite, sur [App Store Connect](https://appstoreconnect.apple.com) → onglet
**TestFlight** :

- **Testeurs internes** (jusqu'à 100, membres de l'équipe Apple) : disponible
  dès la fin du traitement du build, sans revue.
- **Testeurs externes** (jusqu'à 10 000, par lien public) : nécessite une
  **Beta App Review** d'Apple (généralement < 24 h) et un compte de test
  fonctionnel à fournir, la connexion étant obligatoire dans l'app.

Notes de configuration liées à la soumission :

- `ITSAppUsesNonExemptEncryption: false` est déclaré dans `app.json` : l'app
  n'utilise que HTTPS. Sans cette clé, App Store Connect repose la question de
  conformité export à chaque build et bloque la diffusion.
- Aucun `UIBackgroundModes` n'est déclaré : les notifications sont **locales**
  (`expo-notifications`), pas des push distantes. Déclarer un mode
  d'arrière-plan non utilisé expose à un refus en revue.
- `appVersionSource: "remote"` + `autoIncrement` : EAS gère le `buildNumber`.
  Pour une nouvelle version publique, incrémente `expo.version` dans
  `app.json` (ex. `1.0.1`).
- Le projet n'embarque pas `expo-updates` : chaque correction demande un
  nouveau build. Pour livrer des correctifs JS sans repasser par TestFlight,
  il faudrait ajouter EAS Update.

---

## 8. Ce qui est réellement implémenté

| Domaine | État |
|---|---|
| Auth (inscription, connexion, mot de passe oublié, session persistée) | ✅ Fonctionnel |
| Onboarding (profil, poste, niveau, objectifs multiples) | ✅ Fonctionnel, écrit en base |
| Dashboard (XP, niveau, série, séance du jour, aperçu stats) | ✅ Fonctionnel |
| Générateur de séances (règles poste/niveau/objectif/durée) | ✅ Fonctionnel |
| Séance recommandée (profil, historique, ressentis, fatigue) | ✅ Fonctionnel |
| Choisir mon entraînement (compétence, durée, intensité, matériel) | ✅ Fonctionnel |
| Ressenti par exercice + fin de séance (fatigue, difficulté, satisfaction) | ✅ Fonctionnel |
| Adaptation des séances suivantes (difficulté par paliers, priorité des points faibles) | ✅ Fonctionnel |
| Scores par compétence | ✅ Fonctionnel — indicateurs internes, masqués sous 3 observations |
| IA dans la recommandation | ⚠️ Architecture prête (`aiPlanner.ts`), aucun modèle branché : la logique déterministe fait tout le travail |
| Analyse vidéo | ⚠️ Architecture prête (table `skill_signals`), détection non développée |
| Mode Entraînement (timer récupération, séries, navigation, fin de séance) | ✅ Fonctionnel |
| Bibliothèque d'exercices + filtres + détail | ✅ Fonctionnel (300 exercices) |
| Journal d'entraînement | ✅ Fonctionnel |
| Statistiques (6 catégories, graphiques) + ajout manuel | ✅ Fonctionnel |
| Progression (scores internes, objectifs actifs, évolution semaine/mois) | ✅ Fonctionnel |
| Objectifs personnels (création, suivi, atteinte automatique) | ✅ Fonctionnel |
| Coach IA (chat persisté, contexte joueur, Edge Function) | ✅ Fonctionnel (fallback sans clé LLM) |
| Gamification (XP, niveaux, séries, 9 badges) | ✅ Fonctionnel |
| Profil joueur (fiche, édition, badges) | ✅ Fonctionnel |
| Notifications locales (rappel quotidien, série, objectif, badge) | ✅ Fonctionnel (expo-notifications) |
| Mode hors-ligne (cache exercices, file d'attente fin de séance) | ⚠️ Partiel — cache lecture + file d'attente d'écriture simple, pas de résolution de conflits |
| RLS Supabase (isolation stricte par joueur) | ✅ Fonctionnel |
| Équipe / Club | ✅ Fonctionnel (v1 simplifiée) : un joueur crée une équipe (devient coach), partage un code d'invitation, les autres rejoignent avec ce code ; le coach consulte le roster (poste/niveau/série) |
| Interface admin | ✅ Fonctionnel : statistiques globales, gestion complète des exercices (créer/modifier/supprimer) et gestion des utilisateurs (liste + changement de rôle), accès verrouillé côté base de données à `role='admin'` |
| Monétisation Premium | ⚠️ Architecture prête (`is_premium`, composant `PremiumGate`), aucun paiement réel (comme demandé) |

Tout bouton présent dans l'app déclenche une action réelle (navigation, appel
Supabase, mutation). Aucun écran factice.

## 9. Variables d'environnement

Voir `.env.example`. Les variables `EXPO_PUBLIC_*` sont embarquées dans le
bundle client (normal pour Supabase). `ANTHROPIC_API_KEY` ne doit **jamais**
être préfixée `EXPO_PUBLIC_` : elle vit uniquement comme secret Supabase côté
Edge Function.

## 10. Parcours à tester manuellement

1. **Inscription** → email/mot de passe → redirection automatique vers l'onboarding.
2. **Onboarding** complet (poste central, niveau intermédiaire, objectifs "détente" + "attaque") → vérifier l'arrivée sur le Dashboard avec le bon objectif affiché.
3. **Dashboard** : une séance recommandée doit apparaître, générée pour l'objectif principal.
4. **Démarrer une séance** → Mode Entraînement → parcourir les séries (Suivant/Précédent), laisser le timer de récupération s'écouler, terminer la séance → vérifier XP + série incrémentés sur le Dashboard, et le badge "Première séance" débloqué.
5. **Bibliothèque d'exercices** : filtrer par poste "Libéro" + objectif "Réception" → vérifier que les résultats correspondent.
6. **Statistiques** : ajouter 2 mesures de détente (ex: 45cm puis 48cm) → le graphique doit apparaître dans l'onglet Statistiques et le score de la catégorie "Physique" évoluer dans Progression.
7. **Objectifs** : créer un objectif "Détente" cible 50cm, actuel 45cm → vérifier la barre de progression à 90%.
8. **Coach IA** : poser "Comment améliorer ma réception ?" → réponse contextualisée au poste/niveau ; poser une question mentionnant "j'ai mal à l'épaule" → vérifier que la réponse redirige vers un professionnel de santé.
9. **Profil** : modifier le club et le niveau → vérifier la persistance après redémarrage de l'app.
10. **Notifications** : activer les notifications dans Réglages → vérifier la demande de permission système puis la programmation du rappel quotidien.
11. **Déconnexion / reconnexion** : vérifier que la session est bien restaurée sans repasser par l'onboarding.
12. **Hors-ligne** : couper le réseau, ouvrir la bibliothèque d'exercices (doit afficher le cache), terminer une séance (doit s'enregistrer en file d'attente locale), reconnecter le réseau et vérifier la synchronisation.
13. **Équipe** : sur un 2ᵉ compte, créer une équipe (Profil → Mon équipe → Créer) → noter le code affiché. Sur le 1ᵉʳ compte, rejoindre avec ce code. Retourner sur le compte coach → le joueur doit apparaître dans le roster avec son poste/niveau/série.
14. **Admin** : passer un compte en `role='admin'` via SQL (voir ci-dessus) → le bouton "⚙️ Administration" apparaît dans Profil → créer un nouvel exercice, vérifier qu'il apparaît dans la bibliothèque d'exercices, le modifier, puis le supprimer.
15. **Admin — utilisateurs** : Administration → Gérer les utilisateurs → changer le rôle d'un autre compte de "Joueur" à "Coach" → vérifier la mise à jour immédiate du badge de rôle.

## 11. Prochaines étapes suggérées

- Intégration Stripe / achats intégrés pour l'offre Premium
- Connexion Apple/Google (Supabase Auth le supporte nativement, juste à activer côté dashboard + ajouter les boutons)
- `supabase gen types typescript` pour générer les types DB automatiquement une fois le schéma stabilisé
