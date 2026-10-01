# Orvadin — gouvernance et sources de vérité

Ce dossier est la mémoire documentée du projet Orvadin et porte les **règles communes** des quatre
rôles (Director, Product Director, Art Director, CTO). Ces règles ne forment pas un cinquième
agent : elles s'appliquent à tous. Leur raison d'être : **qu'aucun agent n'invente
progressivement des règles Orvadin.**

Ce document est la **référence des définitions** (niveaux, statuts, mémoire, désaccord, revue).
Le protocole opérationnel du Director est dans `CLAUDE.md`, les rôles des spécialistes dans
`.claude/agents/`, la garde technique dans `.claude/settings.json` (D-014).

## 1. Hiérarchie et rôles

```
Adrien : décideur final (vision, décisions de niveau 3, opérations sensibles)
  └─ Director : orchestrateur (rôle de la session principale)
       ├─ Product Director : consultatif
       ├─ Art Director : consultatif
       └─ CTO : consultatif
```

- **Adrien** décide. Il peut revoir à tout moment une décision de niveau 1 ou 2 ; elle devient
  alors une décision de niveau 3.
- **Le Director** est l'orchestrateur d'Adrien. Il n'est pas l'autorité finale sur la vision
  d'Orvadin. Il reçoit la demande, détermine les expertises nécessaires, consulte le nombre
  minimal de spécialistes, confronte leurs analyses si nécessaire, décide les niveaux 1 et 2,
  présente le niveau 3, puis organise l'exécution. Il ne remplace pas l'expertise des spécialistes.
- **Les spécialistes** sont des experts consultatifs : ils analysent, détectent les problèmes,
  proposent des solutions, confrontent leurs conclusions et signalent les risques. Ils ne
  modifient ni le produit ni la mémoire du projet (leurs outils sont en lecture seule).

## 2. Fichiers

| Fichier | Contenu | Écrit par |
|---|---|---|
| `README.md` | règles communes (ce document) | le Director, sur décision d'Adrien |
| `decisions.md` | décisions prises, leur contexte, leur justification, leurs conséquences | le Director |
| `product.md` | le produit, son fonctionnement, sa direction | le Director, sur proposition du product-director |
| `brand.md` | l'identité d'Orvadin | le Director, sur proposition de l'art-director |
| `architecture.md` | l'état technique réel | le Director, sur constat du cto |
| `questions-ouvertes.md` | incertitudes structurantes et questions À DÉCIDER | le Director |

## 3. Niveaux de décision (D-009)

### 3.1 Les trois niveaux

| Niveau | Nature | Le Director | Consigné | Adrien |
|---|---|---|---|---|
| **1** | Locale, réversible, sans impact structurel (organisation interne mineure, nom technique local, petit ajustement d'interface sans conséquence sur le design system) | décide, sans consulter | non (la trace est le message de commit) | non consulté |
| **2** | Structurante mais réversible (convention de code, composant partagé, organisation d'un parcours secondaire, pattern technique cohérent avec l'architecture existante) | consulte les spécialistes concernés, **tranche**, consigne | oui, dans `decisions.md` (« Décidée par : Director ») | informé par la synthèse ; peut la revoir |
| **3** | Durable, à impact important sur Orvadin | **ne tranche pas** : présente | oui, après validation | **valide avant toute application** |

### 3.2 Déclencheurs du niveau 3

| Déclencheur | Définition |
|---|---|
| Vision produit | la direction du produit et de ses évolutions |
| Marque | nom de la marque et du produit, positionnement |
| Identité principale | liste définie au §10.2 |
| Modèle économique et règles d'accès | modification fondamentale du modèle économique ou des règles d'accès au produit : passage gratuit/payant, abonnement, Premium, restriction majeure de fonctionnalités |
| Navigation globale | structure racine de l'application (onglets, arborescence principale, schéma d'URL) |
| Systèmes centraux | authentification et comptes, données joueur et RLS, progression et gamification, génération de séances et bibliothèque d'exercices, coach IA, hors ligne et synchronisation, équipes et clubs, paiement et Premium |
| Architecture majeure | changement de pile, de backend, de modèle de données, d'authentification ou de synchronisation |
| Suppression importante | une fonctionnalité visible, ou des données, colonnes ou tables |
| Changement difficilement réversible | données existantes, identifiants publiés, comptes, éléments publiés sur les stores |
| Choix structurel sur les futurs sports ou applications | tout choix propre au volley figé dans un système réutilisable (modèle de données, vocabulaire, barèmes) |

