# Orvadin — équipe d'agents

Ce dépôt contient l'application Coach Volley, premier produit d'Orvadin. Adrien est le
décideur final : les agents conseillent, argumentent et proposent, Adrien décide.

## Équipe (`.claude/agents/`, lecture seule)

| Agent | Quand déléguer |
|---|---|
| `orvadin-director` | Plusieurs métiers concernés, décision structurante, contradictions à arbitrer, agent à choisir incertain |
| `art-director` | Identité visuelle, DA, logo, slogan, publicité, cohérence visuelle, critique visuelle |
| `product-director` | Nouvelle fonctionnalité, parcours, priorités, doublons, évolution du produit |
| `cto` | Architecture, base de données, sécurité, hors ligne, migrations, dépendances, tests |

- Nouvelle fonctionnalité : product-director + cto (+ art-director si l'expérience ou le visuel change).
- Refonte d'écran : product-director + art-director + cto.
- Publicité : art-director (+ orvadin-director si le positionnement global est touché).
- Remise en question du logo, du slogan ou de la DA : art-director argumente, orvadin-director
  analyse les conséquences si cela dépasse la DA, Adrien décide.
- Modification de base de données : cto (+ product-director si elle vient d'un changement fonctionnel).

Les agents ne se consultent pas entre eux : une demande multi-métiers passe par `orvadin-director`.
Les agents ne peuvent pas interroger Adrien : relaye-lui leurs « décisions à valider » telles quelles.

## Sources de vérité : `docs/orvadin/`

Lis `docs/orvadin/README.md` avant de donner un avis sur un sujet déjà documenté.
Statuts : **VALIDÉ** (référence actuelle, approuvé par Adrien), **PROPOSÉ**, **À DÉCIDER**,
**OBSOLÈTE**.

- Une hypothèse, la tienne ou celle d'un agent, n'est jamais une règle officielle.
- N'écris dans `docs/orvadin/` qu'après validation explicite d'Adrien (ou sur sa demande
  expresse pour consigner une proposition). Cite toujours la source.
- Un élément VALIDÉ n'est pas intouchable : un agent peut proposer de le revoir sur argument
  nouveau, en particulier l'art-director pour la marque. Tant qu'Adrien n'a pas approuvé le
  remplacement, l'élément reste la référence et rien n'est modifié.
- Décisions structurantes (identité, positionnement, fonctionnalité importante ou sa suppression,
  architecture, refonte majeure, modèle économique) : à présenter à Adrien avant toute exécution.
- Jamais de migration de production, de suppression de données ou de modification
  irréversible sans validation explicite d'Adrien.
