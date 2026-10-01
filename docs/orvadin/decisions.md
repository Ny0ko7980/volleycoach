# Journal des décisions

Fait foi pour les statuts. Règles d'écriture et format : voir `README.md`.
D-001 à D-007 proviennent du brief d'installation d'Adrien (2026-10-01). D-008 date de sa
décision du même jour, prise après le premier test de fonctionnement des agents.
Aucune autre décision n'est enregistrée à ce jour.

---

### D-001 — Adrien est le décideur final
- Statut : VALIDÉ
- Date : 2026-10-01
- Domaine : gouvernance
- Décision : Les agents conseillent, argumentent et proposent. Adrien prend les décisions
  finales, en particulier les décisions structurantes.
- Raison : Éviter que des agents orientent seuls l'identité, le produit ou la technique d'Orvadin.
- Source : Message d'Adrien, 2026-10-01 (brief d'installation des agents)
- Réversibilité : structurante

### D-002 — Les décisions structurantes sont présentées à Adrien avant exécution
- Statut : VALIDÉ
- Date : 2026-10-01
- Domaine : gouvernance
- Décision : Aucun agent ne tranche seul une décision touchant l'identité ou le positionnement
  d'Orvadin, une fonctionnalité importante, une suppression de fonctionnalité, une modification
  importante de l'architecture, une refonte majeure ou le modèle économique. Le CTO ne lance
  jamais de migration de production, de suppression de données ou de modification
  irréversible sans validation explicite.
- Raison : Ces décisions sont difficiles à défaire et engagent la marque ou le produit.
- Source : Message d'Adrien, 2026-10-01
- Réversibilité : structurante

### D-003 — VALIDÉ signifie « référence actuelle », jamais « intouchable »
- Statut : VALIDÉ
- Date : 2026-10-01
- Domaine : gouvernance
- Décision : Une décision VALIDÉ reste la référence de travail tant qu'Adrien n'a pas approuvé
  son remplacement. Un agent peut proposer de la revoir sur argument nouveau, problème identifié
  ou information nouvelle. L'Art Director a explicitement le droit de remettre en question tout
  élément VALIDÉ de la marque (logo, wordmark, slogan, couleurs, typographies, etc.) selon la
  procédure décrite dans `README.md`, section « Remettre en question une décision VALIDÉ ».
  Tant qu'Adrien n'a pas validé le changement, aucune modification n'est effectuée.
- Raison : Protéger la qualité de l'identité à long terme sans figer des choix par simple inertie.
- Source : Message d'Adrien, 2026-10-01 (brief d'installation, puis précision avant installation)
- Réversibilité : structurante

### D-004 — Slogan « Né du béton »
- Statut : VALIDÉ
- Date : 2026-10-01
- Domaine : marque
- Décision : Le slogan actuellement utilisé est « Né du béton ». C'est la référence actuelle.
- Raison : Élément de marque validé par Adrien. Révisable selon D-003.
- Source : Message d'Adrien, 2026-10-01
- Réversibilité : structurante

### D-005 — Logo et wordmark
- Statut : VALIDÉ
- Date : 2026-10-01
- Domaine : marque
- Décision : Le logo et le wordmark validés constituent la référence actuelle de la marque.
  Les fichiers exacts qui les portent ne sont pas encore documentés (voir Q-002).
- Raison : Éléments de marque validés par Adrien. Révisables selon D-003.
- Source : Message d'Adrien, 2026-10-01
- Réversibilité : structurante

### D-006 — Orvadin : marque sportive, au-delà du volley
- Statut : VALIDÉ
- Date : 2026-10-01
- Domaine : marque
- Décision : Orvadin est une marque sportive destinée à évoluer au-delà du volley. L'identité
  recherchée est sportive, physique, humaine, compétitive et contemporaine.
- Raison : Cadre de positionnement posé par Adrien.
- Source : Message d'Adrien, 2026-10-01
- Réversibilité : structurante

### D-007 — Esthétiques à éviter
- Statut : VALIDÉ
- Date : 2026-10-01
- Domaine : marque
- Décision : La marque évite une esthétique esport, gaming, « startup IA » générique,
  excessivement futuriste, artificielle ou cheap.
- Raison : Cohérence avec l'identité recherchée (D-006).
- Source : Message d'Adrien, 2026-10-01
- Réversibilité : réversible, mais touche le positionnement : à traiter comme structurante si remise en cause.

### D-008 — La session principale est l'Orvadin Director
- Statut : VALIDÉ
- Date : 2026-10-01
- Domaine : gouvernance
- Décision : Le rôle d'Orvadin Director est tenu par la session principale, qui orchestre les
  trois spécialistes `art-director`, `product-director` et `cto`, conservés tels quels.
  Circuit : Adrien → Director → spécialistes → synthèse du Director → Adrien. Le Director
  choisit lui-même les spécialistes à consulter (un, plusieurs ou les trois), récupère leurs
  rapports, détecte leurs désaccords et présente les décisions structurantes à Adrien. Le
  sous-agent `orvadin-director` est retiré. Toutes les règles de gouvernance restent en vigueur
  (statuts VALIDÉ / PROPOSÉ / À DÉCIDER / OBSOLÈTE, D-001 à D-003, droit de remise en question
  de l'Art Director). Le protocole d'orchestration est dans `CLAUDE.md`.
- Raison : Dans l'environnement cloud, `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1` interdit à un
  sous-agent d'en appeler d'autres. Un sous-agent Director ne pouvait donc pas déléguer, ce que
  le test de fonctionnement du 2026-10-01 a constaté (option C retenue parmi A, B et C).
- Source : Message d'Adrien, 2026-10-01 (« Je retiens l'option C ») ; test de fonctionnement du
  2026-10-01
- Réversibilité : réversible (l'ancien sous-agent reste récupérable dans le commit `8775888`).
