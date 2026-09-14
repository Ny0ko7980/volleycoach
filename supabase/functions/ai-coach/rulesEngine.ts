// Moteur de règles volleyball utilisé comme fallback du Coach IA quand
// ANTHROPIC_API_KEY n'est pas configurée. Garantit que le Coach IA reste
// réellement fonctionnel dès l'installation, sans dépendre d'une clé
// payante. Couvre les thèmes les plus demandés (réception, service,
// attaque, bloc, détente, exercices maison, conseils par poste) et
// applique systématiquement la garde médicale (voir SAFETY_NOTICE).

export interface PlayerContext {
  username: string;
  position: string;
  level: string;
  goals: string[];
}

const POSITION_LABELS: Record<string, string> = {
  setter: "passeur",
  outside_hitter: "réceptionneur-attaquant",
  opposite: "pointu",
  middle_blocker: "central",
  libero: "libéro",
};

export const SAFETY_NOTICE =
  "⚠️ Je ne suis pas un professionnel de santé : si tu ressens une douleur, une gêne persistante ou une blessure, arrête l'exercice et consulte un médecin ou un kinésithérapeute du sport avant de continuer.";

const PAIN_KEYWORDS = ["douleur", "mal au", "blessure", "blessé", "ça fait mal", "j'ai mal", "entorse", "déchirure", "craquement"];

export function mentionsPain(message: string): boolean {
  const normalized = message.toLowerCase();
  return PAIN_KEYWORDS.some((k) => normalized.includes(k));
}

interface Rule {
  keywords: string[];
  respond: (ctx: PlayerContext) => string;
}

const rules: Rule[] = [
  {
    keywords: ["réception", "manchette", "reception"],
    respond: (ctx) =>
      `Pour progresser en réception (${POSITION_LABELS[ctx.position] ?? ctx.position}, niveau ${ctx.level}):\n` +
      `1. Travaille ta position de base: jambes fléchies, plateforme stable formée avant que le ballon n'arrive.\n` +
      `2. Priorise la qualité sur la quantité: 3x20 manchettes ciblées valent mieux que 100 manchettes sans repère.\n` +
      `3. Vise systématiquement le passeur, pas le plafond — c'est l'erreur n°1 des joueurs qui ratent leurs manchettes.\n` +
      `4. Ajoute un exercice de déplacement + réception pour être stable même après un pas latéral.\n` +
      `Tu trouveras ces exercices dans l'onglet Entraînement → Bibliothèque, filtrés sur l'objectif "Réception".`,
  },
  {
    keywords: ["rate mes manchettes", "pourquoi je rate", "manchette rate"],
    respond: () =>
      `Les causes les plus fréquentes d'une manchette ratée:\n` +
      `- Bras qui montent trop tôt ou trop haut (le ballon part au plafond)\n` +
      `- Plateforme instable au contact (coudes qui plient)\n` +
      `- Mauvais placement des appuis: tu arrives sur le ballon au lieu d'anticiper sa trajectoire\n` +
      `Essaie l'exercice "Manchettes ciblées" en te concentrant uniquement sur la stabilité de ta plateforme, sans chercher la précision au début.`,
  },
  {
    keywords: ["service", "smash", "ace"],
    respond: (ctx) =>
      `Pour ton service (niveau ${ctx.level}):\n` +
      `1. Standardise ton lancer de balle — même hauteur, même point de lâcher à chaque fois.\n` +
      `2. Travaille d'abord la précision avec l'exercice "Services ciblés" avant de chercher la puissance.\n` +
      `3. Si tu es à l'aise techniquement, passe au "Service smashé — puissance" pour développer l'explosivité du bras.\n` +
      `4. En match, vise les zones 1, 5 et 6 qui sont statistiquement les plus difficiles à défendre.`,
  },
  {
    keywords: ["attaque", "smasher", "frappe", "attaquer"],
    respond: (ctx) =>
      `Pour ton attaque (${POSITION_LABELS[ctx.position] ?? ctx.position}):\n` +
      `1. Le timing de l'approche est la clé: synchronise ton dernier appui avec la montée du ballon.\n` +
      `2. Varie tes angles avec "Attaque en croisé + lecture de bloc" pour ne pas être prévisible.\n` +
      `3. Regarde les mains du bloqueur juste avant ton armé, pas avant — ça te donne l'info au bon moment.\n` +
      `4. Renforce ta détente en parallèle (squats sautés, pliométrie) pour gagner en hauteur au filet.`,
  },
  {
    keywords: ["bloc", "bloquer", "contre"],
    respond: () =>
      `Pour ton bloc:\n` +
      `1. Travaille le timing avant tout: tes mains doivent pénétrer le plan du filet juste après celles de l'attaquant.\n` +
      `2. Si tu bloques à deux, la communication verbale synchronise le saut — annonce-toi.\n` +
      `3. L'exercice "Bloc individuel — placement de mains" est parfait pour automatiser le bon timing.`,
  },
  {
    keywords: ["détente", "sauter plus haut", "sauter haut", "explosivité", "vertical"],
    respond: () =>
      `Pour augmenter ta détente:\n` +
      `1. Base: renforcement des jambes avec des squats sautés, 2-3x/semaine.\n` +
      `2. Progression: pliométrie (sauts en contrebas) une fois la base posée — attention, exercice avancé et exigeant pour les articulations.\n` +
      `3. Le gainage dynamique aide aussi: un tronc stable transmet mieux la force des jambes.\n` +
      `4. Laisse au moins 48h de récupération entre deux séances de pliométrie.\n` +
      SAFETY_NOTICE,
  },
  {
    keywords: ["chez moi", "maison", "sans matériel", "seul"],
    respond: () =>
      `Exercices réalisables seul, avec peu de matériel:\n` +
      `- Gainage dynamique (planche, gainage latéral) — aucun matériel\n` +
      `- Squats sautés — aucun matériel\n` +
      `- Passe à 2 mains contre un mur si tu es passeur\n` +
      `- Services ciblés dans un jardin ou un couloir dégagé\n` +
      `Filtre la bibliothèque d'exercices sur "Matériel: aucun" pour en voir plus.`,
  },
  {
    keywords: ["r4", "réceptionneur-attaquant", "outside"],
    respond: (ctx) =>
      `En tant que réceptionneur-attaquant (R4), niveau ${ctx.level}, priorise dans cet ordre:\n` +
      `1. Réception — c'est le poste le plus sollicité en réception, la base de tout.\n` +
      `2. Attaque en ligne droite et croisé pour être imprévisible.\n` +
      `3. Détente pour gagner en puissance au-dessus du bloc.\n` +
      `Tes objectifs actuels: ${ctx.goals.length ? ctx.goals.join(", ") : "aucun objectif défini pour le moment"}.`,
  },
  {
    keywords: ["défense", "plonger", "plongeon", "sauver un ballon"],
    respond: () =>
      `Pour ta défense:\n` +
      `1. Travaille le plongeon avec roulade contrôlée — ne réceptionne jamais ton poids sur les bras tendus.\n` +
      `2. Anticipe en lisant les épaules de l'attaquant plutôt que le ballon.\n` +
      `L'exercice "Plongeon et roulade défensive" est fait pour ça — progresse étape par étape.\n` +
      SAFETY_NOTICE,
  },
  {
    keywords: ["régularité", "constant", "régulier"],
    respond: () =>
      `Pour gagner en régularité: enchaîne les gestes sans réinitialiser ta posture entre chaque action ` +
      `(reste sur tes appuis après une réception au lieu de te relever complètement). L'exercice "Circuit régularité — enchaînements" cible exactement ça.`,
  },
  {
    keywords: ["compétition", "match", "préparer"],
    respond: () =>
      `Pour préparer une compétition: simule l'intensité réelle du match (annonce le score à voix haute pendant tes exercices), ` +
      `travaille tous les fondamentaux en rotation, et réduis le volume d'entraînement dans les 2-3 jours précédant la compétition pour arriver frais.`,
  },
];

