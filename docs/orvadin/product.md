# Produit — Orvadin Coach

Propriétaire des propositions : `product-director`. Écriture : le Director seul (`README.md` §5).
Statuts d'éléments : **EXISTANT / DÉCIDÉ / ENVISAGÉ** (définitions : `README.md` §4.2).

Un élément EXISTANT est toujours qualifié par la branche ou le commit sur lequel il a été vérifié,
et par la date de la vérification. Un élément ENVISAGÉ n'est jamais transformé en exigence.

## Direction (DÉCIDÉ)

- **Orvadin est une marque destinée à évoluer au-delà du volley** — DÉCIDÉ (D-006). Sa
  traduction précise (quels produits, quels sports) n'est pas décidée et évoluera avec les futures
  applications.

## Pistes (ENVISAGÉ)

- Évolution vers d'**autres produits** et **potentiellement d'autres sports** : piste future issue
  du brief d'Adrien du 2026-10-01. Aucun produit ni sport précis n'est décidé ; cela n'oblige à
  rien.

## EXISTANT

**Aucun élément n'est encore classé EXISTANT.** Le classement exige une vérification par branche
(code, puis base pour ce qui relève des données), à mener par le product-director et le cto. Le
`README.md` du dépôt est une documentation historique (section 8, « Ce qui est réellement
implémenté ») : il n'est pas une preuve et ne suffit pas à classer un élément EXISTANT. Savoir
quelle branche correspond au produit réellement distribué aux utilisateurs relève de Q-006 ; cela
ne bloque pas un classement EXISTANT qualifié par branche.

## Éléments hérités du brief, non vérifiés (PROPOSÉ — ne pas reclasser sans vérification)

Ces éléments décrivent le produit tel que l'a présenté Adrien le 2026-10-01. Ils ne sont ni
EXISTANT, ni DÉCIDÉ :

- Premier produit en développement : application d'entraînement de volley (Orvadin Coach).
- L'application comprend notamment :
  - génération de séances personnalisées ;
  - bibliothèque de plus de 300 exercices ;
  - personnalisation selon poste, niveau, durée et objectifs ;
  - suivi de progression ;
  - XP, niveaux, séries, objectifs ;
  - coach IA ;
  - fonctionnalités équipes et clubs, en développement.

## Principes produit

Aucun principe produit n'est DÉCIDÉ à ce jour (hors la direction ci-dessus). Le product-director
propose ; le Director consigne selon le niveau de la décision (`README.md` §3).

## À documenter (non documenté)

- Problème utilisateur adressé par chaque grande fonctionnalité
- Parcours principaux et parcours à simplifier
- Priorités
- Doublons et complexité à retirer
- Principes de généralisation au-delà du volley
- Place de l'IA dans le produit
- Rôle des équipes et des clubs
- Vérification de l'EXISTANT, par branche

Le modèle économique et les règles d'accès (gratuit/payant, Premium) relèvent du niveau 3 : voir
Q-003.
