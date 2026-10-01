# Questions ouvertes

Incertitudes structurantes et questions **À DÉCIDER** (`README.md` §6). Une question est tranchée
au niveau requis (`README.md` §3), puis marquée « Résolue par D-NNN » sans être supprimée.

---

### Q-001 — Orvadin ou « Coach Volley » dans l'application ?
- Statut : À DÉCIDER
- Date : 2026-10-01
- Domaine : marque / produit
- Niveau : 3 (marque ; identifiants publiés)
- Constat (2026-10-01, par branche) : sur `main` (`0ca6d65`), l'application s'appelle « Coach
  Volley » (`app.json` : `name`, `slug`, `scheme`, identifiants `com.coachvolley.app`), son design
  system est intitulé « Coach Volley » (`src/constants/theme.ts`) et « Orvadin » n'apparaît pas
  dans le code. Sur la branche distante non fusionnée `claude/coach-volley-app-051xnb`
  (`6f37ab8`), le commit `d66d84d` (2026-09-27) renomme le nom affiché en ORVADIN (`app.json:3` ;
  constante `APP_NAME` dans `src/constants/brand.ts:27` pour les textes) en conservant tous les
  identifiants techniques ; elle n'est ni fusionnée ni en pull request. Le brief d'Adrien désigne le produit comme « Orvadin Coach ». Le
  statut de ce renommage n'est pas décidé.
- Question : Quel est le nom du produit et de la marque affichés dans l'app, et quand l'aligner
  sur Orvadin ? Quelles parties sont concernées (nom affiché, identifiants de bundle, schéma
  d'URL, design system, textes légaux) ?
- Spécialistes concernés : art-director, product-director, cto.
- Aucune modification n'est faite tant qu'Adrien n'a pas décidé.

### Q-002 — Quels fichiers constituent le logo et le wordmark de référence, et quelles règles d'usage ?
- Statut : À DÉCIDER
- Date : 2026-10-01
- Domaine : marque
- Niveau : information à fournir par Adrien (quels fichiers portent le logo et le wordmark :
  le Director ne peut pas le déduire). Tout changement du logo ou du wordmark est de niveau 3.
- Constat : Le logo et le wordmark sont ACTUELS (D-005, D-013), mais aucun fichier source, aucune
  version, aucune règle d'usage (couleurs, typographies, zones de protection, tailles minimales)
  n'est documenté. Les visuels présents sont dans `assets/` ; aucun écran ne les affiche
  (`brand.md`).
- Question : Quels fichiers font référence, et où se trouvent les sources (vectorielles) ?
- Prochaine étape suggérée : l'art-director inventorie `assets/` et propose une fiche de
  référence, EXPÉRIMENTALE tant qu'Adrien n'a pas décidé.

### Q-003 — Modèle économique et règles d'accès
- Statut : À DÉCIDER
- Date : 2026-10-01
- Domaine : transverse
- Niveau : 3 (modèle économique et règles d'accès)
- Constat (2026-10-01, identique sur `main` et sur `claude/coach-volley-app-051xnb`) : la colonne
  `is_premium` existe (`supabase/migrations/0001_init_schema.sql:47`) et le composant `PremiumGate`
  est défini (`src/components/premium/PremiumGate.tsx:19`) ; aucun écran ne l'utilise (aucune
  occurrence de `<PremiumGate` dans `app/` et `src/`) et `package.json` ne contient aucune
  dépendance de paiement. Aucun modèle économique n'est documenté.
- Question : Quel modèle économique pour Orvadin Coach (gratuit/payant, abonnement, Premium,
  restrictions de fonctionnalités), et à quel moment le décider ?
- Spécialistes concernés : product-director, cto (paiement), art-director (parcours visible).

### Q-004 — Stratégie de tests
- Statut : À DÉCIDER
- Date : 2026-10-01
- Domaine : technique
- Niveau : à déterminer par le Director après avis du cto
- Constat (2026-10-01, `package.json`) : sur `main` (`0ca6d65`), le script `test` est `jest`,
  mais `jest` n'est dans aucune liste de dépendances et aucun fichier de test ni de configuration
  Jest n'a été trouvé. Sur `claude/coach-volley-app-051xnb` (`6f37ab8`), `test` est une chaîne
  `typecheck`, `lint` et scripts `*:check` (dont `dataflow:check`, `goals:check`, `offline:check`,
  `session:check`, absents de `main`), sans `jest`. Des vérifications par scripts existent sur les
  deux branches (`scripts/check-*.ts`).
- Question : Quelle stratégie de tests pour l'application, et que devient le script `test` ?
- Spécialiste concerné : cto.

### Q-005 — Stratégie de branches : `main` et `claude/coach-volley-app-051xnb`
- Statut : À DÉCIDER
- Date : 2026-10-01
- Domaine : technique / transverse
- Niveau : 3 (changement difficilement réversible ; touche la marque, la navigation et des
  systèmes centraux selon le choix). **Non traitée à ce stade**, à la demande d'Adrien.
- Constat (2026-10-01) : `main` (`0ca6d65`, 2026-09-20) et `claude/coach-volley-app-051xnb`
  (`6f37ab8`, 2026-09-28) divergent de 21 commits, sans pull request ouverte. La base de
  production est alignée sur la seconde pour les migrations (23 contre 15 sur `main` ; détail dans
  `architecture.md`). Aucune branche n'est considérée comme la vérité absolue (`README.md` §5.8).
- Options identifiées, **non tranchées, à ne pas appliquer** : copier sur `main` les 8 migrations
  horodatées (commits `f6c89d5`, `bb7ae93`, `a9dd462`, `1e0cd75`) avec le correctif du harnais
  `7332244` et une correction de `scripts/verify-rls-production.sql` (qui appelle une fonction
  supprimée par la migration `20260928044219`) ; ou fusionner la branche entière.
- Éléments en attente, **non décidés** : un contrôle en lecture seule de l'égalité entre les
  fichiers et le SQL appliqué pour les 8 migrations (un `SELECT`, sous garde D-014) ; le gel de
  `db push`, `db reset` et de toute nouvelle migration sur les objets concernés tant que
  l'alignement n'est pas fait.
- Spécialistes concernés : cto, product-director, art-director (le renommage ORVADIN est dans la
  branche : Q-001).

### Q-006 — Quelle branche correspond au produit réellement distribué ?
- Statut : À DÉCIDER
- Date : 2026-10-01
- Domaine : produit / technique
- Niveau : information à fournir par Adrien (classement des éléments EXISTANT, `product.md`)
- Constat (2026-10-01) : La distribution aux utilisateurs (builds EAS, TestFlight, APK) n'est pas
  documentée dans les sources lues. `eas.json` définit trois profils de build (`development`,
  `preview` en APK, `production`) sur `main` ; sur `claude/coach-volley-app-051xnb` il leur ajoute
  un `channel` de mise à jour. Aucun des deux ne dit quelle branche ou quel commit a produit les
  builds en circulation.
- Question : Quels builds sont distribués, et depuis quelle branche ou quel commit ?
- Spécialiste concerné : cto (vérification), product-director (classement).