export function generateRuleBasedReply(message: string, ctx: PlayerContext): string {
  const normalized = message.toLowerCase();

  if (mentionsPain(message)) {
    return (
      `Je comprends que ça te gêne, ${ctx.username}. Je ne peux pas évaluer une douleur ou une blessure — ` +
      `arrête l'activité qui la déclenche et consulte un médecin ou un kinésithérapeute du sport avant de reprendre l'entraînement. ` +
      `Une fois le feu vert médical obtenu, reviens me voir et on adaptera ta séance ensemble.`
    );
  }

  for (const rule of rules) {
    if (rule.keywords.some((k) => normalized.includes(k))) {
      return rule.respond(ctx);
    }
  }

  return (
    `Bonne question, ${ctx.username} ! Pour te donner un conseil précis, dis-moi sur quel aspect tu veux travailler: ` +
    `réception, service, attaque, bloc, détente, vitesse, défense ou régularité. ` +
    `Tu peux aussi me demander des exercices réalisables chez toi, ou des conseils adaptés à ton poste (${ctx.position}).`
  );
}

// Questions de technique sur un exercice précis ("comment bien faire des squats
// sautés ?", "quelle est la technique pour la manchette ?"...) : on répond avec
// le contenu réel de la bibliothèque d'exercices plutôt qu'un conseil générique,
// pour que la réponse reste toujours exacte et cohérente avec l'app.

export interface ExerciseTechniqueInfo {
  name: string;
  objective: string;
  instructions: string;
  common_mistakes: string | null;
  tips: string | null;
}

/**
 * Marqueurs d'une question de diagnostic : « pourquoi je rate mes
 * manchettes ? » n'appelle pas la même réponse que « comment faire une
 * manchette ? ». La première demande des causes, la seconde une exécution.
 */
const DIAGNOSIS_MARKERS = [
  // Interrogation directe
  "pourquoi",
  "comment ca se fait",
  "qu'est-ce qui cloche",
  "quest-ce qui cloche",
  // Échec exprimé à la première personne
  "j'arrive pas",
  "jarrive pas",
  "n'arrive pas",
  "narrive pas",
  "j'y arrive pas",
  "jy arrive pas",
  "je rate",
  "je loupe",
  "je manque",
  "j'ai du mal",
  "jai du mal",
  "je galere",
  "je galère",
  "je comprends pas",
  "je suis nul",
  "je suis mauvais",
  "c'est nul",
  "mauvais en",
  "mauvaise en",
  // Échec exprimé par le résultat
  "marche pas",
  "ca marche pas",
  "fonctionne pas",
  "ca rate",
  "ca foire",
  "ca part",
  "ca sort",
  "ca tombe",
  "part mal",
  "n'importe ou",
  "nimporte ou",
  "trop court",
  "trop courte",
  "trop long",
  "trop longue",
  "pas assez",
  // Récurrence
  "a chaque fois",
  "tout le temps",
  "systematiquement",
  "probleme",
  "problème",
  "souci",
];

export function isDiagnosticQuestion(message: string): boolean {
  const normalized = normalizeForMatch(message);
  return DIAGNOSIS_MARKERS.some((marker) => normalized.includes(normalizeForMatch(marker)));
}

/**
 * Leviers de progression par compétence.
 *
 * Répondre « comment améliorer ma détente ? » par le mode d'emploi d'un
 * exercice, c'est répondre à côté : la question porte sur ce qu'il faut
 * travailler, pas sur la façon d'exécuter un mouvement. Chaque entrée dit
 * donc d'abord sur quoi agir, et par quoi commencer — les exercices viennent
 * après, en illustration.
 *
 * Les leviers sont classés par rentabilité : le premier est celui qui fait
 * gagner le plus vite, pas le plus impressionnant.
 */
interface SkillLevers {
  label: string;
  objective: string;
  /** Compétence correspondante côté application, pour proposer une séance. */
  skill: string;
  keywords: string[];
  keywordPairs?: string[][];
  levers: string[];
  startHere: string;
  /** Ajoute le garde-fou blessure (travail à fort impact). */
  highImpact?: boolean;
}

