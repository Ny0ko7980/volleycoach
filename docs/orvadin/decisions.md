# Journal des décisions

Fait foi pour l'existence et le statut des décisions. Les règles détaillées sont normatives dans
`README.md` (niveaux §3, statuts §4, format d'entrée §11).

Historique : D-001 à D-007 proviennent du brief d'installation d'Adrien (2026-10-01). D-008 date
de sa décision du même jour, prise après le premier test des agents. D-002 et D-003 sont
**OBSOLÈTES** depuis le 2026-10-01, remplacées par D-009 et D-010 sur décision d'Adrien ; leur texte
est conservé. D-009 à D-014 consignent les décisions validées par Adrien le 2026-10-01 après la
consolidation du système (niveaux, statuts, mémoire, revue, identité initiale, garde technique).
Toutes les décisions D-001 à D-014 sont de **niveau 3**, décidées par Adrien.

---

### D-001 — Adrien est le décideur final
- Statut : VALIDÉ
- Date : 2026-10-01
- Domaine : gouvernance
- Niveau : 3
- Décidée par : Adrien
- Décision : Les agents conseillent, argumentent et proposent. Adrien prend les décisions
  finales, en particulier les décisions structurantes.
- Raison : Éviter que des agents orientent seuls l'identité, le produit ou la technique d'Orvadin.
- Source : Message d'Adrien, 2026-10-01 (brief d'installation des agents)
- Réversibilité : structurante
- Précisions : « décisions structurantes » se lit « décisions de niveau 3 » (D-009).

### D-002 — Les décisions structurantes sont présentées à Adrien avant exécution
- Statut : **OBSOLÈTE** (depuis le 2026-10-01)
- Remplacée par : **D-009**
- Date : 2026-10-01
- Domaine : gouvernance
- Niveau : 3
- Décidée par : Adrien
- Décision : Aucun agent ne tranche seul une décision touchant l'identité ou le positionnement
  d'Orvadin, une fonctionnalité importante, une suppression de fonctionnalité, une modification
  importante de l'architecture, une refonte majeure ou le modèle économique. Le CTO ne lance
  jamais de migration de production, de suppression de données ou de modification
  irréversible sans validation explicite.
- Raison : Ces décisions sont difficiles à défaire et engagent la marque ou le produit.
- Source : Message d'Adrien, 2026-10-01
- Réversibilité : structurante

### D-003 — VALIDÉ signifie « référence actuelle », jamais « intouchable »
- Statut : **OBSOLÈTE** (depuis le 2026-10-01)
- Remplacée par : **D-010**
- Date : 2026-10-01
- Domaine : gouvernance
- Niveau : 3
- Décidée par : Adrien
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
- Niveau : 3
- Décidée par : Adrien
- Décision : Le slogan actuellement utilisé est « Né du béton ». C'est la référence actuelle.
- Raison : Élément de marque validé par Adrien. Révisable selon D-010 (ex-D-003).
- Source : Message d'Adrien, 2026-10-01
- Réversibilité : structurante
- Précisions : statut d'élément **ACTUEL**, non verrouillé (D-013).

### D-005 — Logo et wordmark
- Statut : VALIDÉ
- Date : 2026-10-01
- Domaine : marque
- Niveau : 3
- Décidée par : Adrien
- Décision : Le logo et le wordmark validés constituent la référence actuelle de la marque.
  Les fichiers exacts qui les portent ne sont pas encore documentés (voir Q-002).
- Raison : Éléments de marque validés par Adrien. Révisables selon D-010 (ex-D-003).
- Source : Message d'Adrien, 2026-10-01
- Réversibilité : structurante
- Précisions : statut d'élément **ACTUEL**, non verrouillé (D-013).

### D-006 — Orvadin : marque sportive, au-delà du volley
- Statut : VALIDÉ
- Date : 2026-10-01
- Domaine : marque
- Niveau : 3
- Décidée par : Adrien
- Décision : Orvadin est une marque sportive destinée à évoluer au-delà du volley. L'identité
  recherchée est sportive, physique, humaine, compétitive et contemporaine.
