# Questions ouvertes

Tout ce qui est **À DÉCIDER** ou non documenté. Règles d'écriture et statuts : `README.md`.
Une question n'est jamais résolue par un agent : elle est tranchée par Adrien, puis sortie de ce
fichier vers `decisions.md` (la question est alors marquée « Résolue par D-NNN »).

---

### Q-001 — Orvadin ou « Coach Volley » dans l'application ?
- Statut : À DÉCIDER
- Date : 2026-10-01
- Domaine : marque / produit
- Constat (corrigé le 2026-10-01 après examen des branches distantes) : sur `main` et sur la
  branche de travail, l'application s'appelle « Coach Volley » (`app.json` : `name`, `slug`,
  `scheme`, identifiants `com.coachvolley.app`), son design system est intitulé « Coach Volley »
  (`src/constants/theme.ts`) et « Orvadin » n'apparaît pas dans le code. En revanche, la branche
  distante non fusionnée `claude/coach-volley-app-051xnb` contient le commit `d66d84d`
  (2026-09-27) qui renomme le nom affiché en ORVADIN via `APP_NAME` (`src/constants/brand.ts`)
  en conservant tous les identifiants techniques. Elle n'est ni fusionnée ni en pull request.
  Le brief d'Adrien désigne le produit comme « Orvadin Coach ». Le statut de ce renommage n'est
  pas documenté : il n'est pas VALIDÉ.
- Question : Quel est le nom du produit et de la marque affichés dans l'app, et quand
  l'aligner sur Orvadin ? Quelles parties sont concernées (nom affiché, identifiants de
  bundle, schéma d'URL, design system, textes légaux) ?
- Nature : structurante (identité, et identifiants de bundle difficiles à changer après publication).
- Agents à consulter : Orvadin Director (coordination), art-director, product-director, cto.
- Aucune modification n'est faite tant qu'Adrien n'a pas décidé.

### Q-002 — Quels fichiers constituent le logo et le wordmark de référence, et quelles règles d'usage ?
- Statut : À DÉCIDER
- Date : 2026-10-01
- Domaine : marque
- Constat : Logo et wordmark sont VALIDÉS (D-005) mais aucun fichier source, aucune version,
  aucune règle d'usage (couleurs, typographies, zones de protection, tailles minimales) n'est
  documenté. Les visuels présents sont dans `assets/`.
- Question : Quels fichiers font référence, et où se trouvent les sources (vectorielles) ?
- Prochaine étape suggérée : l'art-director inventorie `assets/` et propose une fiche de
  référence en PROPOSÉ ; Adrien valide.

### Q-003 — Modèle économique
- Statut : À DÉCIDER
- Date : 2026-10-01
- Domaine : transverse
- Constat : Le dépôt contient une architecture Premium (`is_premium`, composant `PremiumGate`)
  sans paiement réel (`README.md`, section 8). Aucun modèle économique n'est documenté.
- Question : Quel modèle économique pour Orvadin Coach, et à quel moment le décider ?
- Nature : structurante. Aucun agent ne la tranche seul.

### Q-004 — Stratégie de tests
- Statut : À DÉCIDER
- Date : 2026-10-01
- Domaine : technique
- Constat (à vérifier par le CTO) : `package.json` déclare `"test": "jest"`, mais `jest` n'est
  pas dans les dépendances et aucun fichier de test ni de configuration Jest n'a été trouvé
  à l'installation. Des vérifications par scripts existent (`scripts/check-*.ts`,
  `exercises:check`, `engine:check`, `coach:check`, `rls:check`).
- Question : Quelle stratégie de tests pour l'application, et que devient le script `test` ?
- Agent à consulter : cto.