const SKILL_LEVERS: SkillLevers[] = [
  {
    label: "ta détente",
    skill: "detente",
    objective: "detente",
    keywords: ["detente", "sauter", "saut", "sauts", "impulsion", "verticale", "monter plus haut"],
    highImpact: true,
    levers: [
      "**La technique de saut.** C'est le levier le plus rentable et presque toujours le plus négligé : un lancer de bras coordonné et un dernier appui bien freiné font gagner plusieurs centimètres sans le moindre progrès physique. Ça se règle en quelques séances.",
      "**La force des jambes.** C'est la base sur laquelle tout le reste s'appuie. Sans force, il n'y a rien à convertir en hauteur. Squats, fentes, montées de banc.",
      "**L'explosivité.** Convertir cette force en saut passe par des contacts au sol très brefs : sauts courts, rebonds, corde à sauter. C'est ce qui fait la différence entre être fort et sauter haut.",
      "**La mobilité de cheville.** Une cheville raide t'empêche de descendre assez pour armer le saut. C'est un frein invisible, et c'est le plus rapide à lever.",
      "**La récupération.** La détente se construit au repos, pas dans le volume. Deux séances de sauts par semaine au maximum, jamais deux jours de suite.",
    ],
    startHere:
      "Commence par la technique et la mobilité : ce sont les deux seuls leviers qui donnent des résultats en deux ou trois semaines. La force et l'explosivité, elles, se comptent en mois.",
  },
  {
    label: "ta réception",
    skill: "reception",
    objective: "reception",
    keywords: ["reception", "receptionner", "manchette", "manchettes"],
    levers: [
      "**La lecture et le départ.** Les bonnes réceptions se jouent avant le contact : partir à la frappe adverse, pas quand le ballon arrive.",
      "**La stabilité de la plateforme.** Bras verrouillés, angle constant du début à la fin. C'est ce qui transforme une réception aléatoire en réception répétable.",
      "**Le jeu de jambes.** Arriver avant le ballon et être arrêté au contact. La direction se perd presque toujours parce qu'on touche en mouvement.",
      "**L'orientation des épaules.** Le ballon repart dans l'axe de ta plateforme : les épaules se tournent vers le passeur avant le contact, jamais pendant.",
      "**Le volume.** La réception est un geste d'automatisme. Le mur est imbattable pour ça : des centaines de répétitions seul, sans partenaire.",
    ],
    startHere:
      "Si tu ne dois travailler qu'une chose : arriver arrêté. Accepte de renvoyer moins fort mais d'être stable, le reste suivra tout seul.",
  },
  {
    label: "ton service",
    skill: "service",
    objective: "service",
    keywords: ["service", "servir", "sers", "engagement"],
    levers: [
      "**La régularité du lancer.** C'est le levier numéro un, et de très loin. Un service irrégulier est presque toujours un lancer irrégulier. Ça se travaille seul, sans même frapper.",
      "**Le point de contact.** Bras tendu, au point le plus haut, derrière le ballon. Frapper plus bas coûte de la marge sur toute la trajectoire.",
      "**Le transfert du poids.** La puissance vient du déplacement du corps vers l'avant, pas de la force du bras. C'est aussi ce qui protège l'épaule.",
      "**Le ciblage.** Servir fort sans viser ne sert à rien. Travailler des zones précises rend le service utile en match.",
      "**La routine.** Sous pression, seul l'automatisme tient. Même préparation, même nombre de rebonds, même rythme à chaque service.",
    ],
    startHere:
      "Commence par vingt lancers sans frapper, en cherchant à faire retomber le ballon toujours au même endroit. C'est austère, et c'est ce qui change le plus de choses.",
  },
  {
    label: "ton attaque",
    skill: "attaque",
    objective: "attaque",
    keywords: ["attaque", "attaquer", "smash", "smasher", "frapper fort", "spike"],
    highImpact: true,
    levers: [
      "**La course d'élan.** Un élan bien réglé, avec un dernier appui freiné, donne à la fois la hauteur et le placement sous le ballon. C'est la fondation de tout le reste.",
      "**L'armé précoce.** Le bras doit être armé pendant la montée, pas une fois en l'air. Un armé tardif fait frapper le ballon déjà descendu.",
      "**Le fouetté du poignet.** C'est lui qui fait retomber le ballon dans le terrain. Sans lui, il faut brider la frappe pour ne pas sortir.",
      "**La lecture du bloc.** Voir les mains adverses pendant la montée permet de choisir. Sans ça, tu frappes au hasard.",
      "**La variété.** Ligne, diagonale, amorti : un attaquant prévisible se fait bloquer quelle que soit sa puissance.",
    ],
    startHere:
      "Règle la course d'élan avant tout le reste. La puissance et la variété ne servent à rien si tu arrives mal placé sous le ballon.",
  },
  {
    label: "ton bloc",
    skill: "bloc",
    objective: "bloc",
    keywords: ["bloc", "bloqu", "contrer"],
    highImpact: true,
    levers: [
      "**La lecture du passeur.** Le bloc commence aux mains du passeur. C'est ce qui sépare un bloc qui arrive à temps d'un bloc qui court après le ballon.",
      "**Le déplacement.** Pas chassés sur les courtes distances, pas croisés au-delà de trois mètres, et toujours un appui d'arrêt avant de sauter.",
      "**Le timing.** On part après l'attaquant, jamais avec lui. C'est contre-intuitif et c'est la faute la plus fréquente.",
      "**La pénétration des mains.** Passer les mains au-dessus du filet plutôt que de les laisser en dessous change complètement l'efficacité.",
      "**La détente sans élan.** Le bloc se saute à l'arrêt : c'est une qualité différente de la détente d'attaque, et elle se travaille à part.",
    ],
    startHere:
      "Pendant une séance entière, force-toi à regarder le passeur et non le ballon. C'est désagréable au début, et ça règle le timing plus vite que n'importe quel exercice physique.",
  },
  {
    label: "ta passe",
    skill: "passe",
    objective: "precision",
    keywords: ["passe", "passer", "passeur", "touche haute", "distribuer"],
    levers: [
      "**Le placement sous le ballon.** Une passe précise est d'abord un déplacement réussi. Les mains ne rattrapent jamais un mauvais placement.",
      "**Le contact bref.** Repousser au lieu d'accompagner : c'est ce qui évite les ballons tenus et donne de la vitesse à la passe.",
      "**Le transfert des jambes.** La distance vient des jambes et du tronc, pas des doigts. Les passes courtes sont presque toujours des passes sans appui arrière.",
      "**La régularité de la hauteur.** Un attaquant a besoin de la même passe à chaque fois. La constance vaut mieux que la variété tant qu'elle n'est pas acquise.",
      "**La passe arrière.** Elle se travaille séparément : on y passe sans voir la cible, donc tout se joue sur l'information prise avant.",
    ],
    startHere:
      "Travaille au mur en passes courtes et sèches. L'enchaînement rapide corrige à la fois le contact trop long et le placement.",
  },
  {
    label: "ta défense",
    skill: "defense",
    objective: "defense",
    keywords: ["defense", "defendre", "recuperer des ballons", "plongeon"],
    levers: [
      "**La position d'attente.** Être déjà bas, poids sur l'avant des pieds, avant que l'attaquant frappe. Tout le reste en découle.",
      "**La lecture de l'attaquant.** La direction se lit sur l'épaule et la main, un temps avant le contact. Attendre de voir le ballon, c'est partir en retard.",
      "**Le premier appui.** La défense se joue sur un pas, pas sur une course.",
      "**La technique au sol.** Savoir se laisser tomber et se relever vite permet d'oser des ballons qu'on laisserait sinon.",
      "**Le réengagement.** Une défense n'est finie que lorsque tu es replacé pour la suivante.",
    ],
    startHere:
      "Prends la position basse deux secondes avant chaque attaque adverse, même si ça te paraît trop tôt. C'est le réglage qui rapporte le plus.",
  },
  {
    label: "tes déplacements",
    skill: "deplacements",
    objective: "vitesse",
    keywords: ["deplacement", "deplacements", "appuis", "vitesse", "rapidite", "etre plus rapide", "agilite"],
    levers: [
      "**La position d'attente.** Démarrer jambes tendues coûte une demi-seconde, ce qui suffit à arriver en retard sur tout.",
      "**Le premier appui.** La vitesse au volley se joue sur le premier pas, jamais sur la course. C'est ça qu'il faut travailler.",
      "**Le choix du pas.** Pas chassés sur les courtes distances, pas croisés au-delà : croiser sur trois mètres fait perdre l'équilibre à l'arrivée.",
      "**Le freinage.** Savoir s'arrêter net compte autant que savoir partir vite — sans appui d'arrêt, tu dépasses le ballon.",
      "**La vitesse de réaction.** Partir sur un signal, pas sur une décision consciente.",
    ],
    startHere:
      "Travaille des départs sur trois mètres depuis la position basse. C'est court, peu fatigant, et c'est exactement la distance du volley.",
  },
  {
    label: "ton physique",
    skill: "renforcement",
    objective: "global",
    keywords: ["physique", "renforcement", "muscler", "musculation", "plus fort", "condition"],
    levers: [
      "**La base de force.** Jambes et chaîne postérieure d'abord : c'est ce qui soutient le saut, les appuis et la protection des articulations.",
      "**Le gainage.** Le tronc transmet la force des jambes aux bras. Un gainage faible fait perdre en route ce que les jambes produisent.",
      "**L'équilibre du corps.** Au volley, l'épaule encaisse beaucoup : la renforcer et travailler la coiffe des rotateurs n'est pas optionnel.",
      "**La prévention.** Chevilles et genoux sont les zones à risque du volley. Les renforcer coûte peu et évite les arrêts longs.",
      "**La progressivité.** Les blessures viennent presque toujours d'une charge augmentée trop vite, rarement d'un exercice mal choisi.",
    ],
    startHere:
      "Deux séances par semaine suffisent largement. Le volley reste la priorité : le physique est là pour le servir, pas l'inverse.",
  },
  {
    label: "ta mobilité",
    skill: "mobilite",
    objective: "global",
    keywords: ["mobilite", "souplesse", "etirement", "etirements", "raide", "amplitude"],
    levers: [
      "**Les chevilles.** Elles conditionnent la profondeur de tes appuis, donc ton saut et ta défense. C'est la zone la plus rentable au volley.",
      "**Les hanches.** Sans amplitude, impossible de tenir une position basse sans compenser avec le dos.",
      "**Les épaules.** Amplitude et santé de l'épaule vont ensemble quand on frappe des centaines de ballons.",
      "**Le rythme.** Dynamique avant la séance, statique après ou à distance. S'étirer longuement avant de jouer diminue la puissance.",
      "**La régularité.** Dix minutes tous les jours valent mieux qu'une heure le dimanche.",
    ],
    startHere:
      "Commence par les chevilles : c'est celle qui débloque le plus de choses ailleurs, et elle se gagne vite.",
  },
  {
    label: "ton endurance",
    skill: "renforcement",
    objective: "regularite",
    keywords: ["endurance", "fatigue", "essouffle", "tenir le match", "tenir un match", "souffle"],
    levers: [
      "**L'endurance de saut.** C'est elle qui lâche en fin de match, pas le souffle. Elle se travaille en répétant des séries de sauts, pas en courant.",
      "**L'intermittent.** Le volley est fait d'efforts courts et intenses entrecoupés de pauses. Un footing long prépare mal à ça.",
      "**La récupération entre les points.** Savoir faire redescendre le rythme cardiaque en quelques secondes se travaille comme le reste.",
      "**La lucidité sous fatigue.** Les fautes de fin de match sont plus souvent des fautes de décision que de jambes : s'entraîner fatigué habitue à ça.",
    ],
    startHere:
      "Termine tes séances par un bloc court d'efforts intermittents plutôt que par du footing. C'est plus spécifique et moins long.",
  },
];

/**
 * Marqueurs d'une question de progression : « comment améliorer ma détente »,
 * « je veux progresser en réception », « comment travailler mon service ».
 */
const IMPROVEMENT_MARKERS = [
  "ameliorer",
  "ameliore",
  "progresser",
  "progression",
  "travailler",
  "bosser",
  "developper",
  "augmenter",
  "gagner en",
  "devenir meilleur",
  "etre meilleur",
  "plus fort en",
  "comment avoir",
  "comment faire pour",
  "je veux",
  "j'aimerais",
  "jaimerais",
  "muscler",
  "renforcer",
  "des conseils",
  "conseils pour",
  // Formulations qui expriment un objectif sans employer de verbe de
  // progression. « comment » seul serait trop large : il attraperait les
  // questions de technique (« comment bien faire des squats sautés »).
  "tenir un match",
  "tenir le match",
  "tenir tout le match",
  "comment tenir",
  "comment eviter",
  "comment ne plus",
];

export function isImprovementQuestion(message: string): boolean {
  const normalized = normalizeForMatch(message);
  return IMPROVEMENT_MARKERS.some((marker) => normalized.includes(normalizeForMatch(marker)));
}