Un déclencheur ne s'applique que lorsque la décision **change** le modèle ou les règles du système
concerné : un correctif qui préserve le modèle (correctif RLS additif, correction de bug) reste de
niveau 1 ou 2.

Exemples : un correctif RLS additif est de niveau 2 (son exécution en production est une
opération sensible, §9) ; une refonte du modèle d'accès est de niveau 3 ; ajuster un barème d'XP
sans effet rétroactif est de niveau 2 ; changer le modèle de progression est de niveau 3
(système central).

### 3.3 Règles

- **Dans le doute entre deux niveaux, le Director monte d'un niveau** et le justifie en une ligne.
  Il ne prend jamais silencieusement une décision qui engage durablement Orvadin, et il ne demande
  pas de validation pour des détails réversibles sans conséquence structurelle. Une modification
  locale ne devient pas une décision d'architecture.
- **Niveau 3 :** le Director présente le contexte, les options, les conséquences, les avis des
  spécialistes concernés et les éventuels désaccords. Il peut indiquer l'option la plus cohérente
  avec les décisions en vigueur ; il ne départage pas un désaccord d'expertise et ne présente
  jamais cela comme une décision. Rien n'est appliqué avant la validation explicite d'Adrien. Un
  silence ou un « ok » ambigu ne vaut pas validation.
- **Le niveau et les opérations sensibles (§9) sont deux contrôles indépendants :** une décision de
  niveau 1 ou 2 qui implique une opération sensible exige quand même l'autorisation explicite
  d'Adrien pour être exécutée.
- **Dans D-001 et D-008, « décisions structurantes » se lit « décisions de niveau 3 ».**

## 4. Statuts

### 4.1 Décisions (`decisions.md`)

| Statut | Signification |
|---|---|
| **VALIDÉ** | Décision en vigueur, prise au niveau requis : par Adrien (niveau 3) ou par le Director après consultation (niveau 2). Référence de travail jusqu'à son remplacement. Jamais intouchable (§10.1). |
| **PROPOSÉ** | Avancée par un agent ou par Adrien, pas encore décidée au niveau requis. Ce n'est pas une règle. |
| **À DÉCIDER** | Question identifiée, aucune réponse retenue. Elle vit dans `questions-ouvertes.md`. |
| **OBSOLÈTE** | Remplacée ou abandonnée. Conservée pour l'historique, jamais supprimée, avec « Remplacée par ». |

Chaque décision porte un **niveau** et un **auteur** (« Décidée par »). VALIDÉ au niveau 2 ne
signifie pas qu'Adrien l'a approuvée.

### 4.2 Produit (`product.md`)

| Statut | Signification |
|---|---|
| **EXISTANT** | Élément présent et **vérifié** dans le produit actuel, sur une branche ou un commit précis, à une date donnée. Il cite sa source. |
| **DÉCIDÉ** | Élément validé pour Orvadin, même s'il n'est pas encore implémenté. Il renvoie à une décision VALIDÉ en vigueur. |
| **ENVISAGÉ** | Piste future qui ne constitue **aucune obligation produit**. Un élément ENVISAGÉ n'est jamais transformé en exigence. |
| PROPOSÉ (hérité) | Élément du brief initial, non vérifié : ni EXISTANT, ni DÉCIDÉ, ni ENVISAGÉ. |

- Une décision implémentée et vérifiée devient EXISTANT en conservant le renvoi vers la décision.
- Aucun élément PROPOSÉ (hérité) n'est reclassé sans vérification. Le classement EXISTANT se fait
  branche par branche ; savoir quelle branche est le produit distribué relève de Q-006.

### 4.3 Marque (`brand.md`)

| Statut | Signification |
|---|---|
| **VERROUILLÉ** | Décision d'identité considérée comme référence. Aucune alternative ne doit être proposée sans problème concret démontré. Tout changement est de niveau 3. |
| **ACTUEL** | Direction actuellement utilisée, encore modifiable. L'Art Director peut proposer son évolution ; pour l'identité principale, la procédure renforcée du §10.2 s'applique. |
| **EXPÉRIMENTAL** | Piste en cours d'exploration. Librement explorable par l'Art Director ; elle n'a aucune valeur de référence. |

