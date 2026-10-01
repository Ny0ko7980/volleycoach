# Orvadin — gouvernance et sources de vérité

Ce dossier est la mémoire documentée du projet Orvadin. Il existe pour une raison :
**qu'aucun agent n'invente progressivement des règles Orvadin.**

Adrien est le décideur final. Les agents conseillent, argumentent et proposent ;
Adrien décide (voir D-001 dans `decisions.md`).

## Fichiers

| Fichier | Contenu | Qui propose les mises à jour |
|---|---|---|
| `README.md` | Ce document : statuts, règles d'écriture, gouvernance | — (modifié seulement sur décision d'Adrien) |
| `decisions.md` | Journal des décisions, tous domaines. **Fait foi pour les statuts.** | Orvadin Director (session principale) |
| `brand.md` | Identité de marque et direction artistique | art-director |
| `product.md` | Principes et périmètre produit | product-director |
| `architecture.md` | Architecture technique constatée | cto |
| `questions-ouvertes.md` | Tout ce qui est À DÉCIDER ou non documenté | Orvadin Director (session principale) |

## Orchestration : l'Orvadin Director est la session principale

Le rôle d'Orvadin Director est tenu par la **session principale**, pas par un sous-agent
(décision D-008). Le circuit est : Adrien → Director → spécialistes (`art-director`,
`product-director`, `cto`) → synthèse du Director → Adrien. Le Director choisit lui-même les
spécialistes à consulter, récupère leurs rapports, détecte leurs désaccords et présente les
décisions structurantes à Adrien. Le protocole détaillé est dans `CLAUDE.md`. Le nom
« orvadin-director » dans les documents désigne ce rôle.

## Les quatre statuts

| Statut | Signification |
|---|---|
| **VALIDÉ** | Adrien l'a explicitement approuvé. C'est la référence de travail actuelle. |
| **PROPOSÉ** | Un agent ou Adrien l'a avancé, mais Adrien ne l'a pas encore approuvé. Ce n'est pas une règle. |
| **À DÉCIDER** | Une question est identifiée, aucune réponse n'est retenue. Elle vit dans `questions-ouvertes.md`. |
| **OBSOLÈTE** | A été remplacé ou abandonné sur décision d'Adrien. Conservé pour l'historique, jamais supprimé, avec un renvoi vers son remplaçant. |

**Une hypothèse d'agent ne devient jamais automatiquement une règle.** Seule une
approbation explicite d'Adrien fait passer une entrée à VALIDÉ. Un silence, un
« ok » ambigu ou l'exécution d'un travail ne valent pas validation.

## Qui écrit quoi

- **Les spécialistes (art-director, product-director, cto) sont en lecture seule.**
  Ils ne modifient jamais ces fichiers. Ils proposent une entrée au format ci-dessous,
  en PROPOSÉ ou À DÉCIDER, dans leur réponse.
- **La session principale (Orvadin Director)** écrit dans ces fichiers, et uniquement :
  1. après une validation explicite d'Adrien (passage à VALIDÉ, OBSOLÈTE, ou création d'une entrée VALIDÉ) ;
  2. ou pour consigner une proposition (PROPOSÉ / À DÉCIDER) qu'Adrien a demandé d'enregistrer.
- Chaque entrée cite sa **source** : message d'Adrien (avec date), fichier du dépôt
  (`chemin:ligne`), ou agent à l'origine de la proposition. Pas de source, pas d'entrée.
- En cas de divergence entre `decisions.md` et un autre fichier, **`decisions.md` fait foi**.
- Quand une information manque, on écrit « non documenté » et on ouvre une question
  dans `questions-ouvertes.md`. On ne comble pas le vide par une règle plausible.

## Format d'une entrée