/**
 * Diagnostics par symptôme précis.
 *
 * « Mon service part dans le filet » et « mon service sort » ne partagent
 * aucune cause : répondre la même liste générique aux deux serait inutile.
 * Une entrée ne se déclenche que si la phrase contient à la fois un mot du
 * geste ET un mot du symptôme — ce qui rend la reconnaissance sûre sans
 * dépendre d'une formulation précise.
 */
interface SymptomDiagnosis {
  gestureWords: string[];
  /**
   * Gestes qui ne se désignent qu'en plusieurs mots : « passe arrière » ne
   * peut pas être reconnu par un mot isolé, « passe » et « arrière » pris
   * séparément désignent tout autre chose. Chaque combinaison doit être
   * présente en entier.
   */
  gesturePairs?: string[][];
  symptomWords: string[];
  objective: string;
  title: string;
  causes: string[];
  /** La correction à tenter en premier, celle qui règle le cas le plus souvent. */
  fix: string;
}

const SERVICE_WORDS = ["service", "services", "sers", "servir", "engagement"];
const ATTACK_WORDS = ["attaque", "attaques", "smash", "smasher", "frappe", "spike", "attaquer"];
const RECEPTION_WORDS = ["manchette", "manchettes", "reception", "receptions", "receptionne", "receptionner"];
const SET_WORDS = ["passe", "passes", "touche haute", "doigts", "passeur"];
// « bloque » et « bloqué » s'écrivent avec un q : chercher « bloc » ne les
// reconnaît pas. Le radical « bloqu » couvre toutes les formes conjuguées.
const BLOCK_WORDS = ["bloc", "blocs", "bloqu", "contre"];
const JUMP_WORDS = ["saut", "sauter", "saute", "detente", "impulsion", "monte"];
const DEFENSE_WORDS = ["defense", "defendre", "plongeon", "recuperer", "sauver"];

