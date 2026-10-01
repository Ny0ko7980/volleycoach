# Identité de marque — Orvadin

Propriétaire des propositions : `art-director`. Règles d'écriture et statuts : `README.md`.
En cas de divergence, `decisions.md` fait foi.

Principe : **VALIDÉ = référence actuelle, jamais intouchable.** L'Art Director peut remettre
en question n'importe quel élément ci-dessous selon la procédure de `README.md`
(« Remettre en question une décision VALIDÉ »). Tant qu'Adrien n'a pas validé un changement,
l'élément existant reste la référence.

## Éléments de référence

| Élément | Contenu documenté | Statut | Réf. |
|---|---|---|---|
| Slogan | « Né du béton » | VALIDÉ | D-004 |
| Logo | Validé par Adrien. Fichier(s) de référence non documenté(s) | VALIDÉ | D-005, Q-002 |
| Wordmark | Validé par Adrien. Fichier(s) de référence non documenté(s) | VALIDÉ | D-005, Q-002 |
| Positionnement | Marque sportive, destinée à évoluer au-delà du volley | VALIDÉ | D-006 |
| Traits d'identité | Sportive, physique, humaine, compétitive, contemporaine | VALIDÉ | D-006 |
| Esthétiques à éviter | Esport, gaming, startup IA générique, excessivement futuriste, artificielle, cheap | VALIDÉ | D-007 |

## Non documenté (à construire par l'Art Director, en PROPOSÉ, puis validation d'Adrien)

Aucune règle n'existe dans le dépôt pour ces sujets. **Ne pas en inventer** : proposer, puis
faire valider.

- Couleurs de marque (palette, usages, accessibilité)
- Typographies
- Règles d'usage du logo (zone de protection, tailles minimales, fonds, versions)
- Système graphique et iconographie
- Photographie
- Motion design
- Identité sonore
- Ton et voix de la marque (slogan inclus)
- Publicités et contenus sociaux
- Déclinaisons physiques (cohérence numérique / physique)

## Points de contact avec le dépôt (constats, pas des règles de marque)

- Les fichiers visuels présents sont dans `assets/` : `icon.png`, `adaptive-icon.png`,
  `splash.png`, `favicon.png`, `notification-icon.png`. Lesquels portent le logo ou le
  wordmark de référence reste à confirmer (Q-002).
- Le design system de l'application est dans `src/constants/theme.ts` et s'intitule
  « Coach Volley ». Sa conformité avec la direction artistique Orvadin n'est **pas établie**.
- Sur `main` et la branche de travail, le nom affiché par l'application est « Coach Volley »
  (`app.json`) et « Orvadin » n'apparaît pas dans le code. La branche distante non fusionnée
  `claude/coach-volley-app-051xnb` affiche déjà « ORVADIN » (commit `d66d84d`, 2026-09-27).
  Statut de ce renommage : non documenté. Voir Q-001.

## Remises en question en cours

Aucune.

Format d'une remise en question : voir `README.md`. Les remises en question ouvertes sont
listées ici avec leur statut jusqu'à la décision d'Adrien ; l'élément concerné reste VALIDÉ
pendant ce temps.
