// Contrôle du routage des réponses du Coach IA.
//
// Deux familles de questions se ressemblent mais appellent des réponses
// opposées : « comment faire une manchette » demande une exécution,
// « pourquoi je rate mes manchettes » demande des causes. Ce script vérifie
// que chacune part au bon endroit, et qu'aucun exercice absent de la
// bibliothèque n'apparaît dans une réponse.
//
// Lancement : npm run coach:check

import {
  findGestureDiagnosisReply,
  findExerciseTechniqueReply,
  isDiagnosticQuestion,
} from "../supabase/functions/ai-coach/rulesEngine";

const catalog = [
  { name: "Manchettes au mur", objective: "reception", instructions: "Place-toi à 2 m du mur...", common_mistakes: "Bras qui plient", tips: "Garde les coudes verrouillés" },
  { name: "Réception en triangle", objective: "reception", instructions: "À trois joueurs...", common_mistakes: null, tips: "Annonce le ballon à voix haute" },
  { name: "Plateforme statique", objective: "reception", instructions: "Sans ballon...", common_mistakes: null, tips: "Épaules vers la cible" },
  { name: "Squats sautés", objective: "detente", instructions: "Descends en squat puis explose...", common_mistakes: "Genoux rentrants", tips: "Réceptionne en souplesse" },
  { name: "Services flottants ciblés", objective: "service", instructions: "Vise les zones 1 et 5...", common_mistakes: null, tips: "Même lancer à chaque fois" },
];