const SYMPTOM_DIAGNOSES: SymptomDiagnosis[] = [
  // ----- Service ---------------------------------------------------------
  {
    gestureWords: SERVICE_WORDS,
    symptomWords: ["filet", "trop bas", "tombe", "n'arrive pas de l'autre", "narrive pas de l'autre"],
    objective: "service",
    title: "Ton service tombe dans le filet",
    causes: [
      "**Le lancer est trop en avant.** Si le ballon part devant toi, tu le frappes en descente : la trajectoire plonge forcément. Le lancer doit monter devant l'épaule qui frappe, pas devant le corps.",
      "**Tu frappes trop bas.** Le contact doit se faire bras tendu, au point le plus haut. Frapper coude plié abaisse le point de sortie de trente centimètres, ce qui suffit à accrocher la bande.",
      "**Tu freines la frappe.** Par peur de la faute, beaucoup ralentissent le bras au contact : le ballon perd la vitesse qui le porterait par-dessus.",
    ],
    fix:
      "Corrige le lancer d'abord, pas la frappe. Fais vingt lancers sans frapper en cherchant à ce que le ballon retombe toujours au même endroit, légèrement devant ton épaule de frappe.",
  },
  {
    gestureWords: SERVICE_WORDS,
    symptomWords: ["sort", "dehors", "trop long", "trop fort", "derriere la ligne", "hors"],
    objective: "service",
    title: "Ton service sort derrière",
    causes: [
      "**Le lancer part en arrière.** Un ballon lancé au-dessus ou derrière la tête t'oblige à frapper en te cambrant : la trajectoire monte et file trop loin.",
      "**Tu frappes sous le ballon.** Un contact sous l'équateur lui donne une trajectoire montante. Il faut frapper derrière le ballon, légèrement au-dessus du centre.",
      "**Le poignet ne casse pas.** Sans le fouetté du poignet vers le bas en fin de frappe, rien ne fait redescendre le ballon dans le terrain.",
    ],
    fix:
      "Concentre-toi sur la fin du geste : le poignet doit finir cassé vers le sol, la main terminant plus bas que le point de contact.",
  },
  {
    gestureWords: SERVICE_WORDS,
    symptomWords: ["pas de puissance", "pas assez fort", "mou", "faible", "trop mou"],
    objective: "service",
    title: "Ton service manque de puissance",
    causes: [
      "**Tu frappes avec le bras seul.** La puissance vient du transfert du poids de l'arrière vers l'avant et de la rotation des épaules, pas de la force du bras.",
      "**Le contact n'est pas sec.** Une main molle ou ouverte absorbe l'énergie. La main doit être ferme, le contact bref.",
      "**L'armé est incomplet.** Si le coude ne part pas assez haut et assez en arrière, il n'y a pas de course de bras pour accélérer.",
    ],
    fix:
      "Sers en partant d'un pas : pied arrière posé, transfert vers l'avant pendant l'armé. Tu gagneras plus de vitesse qu'en cherchant à frapper plus fort.",
  },
  // ----- Attaque ---------------------------------------------------------
  {
    gestureWords: ATTACK_WORDS,
    symptomWords: ["filet", "dans le filet", "tombe", "trop bas"],
    objective: "attaque",
    title: "Tes attaques finissent dans le filet",
    causes: [
      "**Tu es trop près du filet au moment de frapper.** Une course d'élan qui t'amène sous le ballon ferme complètement l'angle : il ne reste plus que le filet devant toi. On attaque avec le ballon devant soi, pas au-dessus de la tête.",
      "**Tu frappes le ballon déjà descendu.** Partir trop tard oblige à frapper en dessous du point optimal, et la trajectoire pique.",
      "**Le bras n'est pas tendu au contact.** Frapper coude plié abaisse le point de frappe et supprime tout angle par-dessus le bloc.",
    ],
    fix:
      "Recule ton point de départ d'un mètre. La majorité des attaques dans le filet viennent d'une course trop courte, pas d'un défaut de frappe.",
  },
  {
    gestureWords: ATTACK_WORDS,
    symptomWords: ["sort", "dehors", "trop long", "hors"],
    objective: "attaque",
    title: "Tes attaques sortent",
    causes: [
      "**Tu frappes sous le ballon.** Le contact doit se faire derrière et légèrement au-dessus du centre, jamais dessous.",
      "**Le poignet ne casse pas.** C'est le fouetté du poignet qui fait retomber le ballon dans le terrain. Sans lui, tout part en cloche.",
      "**Tu cherches la puissance maximale.** À vitesse de bras maximale, la marge d'erreur disparaît. Un attaquant régulier frappe à environ 80 % et vise une zone.",
    ],
    fix:
      "Travaille la frappe main haute en visant le sol à trois mètres du filet : cela force mécaniquement le poignet à casser.",
  },
  {
    // « je me fais bloquer » décrit un problème d'attaque même sans le mot :
    // ces tournures valent donc mot de geste à elles seules. L'entrée est
    // placée avant celles du bloc pour que « bloquer » ne soit pas lu comme
    // une question sur la façon de bloquer.
    gestureWords: [...ATTACK_WORDS, "me fais bloquer", "fais bloquer", "font bloquer", "me bloque", "suis bloque"],
    symptomWords: ["bloqu", "contre", "mur", "systematiquement", "a chaque fois", "tout le temps"],
    objective: "attaque",
    title: "Tu te fais bloquer systématiquement",
    causes: [
      "**Tu attaques toujours dans la même direction.** Un bloc lit la répétition en deux ou trois attaques. Alterner ligne et diagonale suffit souvent à tout débloquer.",
      "**Tu ne regardes pas le bloc.** Il faut voir les mains adverses pendant la montée, pas après la frappe. C'est ce regard qui permet de choisir.",
      "**Tu n'utilises jamais les mains du bloc.** Frapper volontairement sur le bord extérieur des mains pour sortir le ballon est une arme, pas un échec.",
    ],
    fix:
      "À la prochaine séance, impose-toi d'annoncer à voix haute la direction avant de sauter, puis de la changer une fois sur deux. L'objectif n'est pas de marquer, c'est de reprendre l'habitude de choisir.",
  },
  // ----- Réception -------------------------------------------------------
  {
    gestureWords: RECEPTION_WORDS,
    symptomWords: ["n'importe ou", "nimporte ou", "partout", "imprecise", "imprecis", "jamais au bon endroit"],
    objective: "reception",
    title: "Tes réceptions partent n'importe où",
    causes: [
      "**La plateforme bouge au contact.** Coudes qui plient, épaules qui montent, poignets qui cassent : chaque micro-mouvement change l'angle de rebond. La plateforme doit rester figée du début à la fin.",
      "**Tes épaules ne sont pas orientées vers la cible.** Le ballon repart dans l'axe de tes avant-bras. Si les épaules regardent ailleurs que le passeur, la direction est déjà perdue avant le contact.",
      "**Tu touches le ballon en te déplaçant.** Le moindre pas pendant le contact déporte la trajectoire.",
    ],
    fix:
      "Une seule consigne à la fois : arriver arrêté. Accepte de renvoyer moins bien mais d'être immobile au contact, la direction se stabilisera d'elle-même.",
  },
  {
    gestureWords: RECEPTION_WORDS,
    symptomWords: ["derriere", "trop loin", "trop long", "depasse", "par dessus"],
    objective: "reception",
    title: "Tes réceptions partent trop loin derrière",
    causes: [
      "**Ta plateforme est trop verticale.** Plus les bras se rapprochent de l'horizontale, plus le ballon file loin. Les bras doivent pointer vers le bas, vers la cible.",
      "**Tu pousses avec les bras.** Un coup de bras ajoute une vitesse que tu ne contrôles pas. Les bras ne font qu'orienter, ce sont les jambes qui dosent.",
      "**Tu es trop bas sous le ballon.** Le prendre trop près du sol oblige à le relever brutalement.",
    ],
    fix:
      "Bloque tes bras et ne renvoie qu'avec les jambes. Le simple fait de supprimer le coup de bras corrige la longueur dans la grande majorité des cas.",
  },
  {
    gestureWords: RECEPTION_WORDS,
    symptomWords: ["trop court", "trop courte", "tombe devant", "atteint pas", "arrive pas au passeur"],
    objective: "reception",
    title: "Tes réceptions sont trop courtes",
    causes: [
      "**Tu absorbes au lieu de relayer.** Reculer les bras au contact amortit le ballon et lui enlève toute la hauteur nécessaire.",
      "**Tes jambes ne s'étendent pas.** Sans extension, il n'y a aucune énergie pour envoyer le ballon jusqu'au passeur.",
      "**Tu prends le ballon trop haut sur la plateforme.** Près des coudes, le ballon meurt.",
    ],
    fix:
      "Vise volontairement trois mètres au-dessus du passeur. Chercher la hauteur plutôt que la distance corrige la longueur sans y penser.",
  },
  // ----- Passe arrière ---------------------------------------------------
  // Placée avant la passe avant : « mes passes arrière sont trop courtes »
  // ne doit pas recevoir le diagnostic d'une passe classique, les causes
  // n'étant pas les mêmes — on passe sans voir la cible.
  {
    gestureWords: [],
    gesturePairs: [["passe", "arriere"], ["passes", "arriere"], ["passe", "derriere"], ["passer", "derriere"]],
    symptomWords: ["trop court", "trop courte", "courte", "atteint pas", "pas assez loin", "retombe", "trop plate"],
    objective: "precision",
    title: "Tes passes arrière sont trop courtes",
    causes: [
      "**Tu te cambres au lieu de pousser.** Partir en arrière avec le buste donne l'impression d'envoyer le ballon derrière, mais ça supprime l'extension des bras — celle qui donne réellement la distance. Et ça sollicite le bas du dos pour rien.",
      "**Le ballon est pris trop devant.** Sur une passe arrière, le contact se fait un peu plus haut et plus reculé que sur une passe avant : au-dessus du front, voire légèrement derrière. Pris devant, le ballon ne peut plus partir loin en arrière.",
      "**L'extension des bras est incomplète.** La distance se joue en toute fin de geste : coudes totalement tendus, mains qui finissent derrière la tête. Un geste arrêté à mi-course donne une passe courte à chaque fois.",
    ],
    fix:
      "Garde le buste droit et pousse vers le haut et l'arrière avec les bras, pas avec le dos. Vise nettement plus haut que ce qui te semble nécessaire : une passe arrière trop courte est presque toujours une passe pas assez haute.",
  },
  {
    gestureWords: [],
    gesturePairs: [["passe", "arriere"], ["passes", "arriere"], ["passe", "derriere"], ["passer", "derriere"]],
    symptomWords: ["n'importe ou", "nimporte ou", "partout", "imprecise", "imprecis", "jamais au bon endroit", "rate", "loupe", "marche pas"],
    objective: "precision",
    title: "Tes passes arrière partent n'importe où",
    causes: [
      "**Tu passes sans avoir repéré ton attaquant.** C'est la particularité de la passe arrière : tu ne vois pas la cible au moment du contact. Sa position doit donc être mémorisée **pendant que le ballon monte vers toi**, pas cherchée après.",
      "**Le ballon n'est pas exactement au-dessus du front.** Pris devant ou sur le côté, il devient impossible d'en contrôler la direction à l'aveugle.",
      "**Tes épaules ne sont pas dans l'axe.** En passe arrière, l'axe des épaules remplace le regard : s'il ne pointe pas vers la cible avant le contact, la balle part ailleurs.",
      "**Une main pousse plus que l'autre.** Un contact asymétrique dévie toujours du même côté — si tes passes ratées partent systématiquement à gauche ou à droite, c'est probablement ça.",
    ],
    fix:
      "Avant chaque passe arrière, jette un coup d'œil à ton attaquant pendant que le ballon monte. La précision vient de cette information prise en avance, pas du geste lui-même.",
  },
  // ----- Passe -----------------------------------------------------------
  {
    gestureWords: SET_WORDS,
    symptomWords: ["porte", "portee", "tenue", "faute", "siffle", "arbitre"],
    objective: "precision",
    title: "On te siffle des ballons tenus en passe",
    causes: [
      "**Le contact dure trop longtemps.** Le ballon doit être repoussé au moment où il touche les doigts, pas accompagné. Plus tu essaies de contrôler, plus tu tiens.",
      "**Tes mains sont trop basses.** Prendre le ballon devant le visage oblige à l'accompagner vers le haut. Les mains doivent être au-dessus du front.",
      "**Tu n'es pas placé sous le ballon.** Passer en déséquilibre force à rattraper avec les mains, donc à tenir.",
    ],
    fix:
      "Travaille des passes courtes et sèches contre un mur : l'enchaînement rapide rend le ballon tenu impossible.",
  },
  {
    gestureWords: SET_WORDS,
    symptomWords: ["trop court", "trop courte", "courte", "atteint pas", "pas assez loin"],
    objective: "precision",
    title: "Tes passes sont trop courtes",
    causes: [
      "**Aucun transfert de poids.** Sans un pied en retrait qui pousse vers l'avant, la passe ne part que des bras.",
      "**Les jambes ne participent pas.** Une passe longue est un mouvement de tout le corps : jambes, tronc, puis bras.",
      "**Tu freines le geste.** L'extension des bras doit aller jusqu'au bout, les coudes complètement tendus en fin de passe.",
    ],
    fix:
      "Fais dix passes en fente, pied arrière marqué, en cherchant à finir bras totalement tendus. La distance vient de là, pas de la force des doigts.",
  },
  // ----- Bloc ------------------------------------------------------------
  {
    gestureWords: BLOCK_WORDS,
    symptomWords: ["touche le filet", "filet", "faute de filet"],
    objective: "bloc",
    title: "Tu touches le filet au bloc",
    causes: [
      "**Tu sautes vers l'avant.** Un saut de bloc est strictement vertical. Toute avancée te fait dériver dans le filet.",
      "**Tu es trop près au départ.** Il faut une largeur de main entre toi et le filet avant de sauter.",
      "**Tu redescends les bras devant.** Les bras doivent revenir sur les côtés, pas retomber à travers le filet.",
    ],
    fix:
      "Refais des blocs sans ballon en te concentrant uniquement sur la descente : la faute vient beaucoup plus souvent du retour des bras que de la montée.",
  },
  {
    gestureWords: BLOCK_WORDS,
    symptomWords: ["entre les mains", "passe entre", "traverse", "trou", "au milieu"],
    objective: "bloc",
    title: "Le ballon passe entre tes mains",
    causes: [
      "**Tes mains sont trop écartées.** L'écart doit être inférieur au diamètre d'un ballon, pouces presque joints.",
      "**Tes doigts sont relâchés.** Des mains molles s'ouvrent à l'impact. Doigts écartés et fermes, paumes tournées vers le terrain adverse.",
      "**Tes bras sont fléchis.** Les coudes doivent rester tendus : un bras plié cède au contact.",
    ],
    fix:
      "Vérifie l'écart de tes mains au sol, immobile, avant de travailler au filet. C'est un réglage, pas une qualité physique.",
  },
  {
    gestureWords: BLOCK_WORDS,
    symptomWords: ["retard", "trop tard", "jamais a temps", "jamais le temps", "arrive pas", "trop lent"],
    objective: "bloc",
    title: "Tu arrives systématiquement en retard au bloc",
    causes: [
      "**Tu pars sur le ballon et non sur le passeur.** La lecture commence aux mains du passeur : attendre de voir le ballon partir coûte un temps irrattrapable.",
      "**Ton déplacement est trop long.** En pas chassés sur les courtes distances, en pas croisés uniquement au-delà de trois mètres.",
      "**Tu n'es pas en position d'attente.** Démarrer jambes tendues ajoute une demi-seconde.",
    ],
    fix:
      "Pendant une séance entière, force-toi à regarder le passeur et non le ballon. C'est désagréable au début et ça change tout après deux ou trois séances.",
  },
  // ----- Détente ---------------------------------------------------------
  {
    gestureWords: JUMP_WORDS,
    symptomWords: ["pas haut", "pas assez haut", "faible", "stagne", "progresse pas", "bas"],
    objective: "detente",
    title: "Tu ne sautes pas assez haut",
    causes: [
      "**Tes bras ne servent à rien.** Un lancer de bras coordonné apporte à lui seul plusieurs centimètres. S'ils restent en bas, tu sautes avec les jambes uniquement.",
      "**Ton dernier appui n'est pas freiné.** Sans appui d'arrêt net, la vitesse de course ne se transforme pas en hauteur.",
      "**Ta descente est trop lente.** La détente vient du cycle étirement-détente : plus le contact au sol est bref, plus tu montes. Un squat lent avant de sauter perd toute l'élasticité.",
    ],
    fix:
      "Filme ton saut de côté. Si tes bras partent après tes jambes, c'est là qu'est ta marge — et c'est la plus rapide à récupérer.",
  },
  // ----- Défense ---------------------------------------------------------
  {
    gestureWords: DEFENSE_WORDS,
    symptomWords: [
      "retard",
      "trop tard",
      "arrive pas",
      "jamais a temps",
      "jamais le temps",
      "trop rapide",
      "trop lent",
      "pas le temps",
    ],
    objective: "defense",
    title: "Tu n'arrives jamais à temps en défense",
    causes: [
      "**Tu es immobile au moment de la frappe.** Un défenseur est déjà bas et en appui avant que l'attaquant frappe, jamais après.",
      "**Ton poids est sur les talons.** Impossible de démarrer. Le poids doit être sur l'avant des pieds.",
      "**Tu regardes le ballon.** La direction se lit sur l'épaule et la main de l'attaquant, un temps avant le contact.",
    ],
    fix:
      "Prends la position basse deux secondes avant chaque attaque adverse, même si ça te paraît trop tôt. C'est ce décalage qui fait toute la différence.",
  },
  // ----- Écart entraînement / match --------------------------------------
  {
    gestureWords: ["match", "matchs", "matches", "competition", "tournoi"],
    symptomWords: ["rate", "moins bien", "pas pareil", "stress", "stresse", "j'y arrive plus", "jy arrive plus"],
    objective: "competition",
    title: "Tu réussis à l'entraînement mais pas en match",
    causes: [
      "**Tes entraînements sont trop confortables.** Répéter un geste sans pression ne prépare pas à l'exécuter sous pression. Il faut mettre un enjeu : compter les points, s'imposer une conséquence en cas d'échec.",
      "**Tu n'as pas de routine.** Sous stress, ce qui tient, c'est l'automatisme. Une routine identique avant chaque service ou réception donne un point d'ancrage.",
      "**Tu joues pour ne pas rater.** Chercher à éviter la faute crispe le geste et produit exactement la faute redoutée. En match, on choisit une intention, pas une précaution.",
    ],
    fix:
      "À ta prochaine séance, annonce le score à voix haute pendant tes exercices et joue-les comme des balles de match. L'écart entraînement/match se réduit en rendant l'entraînement moins confortable, pas en s'entraînant plus.",
  },
];

