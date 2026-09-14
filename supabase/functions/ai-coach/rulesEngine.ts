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
  "pourquoi",
  "j'arrive pas",
  "jarrive pas",
  "n'arrive pas",
  "narrive pas",
  "je rate",
  "je loupe",
  "je manque",
  "j'ai du mal",
  "jai du mal",
  "je galere",
  "je galère",
  "c'est nul",
  "mauvais en",
  "mauvaise en",
  "probleme",
  "problème",
];

export function isDiagnosticQuestion(message: string): boolean {
  const normalized = normalizeForMatch(message);
  return DIAGNOSIS_MARKERS.some((marker) => normalized.includes(normalizeForMatch(marker)));
}

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
    keywords: ["bloc", "blocs", "bloquer", "contre"],
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
export function findGestureDiagnosisReply(
  message: string,
  exercises: ExerciseTechniqueInfo[],
  username: string
): string | null {
  if (!isDiagnosticQuestion(message)) return null;

  const normalized = normalizeForMatch(message);
  const gesture = GESTURE_DIAGNOSES.find((entry) =>
    entry.keywords.some((keyword) => normalized.includes(normalizeForMatch(keyword)))
  );
  if (!gesture) return null;

  const parts = [
    `Il y a plusieurs causes possibles, ${username}, et elles ne se corrigent pas de la même façon. ` +
      `Voici les plus fréquentes sur ${gesture.label}, de la plus courante à la plus rare :`,
    gesture.causes.map((cause, index) => `${index + 1}. ${cause}`).join("\n\n"),
    gesture.selfCheck,
  ];

  // Exercices tirés de la bibliothèque réelle du joueur : jamais inventés.
  const related = exercises
    .filter((exercise) => exercise.objective === gesture.objective)
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
    .slice(0, 3);

  if (related.length > 0) {
    const list = related
      .map((exercise) => {
        const hint = firstSentence(exercise.tips);
        return hint ? `• **${exercise.name}** — ${hint}` : `• **${exercise.name}**`;
      })
      .join("\n");
    parts.push(`Pour travailler ça concrètement, dans ta bibliothèque :\n${list}`);
    parts.push(`Tu les retrouves dans Entraînement → Bibliothèque, ou en lançant une séance ciblée sur ce point.`);
  }

  return parts.join("\n\n");
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

  // « Pourquoi je rate mes manchettes ? » mentionne un exercice sans demander
  // comment l'exécuter. Répondre par sa fiche technique serait hors sujet :
  // le diagnostic est traité ailleurs.
  if (isDiagnosticQuestion(message)) return null;

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