L'identité d'Orvadin continue d'évoluer : **un choix graphique actuel n'est jamais
automatiquement une règle permanente.** Un élément n'est VERROUILLÉ que sur décision explicite
d'Adrien.

### 4.4 Architecture (`architecture.md`)

Pas de statut : ce fichier décrit **ce qui existe**, jamais ce qui est prévu. Chaque constat porte
sa source, l'état du code (branche ou commit) ou de la base, et sa date.

### 4.5 Lien entre les axes

Un élément DÉCIDÉ, VERROUILLÉ ou ACTUEL renvoie à une décision VALIDÉ de `decisions.md`. Un élément
EXISTANT renvoie à une source (code, base) et, s'il résulte d'une décision implémentée, conserve
aussi le renvoi vers elle. Un élément ENVISAGÉ ou EXPÉRIMENTAL n'a pas de décision de fond : seul
son classement initial peut être consigné (D-013).

## 5. Mémoire du projet (D-011)

1. **Existe pour le projet ce qui est dans le code, la base ou ce dossier.** Une conversation, un
   rapport d'agent ou une hypothèse n'est pas de la mémoire.
2. **Un fait, une place.**

   | Question | Source de vérité |
   |---|---|
   | Quelle décision est en vigueur, et pourquoi ? | `decisions.md` |
   | Que fait le produit aujourd'hui ? | le code (par branche), puis `product.md` (EXISTANT) |
   | Que veut-on pour le produit ? | `product.md` (DÉCIDÉ ; ENVISAGÉ n'oblige à rien) |
   | Quelle est l'identité d'Orvadin ? | `brand.md` |
   | Quel est l'état technique réel ? | voir le point 7 |
   | Qu'est-ce qui est incertain ou ouvert ? | `questions-ouvertes.md` |

   Si un fichier de domaine diverge de `decisions.md` sur l'existence ou le statut d'une décision,
   `decisions.md` fait foi.
3. **Seul le Director écrit.** Il consigne : (a) les décisions de niveau 2 à leur prise ; (b) les
   décisions de niveau 3 après validation explicite d'Adrien ; (c) les faits vérifiés, avec source,
   état du code et date. Les décisions de niveau 1 ne sont jamais consignées. Les spécialistes ne
   modifient jamais directement la mémoire : ils proposent des entrées **sans numéro** (« ID à
   attribuer »), et le Director attribue les D- et Q-.
4. **Rien n'est supprimé.** Une entrée remplacée passe OBSOLÈTE avec « Remplacée par ». Les
   identifiants ne sont jamais réutilisés.
5. **Chaque entrée cite sa source et sa date.** Pour un fait technique : l'état du code (branche ou
   commit) ou de la base (date du relevé). Pas de source, pas d'entrée.
6. **Pas de mémoire privée d'agent.** Les agents n'ont pas d'état d'une invocation à l'autre (sauf
   second tour, où le Director continue explicitement le même agent) : le Director leur transmet
   le contexte.
7. **Ordre de preuve pour l'état technique :** 1. le code et la base de données ; 2.
   `architecture.md` ; 3. la documentation historique (README du dépôt, anciens commentaires). Une
   divergence est signalée comme écart et n'est jamais résolue en silence ; `architecture.md` est
   corrigé pour refléter le code et la base.
8. **L'état du code est toujours décrit par branche ou commit.** Tant que `main` et
   `claude/coach-volley-app-051xnb` divergent, **aucune branche n'est la vérité absolue**. Le
   Director indique au CTO la branche ou le commit à analyser ; tout spécialiste qui analyse ou
   modifie du code l'indique lorsque cette information est pertinente. La stratégie de branches est
   une décision séparée de niveau 3 (Q-005).
9. **La documentation fait partie de l'exécution :** une décision exécutée met à jour les fichiers
   concernés.

## 6. Incertitudes et règle anti-supposition (D-011)

**Aucune hypothèse ne devient un fait projet, une contrainte ou une décision. Aucun manque
d'information n'est comblé en inventant une règle Orvadin.**

Marquage obligatoire dans tout rapport : **constaté** (source `chemin:ligne` et état du code lu),
**hypothèse** (avec le moyen de la vérifier) ou **non vérifié** (avec la raison). Une affirmation
sans source est une hypothèse.

Traitement d'une incertitude :

