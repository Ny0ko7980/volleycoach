// Bibliothèque d'exercices Coach Volley — types stricts.
//
// Cette bibliothèque est la SOURCE DE VÉRITÉ des exercices: elle est écrite en
// TypeScript (un fichier par catégorie), validée par `npm run exercises:check`,
// puis convertie en migration SQL par `npm run exercises:build`. Aucune donnée
// n'est écrite à la main dans le SQL, ce qui rend toute divergence impossible.
//
// Les types de domaine déjà présents dans l'app (Position, PlayerLevel,
// Objective) sont réutilisés tels quels plutôt que redéfinis, pour que la
// bibliothèque reste compatible avec les filtres et le générateur existants.

import type { Objective, PlayerLevel, Position } from "../../types/database";

export type { Objective, PlayerLevel, Position };

/** Famille de geste travaillée. Plus fine que `Objective` (but d'entraînement). */
export type ExerciseCategory =
  | "reception"
  | "defense"
  | "passe"
  | "attaque"
  | "service"
  | "bloc"
  | "deplacements"
  | "detente"
  | "renforcement"
  | "mobilite"
  | "lecture_jeu"
  | "echauffement";

export type Intensity = "low" | "medium" | "high";

/** Matériel. Un tableau vide signifie "aucun matériel nécessaire". */
export type Equipment =
  | "ballons"
  | "filet"
  | "plots"
  | "tapis"
  | "mur"
  | "plyobox"
  | "elastique"
  | "banc"
  | "chronometre"
  | "corde";

/**
 * Niveaux ouverts à la bibliothèque. `competition` reste valide côté profil
 * joueur mais n'est pas un niveau d'exercice: un joueur de ce niveau utilise
 * les exercices `avance` avec les progressions associées.
 */
export type LibraryLevel = Extract<PlayerLevel, "debutant" | "intermediaire" | "avance">;

/** Charge ressentie, de 1 (très légère) à 5 (maximale). */
export type Load = 1 | 2 | 3 | 4 | 5;

export interface LibraryExercise {
  /** Identifiant stable et lisible, ex: "reception_001". Devient `slug` en base. */
  id: string;
  name: string;
  description: string;
  category: ExerciseCategory;
  /** Compétences précises travaillées, ex: ["manchette", "orientation"]. */
  skills: string[];
  /** Postes concernés. Les 5 postes listés = exercice tous postes. */
  positions: Position[];
  /** Niveaux auxquels l'exercice est praticable (avec ses variantes). */
  levels: LibraryLevel[];
  durationMinutes: number;
  playersMin: number;
  playersMax: number;
  equipment: Equipment[];
  intensity: Intensity;
  instructions: string[];
  coachingPoints: string[];
  commonMistakes: string[];
  progressions: string[];
  regressions: string[];
  /** But de l'exercice en une phrase, affichable tel quel au joueur. */
  objective: string;
  /**
   * But d'entraînement au sens de l'app (colonne `objective` en base): c'est
   * ce que le joueur choisit dans son profil et ce sur quoi le générateur de
   * séances filtre. Distinct de `category` (famille de geste) et de
   * `objective` (phrase lisible).
   */
  trainingObjective: Objective;
  soloCompatible: boolean;
  ballRequired: boolean;
  physicalLoad: Load;
  technicalLoad: Load;
  tags: string[];
}

/** Tous les postes — convention de la base: un exercice ouvert à tout le monde. */
export const ALL_POSITIONS: Position[] = [
  "setter",
  "outside_hitter",
  "opposite",
  "middle_blocker",
  "libero",
];

export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  "reception",
  "defense",
  "passe",
  "attaque",
  "service",
  "bloc",
  "deplacements",
  "detente",
  "renforcement",
  "mobilite",
  "lecture_jeu",
  "echauffement",
];

/** Effectif attendu par catégorie — vérifié par le script de validation. */
export const CATEGORY_TARGETS: Record<ExerciseCategory, number> = {
  reception: 40,
  defense: 40,
  passe: 35,
  attaque: 40,
  service: 35,
  bloc: 25,
  deplacements: 25,
  detente: 20,
  renforcement: 15,
  mobilite: 10,
  lecture_jeu: 10,
  echauffement: 5,
};

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  reception: "Réception",
  defense: "Défense",
  passe: "Passe",
  attaque: "Attaque",
  service: "Service",
  bloc: "Bloc",
  deplacements: "Déplacements et appuis",
  detente: "Détente et explosivité",
  renforcement: "Renforcement spécifique",
  mobilite: "Mobilité et prévention",
  lecture_jeu: "Lecture du jeu et réaction",
  echauffement: "Échauffement",
};

export const TOTAL_EXERCISES = 300;

export const LIBRARY_LEVELS: LibraryLevel[] = ["debutant", "intermediaire", "avance"];

export const INTENSITIES: Intensity[] = ["low", "medium", "high"];

export const EQUIPMENTS: Equipment[] = [
  "ballons",
  "filet",
  "plots",
  "tapis",
  "mur",
  "plyobox",
  "elastique",
  "banc",
  "chronometre",
  "corde",
];

export const TRAINING_OBJECTIVES: Objective[] = [
  "reception",
  "service",
  "attaque",
  "bloc",
  "detente",
  "vitesse",
  "defense",
  "precision",
  "regularite",
  "competition",
  "global",
];

/**
 * Difficulté 1-5 telle qu'affichée aujourd'hui dans l'app (DifficultyDots),
 * dérivée des deux charges plutôt que saisie une troisième fois à la main.
 */
export function exerciseDifficulty(exercise: LibraryExercise): number {
  return Math.min(5, Math.max(1, Math.round((exercise.physicalLoad + exercise.technicalLoad) / 2)));
}

/** Niveau retenu pour la colonne `level` (non-tableau) déjà utilisée par l'app. */
export function entryLevel(exercise: LibraryExercise): LibraryLevel {
  for (const level of LIBRARY_LEVELS) {
    if (exercise.levels.includes(level)) return level;
  }
  return "debutant";
}