/**
 * Causes d'échec par geste, classées de la plus fréquente à la moins fréquente.
 *
 * Ce corpus est fixe et relu : le moteur ne « devine » jamais une cause, il
 * présente celles qui expliquent réellement la majorité des ratés sur ce geste
 * et laisse le joueur identifier la sienne. `objective` sert à aller chercher
 * les exercices correspondants dans la bibliothèque.
 */
interface GestureDiagnosis {
  label: string;
  objective: string;
  keywords: string[];
  /** Gestes désignés par plusieurs mots (voir `gesturePairs` ci-dessus). */
  keywordPairs?: string[][];
  causes: string[];
  selfCheck: string;
}

const GESTURE_DIAGNOSES: GestureDiagnosis[] = [
  {
    label: "la manchette / réception",
    objective: "reception",
    keywords: ["manchette", "manchettes", "reception", "receptionne", "receptions", "bras"],
    causes: [
      "**La plateforme casse au contact.** Les coudes plient ou les épaules montent au moment où le ballon arrive : la surface de rebond change d'angle et le ballon part n'importe où. La plateforme doit rester figée, c'est le corps entier qui bouge.",
      "**Le contact est mal placé.** Trop près des poignets, ça fuse ; trop près des coudes, ça meurt. La zone utile est le tiers central des avant-bras.",
      "**Les jambes ne travaillent pas.** Si tu pousses avec les bras pour envoyer le ballon, tu perds tout contrôle. L'énergie vient de l'extension des jambes, les bras ne font qu'orienter.",
      "**Tu es encore en mouvement au contact.** Toucher le ballon en te déplaçant déporte la trajectoire. Il faut arriver avant le ballon et être arrêté, même une demi-seconde.",
      "**Les épaules ne visent pas la cible.** La balle part dans l'axe de ta plateforme : si tes épaules ne sont pas orientées vers le passeur avant le contact, elle ira ailleurs.",
    ],
    selfCheck:
      "Pour trouver laquelle te concerne : filme-toi **de côté** sur dix réceptions. Les trois premières causes se voient immédiatement à l'image, bien plus vite qu'en cherchant à le sentir.",
  },
  {
    label: "la passe arrière",
    objective: "precision",
    keywords: [],
    keywordPairs: [["passe", "arriere"], ["passes", "arriere"], ["passe", "derriere"], ["passer", "derriere"]],
    causes: [
      "**Tu passes sans avoir repéré la cible.** Sur une passe arrière tu ne vois pas ton attaquant : sa position doit être prise pendant que le ballon monte vers toi. Sans cette information, tout le reste du geste est au hasard.",
      "**Le ballon n'est pas au-dessus du front.** C'est le placement qui rend la passe arrière contrôlable, plus encore que sur une passe avant, puisque tu ne peux pas corriger à vue.",
      "**Tu te cambres au lieu de pousser avec les bras.** Le buste qui part en arrière remplace l'extension des bras : la passe perd sa distance et sa régularité, et le bas du dos encaisse.",
      "**Tes épaules ne sont pas orientées avant le contact.** L'axe des épaules remplace le regard : il se règle avant, jamais pendant.",
    ],
    selfCheck:
      "Filme-toi **de côté** : si ton buste part en arrière avant tes bras, tu tiens ta cause principale. C'est de loin le défaut le plus répandu sur ce geste.",
  },
  {
    label: "la passe / touche haute",
    objective: "precision",
    keywords: ["passe", "passes", "touche haute", "doigts", "passeur"],
    causes: [
      "**Le contact est trop bas ou trop tard.** Les mains doivent être prêtes au-dessus du front *avant* que le ballon arrive, pas au moment où il arrive.",
      "**Les doigts sont mous ou trop tendus.** Trop mous, la balle s'enfonce et tu fais une faute ; trop rigides, elle rebondit sans contrôle. Les doigts absorbent puis repoussent.",
      "**Tu n'es pas sous le ballon.** Passer de profil ou en reculant enlève toute précision. Il faut se placer pour avoir le ballon au-dessus du front, pas devant soi.",
      "**Pas d'appui arrière.** Sans un pied légèrement en retrait, aucun transfert de poids : la passe part uniquement des bras et manque de portée.",
    ],
    selfCheck:
      "Un test simple : passe contre un mur dix fois de suite sans bouger les pieds. Si tu dois te déplacer entre chaque, c'est ton placement qui est en cause, pas tes mains.",
  },
  {
    label: "le service",
    objective: "service",
    keywords: ["service", "services", "sers", "servir", "engagement"],
    causes: [
      "**Le lancer est irrégulier.** C'est la cause numéro un, loin devant les autres. Un lancer qui varie de vingt centimètres suffit à rendre la frappe aléatoire. Le lancer se travaille seul, sans frapper.",
      "**Le contact est décentré.** Frapper le ballon sur le côté au lieu du centre envoie la balle en rotation non voulue et dehors.",
      "**La frappe vient du bras seul.** Sans transfert du poids de l'arrière vers l'avant, il faut forcer avec l'épaule — ce qui dérègle la précision et fatigue vite.",
      "**Tu te précipites.** Un service raté vient très souvent d'une routine bâclée. Toujours la même préparation, le même nombre de rebonds, le même rythme.",
    ],
    selfCheck:
      "Test à faire maintenant : fais vingt lancers **sans frapper**, en visant de faire retomber le ballon au même endroit au sol. Si tu n'y arrives pas huit fois sur dix, ton problème est le lancer, pas la frappe.",
  },
  {
    label: "l'attaque",
    objective: "attaque",
    keywords: ["attaque", "attaques", "smash", "smasher", "frappe", "spike"],
    causes: [
      "**La course d'élan part trop tôt.** Partir avant que la passe soit lisible oblige à s'adapter en l'air. Le départ se déclenche quand la trajectoire de la passe est établie.",
      "**Le dernier appui n'est pas freiné.** Sans un appui d'arrêt net, l'énergie horizontale ne se transforme pas en saut vertical : tu dérives sous le ballon.",
      "**Le bras n'est pas armé assez tôt.** Si l'armé se fait en montant, la frappe arrive en retard et tape le ballon déjà descendu.",
      "**Tu regardes le ballon, pas le bloc.** Frapper sans avoir vu les mains adverses, c'est frapper au hasard dans le bloc.",
    ],
    selfCheck:
      "Filme-toi **de face** : les deux premières causes se repèrent en une seule attaque au ralenti.",
  },
  {
    label: "le bloc",
    objective: "bloc",
    keywords: ["bloc", "blocs", "bloqu", "contre"],
    causes: [
      "**Tu sautes trop tôt.** Le bloc part après l'attaquant, pas avec lui. Sauter en même temps veut dire redescendre quand il frappe.",
      "**Les mains ne pénètrent pas.** Des mains qui restent au-dessus du filet renvoient au mieux ; des mains qui passent au-dessus du filet ferment vraiment l'angle.",
      "**Tu croises les pieds en te déplaçant.** Le déplacement au filet se fait en pas chassés : croiser déséquilibre à l'arrivée.",
      "**Tu regardes le ballon.** Le bloc se lit sur le passeur d'abord, puis sur l'épaule de l'attaquant — jamais sur le ballon seul.",
    ],
    selfCheck:
      "Le plus révélateur : demande à quelqu'un de te dire à voix haute quand tu décolles. Si c'est en même temps que l'attaquant, tu as ta réponse.",
  },
  {
    label: "la défense",
    objective: "defense",
    keywords: ["defense", "defenses", "defendre", "plongeon", "recuperer"],
    causes: [
      "**Ta position d'attente est trop haute.** On ne descend pas assez vite pour rattraper une balle basse : il faut déjà être bas avant la frappe adverse.",
      "**Le poids est sur les talons.** Impossible de démarrer vers l'avant. Le poids doit être sur l'avant des pieds, talons à peine décollés.",
      "**Tu t'arrêtes après une touche.** Une défense réussie qui n'est pas suivie d'un réengagement immédiat laisse le deuxième ballon passer.",
      "**Les mains se joignent trop tôt.** Joindre les mains avant d'être placé fige les épaules et enlève toute possibilité d'ajustement.",
    ],
    selfCheck:
      "Regarde tes appuis sur une vidéo de match : si tu es immobile au moment où l'attaquant frappe, tu pars toujours en retard.",
  },
  {
    label: "les déplacements",
    objective: "vitesse",
    keywords: ["deplacement", "deplacements", "appuis", "lent", "lente", "vitesse", "rapide"],
    causes: [
      "**Pas de position d'attente active.** Démarrer depuis une posture droite coûte une demi-seconde, ce qui suffit à arriver en retard sur tous les ballons.",
      "**Le premier appui est mou.** La vitesse se joue sur le premier pas, pas sur la course. Un premier appui poussé fort change tout.",
      "**Tu croises les pieds.** Sur les courtes distances, les pas chassés sont plus rapides et gardent l'équilibre à l'arrivée.",
      "**Tu pars après avoir vu le ballon.** Les bons défenseurs partent sur l'épaule de l'attaquant, un temps avant la frappe.",
    ],
    selfCheck:
      "Chronomètre-toi sur un aller-retour de six mètres, une fois depuis une posture droite, une fois depuis une position basse. L'écart te dira si ça vient de là.",
  },
];

