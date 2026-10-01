# Identité de marque — Orvadin

Propriétaire des propositions : `art-director`. Écriture : le Director seul (`README.md` §5).
Statuts d'éléments : **VERROUILLÉ / ACTUEL / EXPÉRIMENTAL** (définitions : `README.md` §4.3).

L'identité d'Orvadin continue d'évoluer : **un choix actuel n'est pas une règle permanente.** Un
élément n'est VERROUILLÉ que sur décision explicite d'Adrien. Pour faire évoluer l'identité
principale, l'Art Director suit la procédure renforcée du `README.md` §10.2 (niveau 3).

## Éléments d'identité

| Élément | Contenu documenté | Statut | Réf. |
|---|---|---|---|
| Logo (identité principale) | Validé par Adrien. Fichier(s) de référence non documenté(s) | ACTUEL | D-005, D-013, Q-002 |
| Wordmark (identité principale) | Validé par Adrien. Fichier(s) de référence non documenté(s) | ACTUEL | D-005, D-013, Q-002 |
| Slogan (identité principale) | « Né du béton » | ACTUEL | D-004, D-013 |
| Positionnement | Marque sportive destinée à évoluer au-delà du volley. Direction décidée, traduction précise à venir | ACTUEL | D-006, D-013 |
| Traits d'identité | Sportive, physique, humaine, compétitive, contemporaine | ACTUEL | D-006, D-013 |
| Esthétiques à éviter | Esport, gaming, startup IA générique, excessivement futuriste, artificielle, cheap. Contrainte actuelle, révisable | ACTUEL | D-007, D-013 |
| Direction béton, impacts, mouvement sportif | Piste de travail, non verrouillée | EXPÉRIMENTAL | D-013 (classement initial) |
| Signature sonore | Piste de travail ; aucune signature n'est décidée | EXPÉRIMENTAL | D-013 (classement initial) |

**Aucun élément n'est VERROUILLÉ.**

Identité principale : liste au `README.md` §10.2. Les couleurs principales et la typographie
principale ne sont pas documentées (voir ci-dessous).

## Non documenté

Aucune règle n'existe dans le dépôt pour ces sujets. **Ne pas en inventer.** Toute proposition de
l'art-director sur ces sujets est **EXPÉRIMENTALE** tant qu'Adrien n'a pas décidé ; elle n'est
jamais présentée comme une règle.

- Couleurs principales (palette, usages, accessibilité)
- Typographie principale
- Règles d'usage du logo (zone de protection, tailles minimales, fonds, versions)
- Système graphique et iconographie
- Photographie
- Motion design
- Identité sonore au-delà de la piste de travail
- Ton et voix de la marque (slogan inclus)
- Publicités et contenus sociaux
- Déclinaisons physiques (cohérence numérique / physique)

Tant que les couleurs principales et la typographie principale ne sont pas documentées, le thème
de l'application (`src/constants/theme.ts`) n'est pas établi comme couleurs ou typographie de
marque, et toute modification de sa palette ou de ses polices est traitée comme touchant
l'identité principale : **niveau 3**, par la règle du doute (`README.md` §3.3).

## Constats sur le dépôt (par branche, 2026-10-01 — pas des règles de marque)

- **Fichiers visuels** (identiques octet pour octet sur `main` et sur
  `claude/coach-volley-app-051xnb` : même empreinte git) : `assets/icon.png`, `adaptive-icon.png`,
  `splash.png`, `favicon.png`, `notification-icon.png`. Lesquels portent le logo ou le wordmark de référence reste à confirmer
  (Q-002). Aucun fichier de wordmark ni source vectorielle n'a été trouvé.
- **Aucun écran n'affiche ces fichiers** : aucun `<Image>` ni `require` d'asset dans `app/` et
  `src/`, sur `main` (`0ca6d65`) comme sur `claude/coach-volley-app-051xnb` (`6f37ab8`) (recherche
  par motif). Le logo n'apparaît qu'au niveau système (icône, écran de démarrage, favicon,
  notification).
- **Thème :** `src/constants/theme.ts` définit un thème clair et un thème sombre ; `useAppTheme`
  renvoie toujours le thème sombre sur les deux branches. Sa conformité avec la direction
  artistique Orvadin n'est pas établie.
- **Nom affiché :** sur `main`, « Coach Volley » (`app.json`), « Orvadin » n'apparaît pas dans le
  code. Sur `claude/coach-volley-app-051xnb`, « ORVADIN » (`app.json:3`, et la
  constante `APP_NAME` de `src/constants/brand.ts:27` pour les textes affichés ; commit `d66d84d`,
  2026-09-27), identifiants techniques inchangés.
  Statut de ce renommage : non décidé (Q-001).

## Remises en question en cours

Aucune.