- Raison : Cadre de positionnement posé par Adrien.
- Source : Message d'Adrien, 2026-10-01
- Réversibilité : structurante
- Précisions : direction **décidée**, statut d'élément **ACTUEL**, **non verrouillée** : sa
  traduction précise évoluera avec les futures applications et les autres sports (D-013).

### D-007 — Esthétiques à éviter
- Statut : VALIDÉ
- Date : 2026-10-01
- Domaine : marque
- Niveau : 3
- Décidée par : Adrien
- Décision : La marque évite une esthétique esport, gaming, « startup IA » générique,
  excessivement futuriste, artificielle ou cheap.
- Raison : Cohérence avec l'identité recherchée (D-006).
- Source : Message d'Adrien, 2026-10-01
- Réversibilité : réversible, mais touche le positionnement : à traiter comme décision de niveau 3
  si remise en cause.
- Précisions : statut d'élément **ACTUEL** (**contrainte actuelle, révisable**), non verrouillée, et
  non une interdiction permanente (D-013).

### D-008 — La session principale est l'Orvadin Director
- Statut : VALIDÉ
- Date : 2026-10-01
- Domaine : gouvernance
- Niveau : 3
- Décidée par : Adrien
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
- Précisions : « décisions structurantes » se lit « décisions de niveau 3 » ; les références à D-002
  et D-003 se lisent D-009 et D-010. Le Director consulte le nombre minimal de spécialistes (D-009).

### D-009 — Trois niveaux de décision (remplace D-002)
- Statut : VALIDÉ
- Remplace : D-002
- Date : 2026-10-01
- Domaine : gouvernance
- Niveau : 3
- Décidée par : Adrien
- Contexte : D-002 imposait de présenter à Adrien toute décision « structurante », sans distinguer
  les décisions réversibles à portée structurelle (convention de code, composant partagé, parcours
  secondaire) des décisions durables. Le fonctionnement en équipe devait éviter la bureaucratie
  entre agents sans que le Director prenne silencieusement une décision qui engage durablement
  Orvadin.
- Décision : Le Director consulte le **nombre minimal de spécialistes** nécessaire (un seul par
  défaut). **Trois niveaux** : 1 (local, réversible, sans impact structurel : le Director décide,
  sans consulter, sans consigner) ; 2 (structurant mais réversible : il consulte les spécialistes
  concernés, tranche et consigne) ; 3 (durable, à impact important : il ne tranche pas, présente, et
  attend la validation explicite d'Adrien). Les déclencheurs du niveau 3 (auxquels s'ajoute la
  modification fondamentale du modèle économique ou des règles d'accès : gratuit/payant,
  abonnement, Premium, restriction majeure de fonctionnalités), la règle du doute et
  l'indépendance entre niveaux et opérations sensibles : `README.md` §3. **Désaccord entre
  spécialistes** : un seul second tour, uniquement si le désaccord est réel ; au niveau 2, le
  Director ne tranche que sur un critère extérieur à l'expertise disputée (cohérence avec les
  décisions existantes, réversibilité, coût du retour arrière), sinon la décision passe au niveau 3 :
  `README.md` §7.
- Justification : Garder chez Adrien tout ce qui engage durablement Orvadin, tout en laissant
  avancer seuls les spécialistes et le Director sur le reste. Une tâche simple doit rester simple.
- Conséquences : D-002 devient OBSOLÈTE. « Structurante » ne désigne plus une catégorie unique :
  le niveau 3 en reprend le sens de D-001 et D-008. Le Director consigne les décisions de niveau 2
  (D-011). `CLAUDE.md`, `README.md` et les fichiers d'agents sont alignés.
- Source : Messages d'Adrien, 2026-10-01 (configuration finale, validation des points 1 et 3).

### D-010 — Statuts des éléments et droit de remise en question (remplace D-003)
- Statut : VALIDÉ
- Remplace : D-003
- Date : 2026-10-01
- Domaine : gouvernance
- Niveau : 3
- Décidée par : Adrien
- Contexte : D-003 posait « VALIDÉ = référence actuelle, jamais intouchable » et donnait à l'Art
  Director le droit de remettre en question tout élément VALIDÉ de la marque. L'identité d'Orvadin
  continue d'évoluer : les choix graphiques actuels ne doivent pas devenir des règles permanentes.