/**
 * Les exercices de la bibliothèque concatènent tous leurs points de coaching
 * dans `tips` (200 caractères et plus). En lister trois tels quels noierait la
 * réponse : on ne garde que la première consigne, qui est la principale.
 */
function firstSentence(text: string | null): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  const end = trimmed.search(/[.!?](\s|$)/);
  return end === -1 ? trimmed : trimmed.slice(0, end + 1);
}

/**
 * Répond à une question de diagnostic : pourquoi le joueur rate ce geste, et
 * quels exercices de SA bibliothèque corrigent les causes citées.
 *
 * Renvoie `null` si aucun geste connu n'est reconnu — on ne fabrique pas un
 * diagnostic sur un geste qu'on n'a pas identifié.
 */
/**
 * Réponse du coach, éventuellement accompagnée d'une proposition de séance.
 *
 * `suggestedSkill` reprend le vocabulaire des catégories d'exercices de
 * l'application : l'écran de chat peut ainsi proposer un bouton qui lance
 * directement une séance ciblée sur ce point.
 */
export interface CoachReply {
  text: string;
  suggestedSkill?: string;
  suggestedLabel?: string;
}

/**
 * Objectif d'entraînement (colonne `exercises.objective`) → compétence de
 * l'application. Les deux vocabulaires ne coïncident pas partout : une passe
 * relève de l'objectif « précision », un travail de vitesse de la compétence
 * « déplacements ».
 */
const OBJECTIVE_TO_APP_SKILL: Record<string, string> = {
  reception: "reception",
  defense: "defense",
  attaque: "attaque",
  service: "service",
  bloc: "bloc",
  detente: "detente",
  precision: "passe",
  vitesse: "deplacements",
  regularite: "lecture_jeu",
};

function sessionOffer(label: string): string {
  return (
    `Tu veux que je te prépare une séance ciblée sur ${label} ? ` +
    `Je la construis avec les exercices de ta bibliothèque adaptés à ton poste et à ton niveau.`
  );
}

/**
 * Répond à une question de progression : sur quoi travailler pour avancer,
 * dans quel ordre, et avec quels exercices.
 *
 * C'est la réponse attendue pour « comment améliorer ma détente ? » — une
 * fiche d'exécution d'exercice serait hors sujet.
 */
export function findImprovementReply(
  message: string,
  exercises: ExerciseTechniqueInfo[],
  username: string
): CoachReply | null {
  if (!isImprovementQuestion(message)) return null;

  const normalized = normalizeForMatch(message);
  const skill = SKILL_LEVERS.find(
    (entry) =>
      entry.keywords.some((keyword) => normalized.includes(normalizeForMatch(keyword))) ||
      (entry.keywordPairs ?? []).some((pair) =>
        pair.every((keyword) => normalized.includes(normalizeForMatch(keyword)))
      )
  );
  // Sans compétence identifiée, on ne récite pas des généralités : la question
  // ouverte est renvoyée au moteur de règles, qui demande une précision.
  if (!skill) return null;

  const parts = [
    `Pour progresser sur ${skill.label}, ${username}, il y a plusieurs leviers — et ils ne se valent pas. ` +
      `Les voici du plus rentable au plus long à payer :`,
    skill.levers.map((lever, index) => `${index + 1}. ${lever}`).join("\n\n"),
    `**Par quoi commencer :** ${skill.startHere}`,
  ];

  if (skill.highImpact) parts.push(SAFETY_NOTICE);

  const exerciseBlock = relatedExercisesBlock(exercises, skill.objective);
  if (exerciseBlock) parts.push(exerciseBlock);

  parts.push(sessionOffer(skill.label));

  return {
    text: parts.join("\n\n"),
    suggestedSkill: skill.skill,
    suggestedLabel: skill.label,
  };
}

