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

const TECHNIQUE_TRIGGER_WORDS = [
  "comment",
  "technique",
  "explique",
  "expliquer",
  "bonne façon",
  "bonne methode",
  "bonne méthode",
];

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

  const normalizedMessage = normalizeForMatch(message);
  const hasTriggerWord = TECHNIQUE_TRIGGER_WORDS.some((w) => normalizedMessage.includes(normalizeForMatch(w)));
  if (!hasTriggerWord) return null;

  const messageStems = new Set(
    normalizedMessage
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4)
      .map(stem)
  );

  let best: ExerciseTechniqueInfo | null = null;
  let bestScore = 0;

  for (const exercise of exercises) {
    const nameWords = normalizeForMatch(exercise.name)
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4);
    if (nameWords.length === 0) continue;

    const matched = nameWords.filter((w) => messageStems.has(stem(w))).length;
    const score = matched / nameWords.length;
    if (matched > 0 && score > bestScore) {
      bestScore = score;
      best = exercise;
    }
  }

  if (!best) return null;

  const parts = [`Comment bien exécuter « ${best.name} » :`, best.instructions];
  if (best.tips) parts.push(`💡 Conseil : ${best.tips}`);
  if (best.common_mistakes) parts.push(`⚠️ Erreur fréquente à éviter : ${best.common_mistakes}`);
  parts.push(`Tu retrouves cet exercice dans Entraînement → Bibliothèque.`);
  if (JUMP_IMPACT_OBJECTIVES.has(best.objective)) parts.push(SAFETY_NOTICE);

  return parts.join("\n\n");
}
