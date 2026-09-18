import type { Exercise, FeedbackRating, Objective, StatCategory, TrainingSkill } from "@/types/database";

/**
 * Vocabulaire des compétences suivies par le moteur de recommandation.
 *
 * Il reprend exactement `exercises.category` : une compétence désigne donc
 * toujours un ensemble d'exercices réellement présents en bibliothèque.
 */
export const SKILLS: { value: TrainingSkill; label: string; icon: string; family: "technique" | "physique" | "cognitif" }[] = [
  { value: "reception", label: "Réception", icon: "🙌", family: "technique" },
  { value: "defense", label: "Défense", icon: "🛡️", family: "technique" },
  { value: "passe", label: "Passe", icon: "🎯", family: "technique" },
  { value: "attaque", label: "Attaque", icon: "💥", family: "technique" },
  { value: "service", label: "Service", icon: "🎾", family: "technique" },
  { value: "bloc", label: "Bloc", icon: "🧱", family: "technique" },
  { value: "deplacements", label: "Déplacements et appuis", icon: "👟", family: "physique" },
  { value: "detente", label: "Détente et explosivité", icon: "⬆️", family: "physique" },
  { value: "renforcement", label: "Renforcement", icon: "💪", family: "physique" },
  { value: "mobilite", label: "Mobilité et prévention", icon: "🧘", family: "physique" },
  { value: "lecture_jeu", label: "Lecture du jeu", icon: "👀", family: "cognitif" },
  { value: "echauffement", label: "Échauffement", icon: "🔥", family: "physique" },
];

/**
 * Compétences auxquelles un score de progression a du sens. L'échauffement en
 * est exclu : on ne « progresse » pas en échauffement, c'est une phase de
 * séance, pas un domaine à travailler.
 */
export const SCORED_SKILLS: TrainingSkill[] = SKILLS.filter((s) => s.value !== "echauffement").map((s) => s.value);

export function skillLabel(value: TrainingSkill): string {
  return SKILLS.find((s) => s.value === value)?.label ?? value;
}

export function skillIcon(value: TrainingSkill): string {
  return SKILLS.find((s) => s.value === value)?.icon ?? "•";
}

/**
 * Objectif d'entraînement choisi par le joueur → compétence travaillée.
 *
 * Les objectifs transversaux (`competition`, `global`, `regularite`,
 * `precision`) ne désignent pas une compétence unique : ils renvoient `null`
 * et le moteur s'appuie alors sur le profil et l'historique.
 */
const OBJECTIVE_TO_SKILL: Partial<Record<Objective, TrainingSkill>> = {
  reception: "reception",
  service: "service",
  attaque: "attaque",
  bloc: "bloc",
  defense: "defense",
  detente: "detente",
  vitesse: "deplacements",
};

export function skillForObjective(objective: Objective): TrainingSkill | null {
  return OBJECTIVE_TO_SKILL[objective] ?? null;
}

/**
 * Compétence → objectif d'entraînement, pour retrouver les exercices dont
 * seul `objective` est renseigné (exercices créés depuis l'admin, hors
 * bibliothèque, qui n'ont pas de `category`).
 */
const SKILL_TO_OBJECTIVE: Record<TrainingSkill, Objective> = {
  reception: "reception",
  defense: "defense",
  passe: "precision",
  attaque: "attaque",
  service: "service",
  bloc: "bloc",
  deplacements: "vitesse",
  detente: "detente",
  renforcement: "global",
  mobilite: "global",
  lecture_jeu: "regularite",
  echauffement: "global",
};

export function objectiveForSkill(skill: TrainingSkill): Objective {
  return SKILL_TO_OBJECTIVE[skill];
}

/**
 * Catégorie statistique saisie par le joueur → compétence, pour que les
 * statistiques déjà enregistrées nourrissent les scores de compétence.
 * `physique` recouvre plusieurs compétences : il est traité à part.
 */
const STAT_TO_SKILL: Partial<Record<StatCategory, TrainingSkill>> = {
  service: "service",
  reception: "reception",
  attaque: "attaque",
  bloc: "bloc",
  defense: "defense",
};

export function skillForStatCategory(category: StatCategory): TrainingSkill | null {
  return STAT_TO_SKILL[category] ?? null;
}

/**
 * Compétence travaillée par un exercice.
 *
 * Les exercices de la bibliothèque portent une `category`. Ceux créés à la
 * main depuis l'interface admin n'en ont pas : on retombe alors sur leur
 * objectif, et en dernier recours sur « renforcement », qui n'oriente aucune
 * recommandation vers une compétence technique qu'on n'a pas vérifiée.
 */
export function skillOfExercise(exercise: Pick<Exercise, "category" | "objective">): TrainingSkill {
  if (exercise.category) return exercise.category;
  const fromObjective = skillForObjective(exercise.objective);
  return fromObjective ?? "renforcement";
}

/**
 * Matériel proposé au joueur, dans l'ordre de fréquence réelle en
 * bibliothèque. Les valeurs correspondent exactement à `exercises.equipment`.
 */
export const EQUIPMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "ballons", label: "Ballon" },
  { value: "filet", label: "Filet" },
  { value: "mur", label: "Mur" },
  { value: "plots", label: "Plots" },
  { value: "tapis", label: "Tapis" },
  { value: "elastique", label: "Élastique" },
  { value: "chronometre", label: "Chronomètre" },
  { value: "plyobox", label: "Plyobox" },
  { value: "banc", label: "Banc" },
  { value: "corde", label: "Corde" },
];

export const FEEDBACK_OPTIONS: { value: FeedbackRating; label: string; icon: string }[] = [
  { value: "trop_facile", label: "Trop facile", icon: "😴" },
  { value: "adapte", label: "Adapté", icon: "👍" },
  { value: "difficile", label: "Difficile", icon: "😤" },
  { value: "impossible", label: "Impossible", icon: "🛑" },
];

/**
 * Traduction d'un ressenti en ajustement de difficulté, en points de
 * difficulté (échelle 1-5 des exercices).
 *
 * Les valeurs sont volontairement petites et asymétriques : on monte la
 * difficulté lentement (+0,25) et on la redescend plus vite (-1 sur un
 * « impossible »), pour ne jamais enfermer un joueur dans des exercices
 * qu'il ne peut pas réaliser.
 */
export const FEEDBACK_DIFFICULTY_DELTA: Record<FeedbackRating, number> = {
  trop_facile: 0.25,
  adapte: 0,
  difficile: -0.35,
  impossible: -1,
};