- Décision : (1) Les statuts de décision PROPOSÉ / VALIDÉ / À DÉCIDER / OBSOLÈTE sont conservés ;
  VALIDÉ signifie « en vigueur au niveau requis » et n'est jamais intouchable. (2) Statuts du
  produit : EXISTANT / DÉCIDÉ / ENVISAGÉ. (3) Statuts de la marque : VERROUILLÉ / ACTUEL /
  EXPÉRIMENTAL. (4) L'identité principale est : logo, wordmark, slogan, couleurs principales,
  typographie principale, signature sonore décidée. L'Art Director peut proposer son évolution ;
  tout changement suit la procédure renforcée en sept points et relève du niveau 3 ; un élément
  EXPÉRIMENTAL est librement explorable ; pour un élément VERROUILLÉ, aucune alternative n'est
  proposée sans problème concret démontré. (5) Toute décision en vigueur peut être contestée sur
  argument nouveau et le reste jusqu'à son remplacement. Définitions et procédure : `README.md` §4
  et §10.
- Justification : Protéger la qualité de l'identité à long terme et distinguer ce qui existe, ce
  qui est décidé et ce qui est seulement envisagé, sans figer des choix par inertie.
- Conséquences : D-003 devient OBSOLÈTE. `brand.md`, `product.md`, `art-director.md` et
  `product-director.md` utilisent les nouveaux statuts. D-004 à D-007 restent des décisions VALIDÉ
  sans être verrouillées (D-013).
- Source : Messages d'Adrien, 2026-10-01 (configuration finale, validation des points 2 et 6).

### D-011 — Mémoire du projet, sources de vérité et anti-supposition
- Statut : VALIDÉ
- Date : 2026-10-01
- Domaine : gouvernance
- Niveau : 3
- Décidée par : Adrien
- Contexte : La règle « n'écrire qu'après validation d'Adrien » était incompatible avec le niveau 2,
  et la divergence entre `main` et `claude/coach-volley-app-051xnb` (Q-005) fait apparaître le
  risque de décrire un état de code sans dire lequel.
- Décision : Le Director consigne les décisions de niveau 2, les faits vérifiés (source, état du
  code, date) et les décisions de niveau 3 après validation explicite ; le niveau 1 n'est pas
  consigné ; les spécialistes ne modifient jamais la mémoire. Ordre de preuve technique : code et
  base, puis `architecture.md`, puis documentation historique. L'état du code est décrit par
  branche ou commit, sans désigner de branche comme vérité absolue ; la stratégie de branches reste
  une décision séparée de niveau 3 (Q-005). **Anti-supposition** : aucune hypothèse ne devient un
  fait projet, une contrainte ou une décision ; vérifier les sources ; demander à Adrien une
  incertitude structurante ; ne jamais combler un manque en inventant une règle Orvadin. Règles
  détaillées : `README.md` §5 et §6.
- Justification : Qu'aucun agent n'invente progressivement des règles Orvadin, sans ralentir les
  décisions réversibles.
- Conséquences : `architecture.md` ne contient plus que des constats datés et sourcés, par
  branche ; `README.md` et `CLAUDE.md` n'exigent plus la validation d'Adrien pour consigner un
  niveau 2 ou un fait vérifié.
- Source : Messages d'Adrien, 2026-10-01 (configuration finale ; validation des points 3, 4 et 5).

### D-012 — Revue après exécution
- Statut : VALIDÉ
- Date : 2026-10-01
- Domaine : gouvernance
- Niveau : 3
- Décidée par : Adrien
- Contexte : Le Director orchestre l'exécution après la décision ; il ne doit pas en être le seul
  contrôleur pour ce qui est important ou irréversible.
- Décision : Une revue a lieu après une décision de niveau 3 exécutée, une opération sensible, une
  opération irréversible, une modification touchant plusieurs systèmes centraux, ou lorsque le
  Director l'estime nécessaire ; pas de revue systématique pour les niveaux 1 et 2 ordinaires. Elle
  est faite en lecture seule par un autre spécialiste pertinent, puis le Director vérifie la
  conformité à la décision et la documentation. Détail : `README.md` §8.