export function findGestureDiagnosisReply(
  message: string,
  exercises: ExerciseTechniqueInfo[],
  username: string
): CoachReply | null {
  const normalized = normalizeForMatch(message);

  // 1. Symptôme précis décrit par le joueur. Exiger un mot du geste ET un mot
  // du symptôme rend la reconnaissance fiable sans imposer de formulation :
  // « mon service part dans le filet », « pourquoi mes services finissent
  // toujours dans le filet » et « ça tombe dans le filet quand je sers »
  // aboutissent tous au même diagnostic.
  const symptom = SYMPTOM_DIAGNOSES.find(
    (entry) =>
      (entry.gestureWords.some((word) => normalized.includes(normalizeForMatch(word))) ||
        (entry.gesturePairs ?? []).some((pair) =>
          pair.every((word) => normalized.includes(normalizeForMatch(word)))
        )) &&
      entry.symptomWords.some((word) => normalized.includes(normalizeForMatch(word)))
  );

  if (symptom) {
    const parts = [
      `${symptom.title}, ${username}. C'est presque toujours l'une de ces causes :`,
      symptom.causes.map((cause, index) => `${index + 1}. ${cause}`).join("\n\n"),
      `**À corriger en premier :** ${symptom.fix}`,
    ];
    const exerciseBlock = relatedExercisesBlock(exercises, symptom.objective);
    if (exerciseBlock) parts.push(exerciseBlock);

    const symptomSkill = OBJECTIVE_TO_APP_SKILL[symptom.objective];
    const symptomLabel = skillLabelFor(symptom.objective);
    if (symptomSkill && symptomLabel) parts.push(sessionOffer(symptomLabel));

    return { text: parts.join("\n\n"), suggestedSkill: symptomSkill, suggestedLabel: symptomLabel };
  }

  // 2. Le joueur signale un échec sans décrire de symptôme précis : on présente
  // les causes fréquentes du geste et on le laisse identifier la sienne.
  if (!isDiagnosticQuestion(message)) return null;

  const gesture = GESTURE_DIAGNOSES.find(
    (entry) =>
      entry.keywords.some((keyword) => normalized.includes(normalizeForMatch(keyword))) ||
      (entry.keywordPairs ?? []).some((pair) =>
        pair.every((keyword) => normalized.includes(normalizeForMatch(keyword)))
      )
  );
  // Aucun geste reconnu : on ne fabrique pas un diagnostic sur un geste qu'on
  // n'a pas identifié.
  if (!gesture) return null;

  const parts = [
    `Il y a plusieurs causes possibles, ${username}, et elles ne se corrigent pas de la même façon. ` +
      `Voici les plus fréquentes sur ${gesture.label}, de la plus courante à la plus rare :`,
    gesture.causes.map((cause, index) => `${index + 1}. ${cause}`).join("\n\n"),
    gesture.selfCheck,
  ];
  const exerciseBlock = relatedExercisesBlock(exercises, gesture.objective);
  if (exerciseBlock) parts.push(exerciseBlock);

  const gestureSkill = OBJECTIVE_TO_APP_SKILL[gesture.objective];
  if (gestureSkill) parts.push(sessionOffer(gesture.label));

  return { text: parts.join("\n\n"), suggestedSkill: gestureSkill, suggestedLabel: gesture.label };
}

/** Libellé lisible d'un objectif, repris des leviers de progression. */
function skillLabelFor(objective: string): string | undefined {
  return SKILL_LEVERS.find((entry) => entry.objective === objective)?.label;
}

/**
 * Trois exercices de la bibliothèque réelle du joueur pour cet objectif.
 * Jamais inventés : si le catalogue n'en contient aucun, on ne propose rien.
 */
function relatedExercisesBlock(exercises: ExerciseTechniqueInfo[], objective: string): string | null {
  const related = exercises
    .filter((exercise) => exercise.objective === objective)
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
    .slice(0, 3);
  if (related.length === 0) return null;

  const list = related
    .map((exercise) => {
      const hint = firstSentence(exercise.tips);
      return hint ? `• **${exercise.name}** — ${hint}` : `• **${exercise.name}**`;
    })
    .join("\n");

  return (
    `Pour travailler ça concrètement, dans ta bibliothèque :\n${list}\n\n` +
    `Tu les retrouves dans Entraînement → Bibliothèque, ou en lançant une séance ciblée sur ce point.`
  );
}

const TECHNIQUE_TRIGGER_WORDS = [
  "comment",
  "technique",
  "explique",
  "expliquer",
  "bonne façon",
  "bonne methode",
  "bonne méthode",
];

/**
 * Au-delà de ce score de correspondance, le nom de l'exercice est reconnu assez
 * clairement pour se passer d'un mot déclencheur : "faire des squats sautés"
 * doit répondre aussi bien que "comment faire des squats sautés ?".
 */
const STRONG_MATCH_SCORE = 0.5;

const JUMP_IMPACT_OBJECTIVES = new Set(["detente", "defense"]);

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

function normalizeForMatch(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(COMBINING_DIACRITICS, "");
}

// Ramène un mot normalisé à une forme approximative singulier/masculin pour
// que "manchette" matche "manchettes", "sauté" matche "sautés", etc.
function stem(word: string): string {
  return word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word;
}

export function findExerciseTechniqueReply(message: string, exercises: ExerciseTechniqueInfo[]): string | null {
  if (exercises.length === 0) return null;

  // « Pourquoi je rate mes manchettes ? » et « comment améliorer ma détente ? »
  // mentionnent un geste sans demander comment l'exécuter. Répondre par une
  // fiche technique serait hors sujet : ces questions sont traitées ailleurs.
  // Le garde est ici en plus de l'ordre d'appel, pour qu'un futur changement
  // d'ordre ne réintroduise pas le défaut.
  if (isDiagnosticQuestion(message) || isImprovementQuestion(message)) return null;

  const normalizedMessage = normalizeForMatch(message);
  const hasTriggerWord = TECHNIQUE_TRIGGER_WORDS.some((w) => normalizedMessage.includes(normalizeForMatch(w)));

  const messageStems = new Set(
    normalizedMessage
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4)
      .map(stem)
  );

  let best: ExerciseTechniqueInfo | null = null;
  let bestScore = 0;
  let bestMatched = 0;

  for (const exercise of exercises) {
    const nameWords = normalizeForMatch(exercise.name)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4);
    if (nameWords.length === 0) continue;

    const matched = nameWords.filter((w) => messageStems.has(stem(w))).length;
    const score = matched / nameWords.length;
    if (matched > 0 && score > bestScore) {
      bestScore = score;
      bestMatched = matched;
      best = exercise;
    }
  }

  if (!best) return null;

  // Un nom ne comportant qu'un mot significatif ("Manchettes au mur") atteint
  // 100 % de correspondance dès que ce mot apparaît dans la phrase. Exiger deux
  // mots reconnus, ou un mot déclencheur explicite, évite qu'une simple mention
  // du geste déclenche sa fiche technique.
  const recognizedByName = bestScore >= STRONG_MATCH_SCORE && bestMatched >= 2;
  if (!recognizedByName && !hasTriggerWord) return null;

  const parts = [`Comment bien exécuter « ${best.name} » :`, best.instructions];
  if (best.tips) parts.push(`💡 Conseil : ${best.tips}`);
  if (best.common_mistakes) parts.push(`⚠️ Erreur fréquente à éviter : ${best.common_mistakes}`);
  parts.push(`Tu retrouves cet exercice dans Entraînement → Bibliothèque.`);
  if (JUMP_IMPACT_OBJECTIVES.has(best.objective)) parts.push(SAFETY_NOTICE);

  return parts.join("\n\n");
}