let fails = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${ok ? "" : ` — ${detail}`}`);
  if (!ok) fails++;
}

// Le cas signalé
const q1 = "pourquoi je rate mes manchettes";
check("« pourquoi je rate mes manchettes » est vu comme un diagnostic", isDiagnosticQuestion(q1));
check("→ ne renvoie PAS la fiche technique", findExerciseTechniqueReply(q1, catalog) === null,
  String(findExerciseTechniqueReply(q1, catalog)).slice(0, 60));

const d1 = findGestureDiagnosisReply(q1, catalog, "Nyoko");
check("→ renvoie un diagnostic", d1 !== null);
check("→ explique des causes numérotées", (d1 ?? "").includes("1.") && (d1 ?? "").includes("plateforme"),
  (d1 ?? "").slice(0, 80));
check("→ propose des exercices de la bibliothèque", (d1 ?? "").includes("Manchettes au mur"));
check("→ n'invente aucun exercice absent du catalogue",
  !(d1 ?? "").includes("Squats sautés") && !(d1 ?? "").includes("Services flottants"));

// La question technique doit toujours fonctionner
const q2 = "comment bien faire des squats sautés";
check("« comment faire des squats sautés » reste une fiche technique",
  (findExerciseTechniqueReply(q2, catalog) ?? "").includes("Squats sautés"));
check("→ et n'est pas pris pour un diagnostic", findGestureDiagnosisReply(q2, catalog, "Nyoko") === null);

// L'ancien correctif (sans mot déclencheur) doit tenir
check("« faire des squats sautés » marche encore sans « comment »",
  (findExerciseTechniqueReply("faire des squats sautés", catalog) ?? "").includes("Squats sautés"));

// Le bug de fond : un nom à un seul mot ne doit plus suffire
check("« j'ai fait des manchettes hier » ne déclenche plus la fiche",
  findExerciseTechniqueReply("j'ai fait des manchettes hier", catalog) === null,
  String(findExerciseTechniqueReply("j'ai fait des manchettes hier", catalog)).slice(0, 50));
check("mais « technique de la manchette » la déclenche",
  (findExerciseTechniqueReply("technique de la manchette", catalog) ?? "").includes("Manchettes"));

// Autres gestes
for (const [q, expected] of [
  ["pourquoi je rate mes services", "le service"],
  ["j'arrive pas à smasher", "l'attaque"],
  ["j'ai du mal au bloc", "le bloc"],
  ["pourquoi mes passes sont mauvaises", "la passe"],
] as [string, string][]) {
  const r = findGestureDiagnosisReply(q, catalog, "Nyoko");
  check(`« ${q} » → ${expected}`, (r ?? "").includes(expected), (r ?? "null").slice(0, 60));
}

// Geste inconnu : on n'invente pas
check("« pourquoi je suis nul » sans geste identifié → pas de diagnostic inventé",
  findGestureDiagnosisReply("pourquoi je suis nul", catalog, "Nyoko") === null);

check("les conseils listés restent courts (une consigne, pas tout le bloc)",
  (d1 ?? "").split("\n").filter((l) => l.startsWith("•")).every((l) => l.length < 160),
  (d1 ?? "").split("\n").filter((l) => l.startsWith("•")).map((l) => l.length).join("/"));

// --- Diagnostics par symptôme précis -------------------------------------
const symptomCases: [string, string][] = [
  ["mon service part dans le filet", "tombe dans le filet"],
  ["pourquoi mes services finissent toujours dans le filet", "tombe dans le filet"],
  ["quand je sers ca tombe dans le filet", "tombe dans le filet"],
  ["mes services sortent tout le temps", "sort derrière"],
  ["mon service est trop mou", "manque de puissance"],
  ["pourquoi mes attaques vont dans le filet", "finissent dans le filet"],
  ["mes smash sortent a chaque fois", "sortent"],
  ["je me fais bloquer systematiquement", "bloquer"],
  ["mes receptions partent n'importe ou", "n'importe où"],
  ["pourquoi quand je fais des manchettes ca part trop loin derriere", "trop loin derrière"],
  ["mes receptions sont trop courtes", "trop courtes"],
  ["l'arbitre siffle mes passes", "tenus"],
  ["mes passes sont trop courtes", "trop courtes"],
  ["je touche le filet quand je bloque", "touches le filet"],
  ["le ballon passe entre mes mains au bloc", "entre tes mains"],
  ["j'arrive toujours en retard au bloc", "en retard"],
  ["je saute pas assez haut", "pas assez haut"],
  ["en defense j'arrive jamais a temps", "jamais à temps"],
  ["en match je rate tout alors qu'a l'entrainement ca va", "match"],
];

for (const [question, expected] of symptomCases) {
  const r = findGestureDiagnosisReply(question, catalog, "Nyoko");
  check(`« ${question} »`, (r ?? "").includes(expected), (r ?? "null").slice(0, 70));
}

// --- Passe arrière : ne doit jamais être confondue avec la passe avant ----
const backSetCases: [string, string][] = [
  ["mes passes arriere sont trop courtes", "passes arrière sont trop courtes"],
  ["pourquoi mes passes arrieres sont trop courtes", "passes arrière sont trop courtes"],
  ["mes passes arriere partent n'importe ou", "passes arrière partent n'importe où"],
  ["je rate mes passes arriere", "passes arrière partent n'importe où"],
  ["j'arrive pas a passer derriere", "passe arrière"],
];
for (const [question, expected] of backSetCases) {
  const r = findGestureDiagnosisReply(question, catalog, "Nyoko");
  check(`« ${question} »`, (r ?? "").includes(expected), (r ?? "null").slice(0, 70));
}

const back = findGestureDiagnosisReply("mes passes arriere sont trop courtes", catalog, "Nyoko");
check("la passe arrière cite sa cause propre (on passe sans voir)",
  (back ?? "").includes("cambres") || (back ?? "").includes("repéré"));
check("la passe avant garde bien son propre diagnostic",
  (findGestureDiagnosisReply("mes passes sont trop courtes", catalog, "Nyoko") ?? "")
    .includes("Tes passes sont trop courtes"));
check("→ et n'est pas capturée par la passe arrière",
  !(findGestureDiagnosisReply("mes passes sont trop courtes", catalog, "Nyoko") ?? "")
    .includes("passes arrière"));
check("« je recule derriere la ligne » ne déclenche pas la passe arrière",
  findGestureDiagnosisReply("je recule derriere la ligne", catalog, "Nyoko") === null);

// Une réponse par symptôme doit donner une correction prioritaire
const sym = findGestureDiagnosisReply("mon service part dans le filet", catalog, "Nyoko");
check("une réponse par symptôme propose une correction prioritaire",
  (sym ?? "").includes("À corriger en premier"));
check("→ et reste adossée à la bibliothèque",
  (sym ?? "").includes("Services flottants ciblés"));
check("→ sans citer d'exercice d'un autre domaine",
  !(sym ?? "").includes("Manchettes au mur") && !(sym ?? "").includes("Squats sautés"));

// Un symptôme ne doit pas être détourné vers la fiche technique
check("« mon service part dans le filet » ne renvoie pas une fiche technique",
  findExerciseTechniqueReply("mon service part dans le filet", catalog) === null);

// Pas de faux positif sur une phrase anodine
check("« j'ai fait 30 services hier » ne déclenche aucun diagnostic",
  findGestureDiagnosisReply("j'ai fait 30 services hier", catalog, "Nyoko") === null,
  String(findGestureDiagnosisReply("j'ai fait 30 services hier", catalog, "Nyoko")).slice(0, 50));

console.log("\n--- aperçu de la réponse ---\n");
console.log(d1);
console.log("\n--- aperçu d'un diagnostic par symptôme ---\n");
console.log(sym);
console.log(fails === 0 ? "\nTOUS LES CAS PASSENT" : `\n${fails} CAS EN ÉCHEC`);
process.exit(fails === 0 ? 0 : 1);