```
### D-NNN — Titre court
- Statut : VALIDÉ | PROPOSÉ | À DÉCIDER | OBSOLÈTE
- Date : AAAA-MM-JJ
- Domaine : gouvernance | marque | produit | technique | transverse
- Décision : ce qui est retenu (ou proposé)
- Raison : pourquoi
- Source : message d'Adrien du …, chemin/fichier:ligne, ou agent
- Réversibilité : réversible | structurante
- Remplace : D-NNN (optionnel)   Remplacé par : D-NNN (optionnel)
```

Identifiants : `D-` décisions, `Q-` questions ouvertes. Ils ne sont jamais réutilisés.

## Décisions réversibles et décisions structurantes

Une décision est **structurante** si elle touche l'un de ces sujets :

- l'identité d'Orvadin ou le positionnement de la marque ;
- une fonctionnalité importante, ou la suppression d'une fonctionnalité ;
- une modification importante de l'architecture, ou une refonte majeure ;
- le modèle économique ;
- une action irréversible (migration de production, suppression de données).

Une décision structurante est **présentée à Adrien avant toute exécution**. Aucun agent
ne la tranche seul. Les autres décisions sont réversibles : un agent peut les
recommander, en signalant leur caractère réversible.

## Remettre en question une décision VALIDÉ

Une décision VALIDÉ est la **référence actuelle** d'Orvadin. Elle n'est **jamais
intouchable**. Un agent peut proposer de la revoir s'il dispose d'un argument nouveau,
d'un problème identifié ou d'une information nouvelle.

Tant qu'Adrien n'a pas approuvé le remplacement :

- la décision reste **VALIDÉ** et reste la référence de travail ;
- **aucune modification** n'est effectuée, ni dans le code, ni dans les documents,
  ni dans les supports ;
- l'agent continue de travailler avec la décision en vigueur.

Si Adrien refuse la proposition, la décision reste VALIDÉ et l'agent ne la remet pas
en cause sans nouvel argument concret.

Si Adrien accepte, l'ancienne entrée passe à OBSOLÈTE (avec « Remplacé par »), la
nouvelle est créée en VALIDÉ (avec « Remplace »), et seulement alors l'exécution
peut commencer.

### Droit explicite de l'Art Director sur les éléments de marque

Le statut VALIDÉ du logo, du wordmark, du slogan « Né du béton » et des autres éléments
de marque signifie qu'ils sont la **référence actuelle d'Orvadin**. Il ne signifie
**jamais** qu'ils sont intouchables.

**L'Art Director a explicitement le droit, et le devoir, de remettre en question un
élément VALIDÉ de la marque** lorsqu'il identifie un problème artistique, stratégique,
fonctionnel ou d'usage concret. Il ne défend pas une décision au seul motif qu'elle a
été validée.

Dans ce cas, il présente à Adrien :

1. le problème identifié ;
2. les raisons ;
3. les usages concernés ;
4. les conséquences pour la marque ;
5. ce qu'il conserverait ;
6. ce qu'il modifierait ;
7. les alternatives pertinentes.

Il précise aussi si le problème est ponctuel ou structurel. Il ne modifie jamais de sa
propre initiative un élément fondamental. Si le changement dépasse la direction
artistique (positionnement, produit, technique), l'Orvadin Director en analyse les
conséquences globales. Adrien décide.

Cette règle s'applique quel que soit le contexte de la session.

## Qui consulter

| Demande | Agents |
|---|---|
| Nouvelle fonctionnalité | product-director + cto ; art-director si l'expérience ou le visuel change |
| Refonte d'écran | product-director + art-director + cto |
| Publicité, contenu social | art-director ; Orvadin Director si le positionnement global est touché |
| Remise en question du slogan, du logo ou de la DA | art-director argumente ; Orvadin Director analyse les conséquences si cela dépasse la DA ; Adrien décide |
| Modification de base de données | cto ; product-director si elle résulte d'un changement fonctionnel |
| Décision touchant plusieurs métiers | Orvadin Director coordonne ; Adrien décide |

Le Director (session principale) détermine lui-même les spécialistes à consulter : Adrien
n'a pas à les choisir.
