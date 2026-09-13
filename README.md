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
7. `supabase/migrations/0007_exercise_media.sql` — vidéos d'exemple (liens YouTube) pour les 18 exercices d'origine — vérifie la lecture après déploiement, voir le commentaire en tête du fichier

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
npm run typecheck   # TypeScript strict, 0 erreur actuellement
npm run lint         # ESLint
```

## 6. Build (EAS)

```bash
npm install -g eas-cli
eas login
eas build --profile development --platform ios
eas build --profile development --platform android
```

Remplace `extra.eas.projectId` dans `app.json` par l'ID de ton projet EAS
(`eas init`).

---

## 7. Ce qui est réellement implémenté

| Domaine | État |
|---|---|
| Auth (inscription, connexion, mot de passe oublié, session persistée) | ✅ Fonctionnel |
| Onboarding (profil, poste, niveau, objectifs multiples) | ✅ Fonctionnel, écrit en base |
| Dashboard (XP, niveau, série, séance du jour, aperçu stats) | ✅ Fonctionnel |
| Générateur de séances (règles poste/niveau/objectif/durée) | ✅ Fonctionnel |
| Mode Entraînement (timer récupération, séries, navigation, fin de séance) | ✅ Fonctionnel |
| Bibliothèque d'exercices + filtres + détail | ✅ Fonctionnel (34 exercices seed) |
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

## 8. Variables d'environnement

Voir `.env.example`. Les variables `EXPO_PUBLIC_*` sont embarquées dans le
bundle client (normal pour Supabase). `ANTHROPIC_API_KEY` ne doit **jamais**
être préfixée `EXPO_PUBLIC_` : elle vit uniquement comme secret Supabase côté
Edge Function.

## 9. Parcours à tester manuellement

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

## 10. Prochaines étapes suggérées

- Intégration Stripe / achats intégrés pour l'offre Premium
- Connexion Apple/Google (Supabase Auth le supporte nativement, juste à activer côté dashboard + ajouter les boutons)
- `supabase gen types typescript` pour générer les types DB automatiquement une fois le schéma stabilisé