- Justification : Un contrôle indépendant là où l'erreur coûte cher, sans chaîne de validation
  systématique.
- Conséquences : Le Director choisit le spécialiste relecteur selon le domaine touché. Première
  application : la mise en œuvre de D-009 à D-014 a été relue par les trois spécialistes le
  2026-10-01.
- Source : Message d'Adrien, 2026-10-01 (validation du point 4).

### D-013 — État initial de l'identité d'Orvadin
- Statut : VALIDÉ
- Date : 2026-10-01
- Domaine : marque
- Niveau : 3
- Décidée par : Adrien
- Contexte : L'identité d'Orvadin continue d'évoluer ; les statuts de marque VERROUILLÉ / ACTUEL /
  EXPÉRIMENTAL (D-010) doivent recevoir un état initial.
- Décision : Le logo, le wordmark et le slogan « Né du béton » sont **ACTUEL**. La direction
  béton, impacts, mouvement sportif et la signature sonore sont **EXPÉRIMENTAL** (piste de
  travail, non verrouillée). **Aucun élément n'est VERROUILLÉ.** D-006 (marque sportive au-delà
  du volley) est une direction décidée, de statut **ACTUEL**, non verrouillée : sa traduction
  précise évoluera avec les futures applications et les autres sports. D-007 (esthétiques à
  éviter) est une contrainte actuelle, de statut **ACTUEL**, révisable, non verrouillée : ce n'est
  pas une interdiction permanente. L'identité sonore appartient au périmètre de l'Art Director.
- Justification : Ne pas transformer les goûts actuels en règles permanentes.
- Conséquences : `brand.md` porte ces statuts ; D-004 à D-007 restent VALIDÉ (en vigueur) ;
  `art-director.md` s'y réfère par renvoi.
- Source : Message d'Adrien, 2026-10-01 (validation du point 1).

### D-014 — Garde technique sur les opérations sensibles
- Statut : VALIDÉ
- Date : 2026-10-01
- Domaine : gouvernance
- Niveau : 3
- Décidée par : Adrien
- Contexte : L'hôte de la session pré-autorise `mcp__Supabase__apply_migration` et `execute_sql`
  (et tous les outils GitHub) ; la session tourne en mode `auto`. Une migration en production
  partirait donc sans aucune demande. Un essai du mécanisme avec le binaire de l'environnement
  (modes `default`, `auto`, `bypassPermissions`) a montré qu'une règle `ask` l'emporte sur les
  pré-autorisations et provoque une demande à l'hôte.
- Décision : `.claude/settings.json` contient seize règles `ask` : `apply_migration`,
  `execute_sql`, `deploy_edge_function`, `merge_branch`, `reset_branch`, `delete_branch`,
  `restore_project`, `pause_project`, `create_project`, `create_branch`, `rebase_branch` (Supabase),
  `merge_pull_request` et `enable_pr_auto_merge` (GitHub), et les motifs Bash `git push --force*`,
  `git push -f *`, `git push * --delete*`. Aucune règle `deny`. Les opérations ordinaires non
  couvertes continuent normalement.
- Justification : Transformer la règle textuelle « opérations sensibles = validation explicite »
  en une demande d'autorisation réelle. Test en direct du 2026-10-01 : les demandes pour
  `list_projects` (règle temporaire) sont apparues dans l'interface d'Adrien, qui les a acceptées,
  et les appels ont été exécutés après son acceptation. La règle temporaire a été retirée.
- Conséquences : toute opération listée exige l'autorisation d'Adrien. Limites : la garde
  n'existe que sur les branches qui contiennent `.claude/settings.json` ; elle ne couvre pas les
  autres voies (par exemple `supabase db push` ou `gh pr merge` lancés depuis Bash) ; les motifs
  Bash sont des motifs de texte ; la liste est à réviser si le serveur ajoute des outils
  d'écriture (détail : `README.md` §9). Introduite par le commit `78a0081`.
- Source : Message d'Adrien, 2026-10-01 (validation de la garde après le test en direct).