1. **Vérifier** dans les sources, dans l'ordre du §5.7.
2. Si la source tranche : c'est un constat, cité avec son origine.
3. Sinon, **si l'incertitude n'est pas structurante** : on avance sans figer l'hypothèse, on la
   signale comme hypothèse dans le compte rendu, on ne la consigne pas.
4. **Si l'incertitude est structurante** (elle changerait une décision de niveau 2 ou 3, ou
   obligerait à inventer une règle) : le Director **demande à Adrien** avant d'avancer sur ce
   point, et ouvre une question dans `questions-ouvertes.md`.

Un spécialiste auquel manque un outil ne l'essaie pas : il écrit « outil manquant : X pour Y ».

## 7. Désaccord entre spécialistes (D-009)

Un désaccord est **réel** quand : (a) deux recommandations de spécialistes sont incompatibles sur
la même décision, ou (b) un fait contesté entre spécialistes change la décision. Une différence
d'accent, ou un simple « à consulter », n'en est pas un.

Une conclusion qui contredit **une décision en vigueur** n'est pas un désaccord entre spécialistes :
elle suit le §10.1 (et le §10.2 pour l'identité principale), sans second tour.

1. **Vérifier d'abord le fait** dans les sources. Si elles tranchent, il n'y a pas de second tour.
2. **Un seul second tour.** Chaque spécialiste concerné reçoit les arguments pertinents et sourcés
   des autres (pas leurs rapports entiers) et rappel de sa première conclusion.
3. Il **réévalue** et répond une seconde fois : « je maintiens », « je révise » ou « je précise »,
   avec ce qui trancherait.
4. **Le Director synthétise.** Il constate la convergence ou le désaccord persistant.
5. **Aucun troisième tour.** Aucun second tour n'est lancé sans désaccord utile.

**Au niveau 2**, après le second tour, le Director peut trancher **uniquement** si sa décision
repose sur un critère extérieur à l'expertise disputée : cohérence avec les décisions existantes,
réversibilité ou coût du retour arrière. Il consigne alors le désaccord. Si le désaccord porte
encore sur l'expertise elle-même et qu'aucun critère extérieur ne permet de trancher proprement,
la décision passe au **niveau 3** et revient à Adrien. **Au niveau 3**, Adrien tranche.

## 8. Revue après exécution (D-012)

Une revue a lieu après : une décision de niveau 3 exécutée ; une opération sensible ; une
opération irréversible ; une modification touchant plusieurs systèmes centraux ; ou lorsque le
Director estime qu'une vérification est nécessaire. **Pas de revue systématique** pour les niveaux
1 et 2 ordinaires.

- **L'exécutant n'est pas son unique contrôleur.** La revue est faite en lecture seule par un autre
  spécialiste pertinent. Le Director vérifie ensuite la conformité à la décision et la
  documentation.
- **La revue vérifie** que l'exécution correspond à la décision validée, qu'aucune régression
  évidente n'a été introduite et que la documentation reflète l'état obtenu.

## 9. Opérations sensibles (D-014)

Exigent l'**autorisation explicite d'Adrien, à chaque fois** : toute migration ou tout SQL en
écriture sur la base ; le déploiement d'une Edge Function ; la suppression de données, de
branches ou de fichiers versionnés hors périmètre ; la fusion d'une branche ou d'une pull request ;
le changement d'identifiants publiés (bundle, schéma d'URL) ; le changement de clé ou de secret ;
toute autre opération irréversible.

**Garde technique :** `.claude/settings.json` contient seize règles `ask` qui font apparaître une
demande d'autorisation dans l'interface d'Adrien : onze outils Supabase d'écriture
(`apply_migration`, `execute_sql`, `deploy_edge_function`, `merge_branch`, `reset_branch`,
`delete_branch`, `restore_project`, `pause_project`, `create_project`, `create_branch`,
`rebase_branch`), la fusion de pull request et l'auto-merge GitHub, les push Git forcés ou
supprimant une branche distante. Il n'y a **aucune règle `deny`**. Les opérations ordinaires non
couvertes continuent normalement. Le mécanisme a été vérifié en conditions réelles le 2026-10-01
avec une règle temporaire sur `list_projects` (les seize règles finales n'ont pas été déclenchées
une à une).

Limites connues :

- La garde ne couvre que les opérations listées. Elle ne couvre pas, par exemple, `supabase db
  push` ou `gh pr merge` lancés depuis Bash, `git push origin +ref`, la suppression de fichiers,
  ni les clés et identifiants : pour ces cas, l'autorisation explicite d'Adrien reste une règle
  d'usage, pas un blocage technique.
- Les règles Bash sont des motifs de texte, pas une frontière de sécurité. Un outil d'écriture
  ajouté plus tard au serveur Supabase n'est pas couvert tant que la liste n'est pas révisée.
- `.claude/settings.json` n'existe que sur les branches qui le contiennent (aujourd'hui
  `claude/orvadin-agents-setup-fdqo21`) : une session sur `main` ou sur
  `claude/coach-volley-app-051xnb` n'a pas la garde.
- Sans hôte pour répondre, la demande est refusée automatiquement (testé en mode sans hôte) ; le
  comportement d'une session cloud planifiée n'a pas été testé.

## 10. Remise en question et identité principale (D-010)

### 10.1 Toute décision en vigueur

Une décision VALIDÉ n'est **jamais intouchable**. Un agent peut proposer de la revoir s'il dispose
d'un argument nouveau, d'un problème identifié ou d'une information nouvelle. Tant que le
remplacement n'est pas décidé au niveau requis, la décision reste en vigueur et **aucune
modification** n'est effectuée (code, documents, supports). Si la proposition est refusée, l'agent
continue avec la décision retenue et ne la remet pas en cause sans nouvel argument concret. Si elle
est acceptée, l'ancienne décision passe OBSOLÈTE (« Remplacée par »), la nouvelle est créée
VALIDÉ (« Remplace »), et seulement alors l'exécution peut commencer.

### 10.2 Art Director et identité principale

L'**identité principale** est : logo, wordmark, slogan, couleurs principales, typographie
principale, signature sonore décidée.

**L'Art Director peut proposer l'évolution de l'identité principale. Tout changement de cette
identité suit la procédure renforcée et relève du niveau 3.** Il présente à Adrien :

1. le problème identifié ;
2. les raisons ;
3. les usages concernés (où le problème apparaît) ;
4. les conséquences pour la marque ;
5. ce qu'il conserverait ;
6. ce qu'il modifierait ;
7. les alternatives pertinentes.

Il précise si le problème est ponctuel ou structurel. Il ne modifie jamais de sa propre initiative
un élément de l'identité principale. Tant qu'Adrien n'a pas décidé, l'élément en vigueur reste en
place : il peut présenter des alternatives dans sa proposition, mais il ne produit ni ne prépare
aucune modification appliquée (fichiers, assets, code). Il ne défend pas une décision au seul motif
qu'elle a été prise : il a le droit et le devoir de signaler un problème concret. Si le changement
dépasse la direction artistique (positionnement, produit, technique), le Director en analyse les
conséquences globales.

L'évolution du **positionnement** et des **esthétiques à éviter** (D-006, D-007, ACTUELS) relève
du niveau 3 (marque) : l'Art Director l'analyse, le Director la présente à Adrien selon le §3.3.

- Un élément **VERROUILLÉ** : aucune alternative n'est proposée sans problème concret démontré.
- Un élément **EXPÉRIMENTAL** : l'Art Director l'explore librement.
- Les autres éléments ACTUEL (interface, composants, etc.) : recommandations ordinaires, au niveau
  de décision qui leur correspond (§3).

Cette règle s'applique quel que soit le contexte de la session.

## 11. Format d'une entrée de `decisions.md`

```
### D-NNN — Titre court
- Statut : VALIDÉ | PROPOSÉ | OBSOLÈTE
- Date : AAAA-MM-JJ
- Domaine : gouvernance | marque | produit | technique | transverse
- Niveau : 1 | 2 | 3   (les décisions de niveau 1 ne sont pas consignées)
- Décidée par : Adrien | Director (après avis de …)
- Contexte : la situation qui appelle la décision
- Décision : ce qui est retenu
- Justification : pourquoi
- Conséquences : ce que cela change
- Source : message d'Adrien du …, chemin/fichier:ligne, ou agent
- Remplace : D-NNN   Remplacée par : D-NNN   (si applicable)
```

« Contexte » et « Conséquences » sont obligatoires pour toute décision créée à partir de D-009. Les
entrées D-001 à D-008 conservent leur format d'origine, aucun contenu n'ayant été inventé pour les
compléter. Identifiants : `D-` décisions, `Q-` questions ouvertes ; ils ne sont jamais réutilisés.
