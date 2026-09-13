// Validation de la bibliothèque d'exercices.
//
// Partagé par `npm run exercises:check` (contrôle seul) et
// `npm run exercises:build` (génération de la migration SQL), pour qu'aucune
// donnée invalide ne puisse atteindre la base.

import {
  CATEGORY_TARGETS,
  EXERCISE_CATEGORIES,
  EQUIPMENTS,
  INTENSITIES,
  LIBRARY_LEVELS,
  TOTAL_EXERCISES,
  TRAINING_OBJECTIVES,
  ALL_POSITIONS,
  type ExerciseCategory,
  type LibraryExercise,
} from "../src/data/exercises";

/** Préfixe d'identifiant attendu par catégorie, pour des ids stables et lisibles. */
export const CATEGORY_ID_PREFIX: Record<ExerciseCategory, string> = {
  reception: "reception",
  defense: "defense",
  passe: "passe",
  attaque: "attaque",
  service: "service",
  bloc: "bloc",
  deplacements: "deplacements",
  detente: "detente",
  renforcement: "renforcement",
  mobilite: "mobilite",
  lecture_jeu: "lecture",
  echauffement: "echauffement",
};

const NAME_SIMILARITY_THRESHOLD = 0.8;
const DESCRIPTION_SIMILARITY_THRESHOLD = 0.85;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function wordSet(text: string): Set<string> {
  return new Set(normalize(text).split(" ").filter((w) => w.length >= 3));
}

/** Similarité de Jaccard entre deux textes, sur leurs mots significatifs. */
function similarity(a: string, b: string): number {
  const setA = wordSet(a);
  const setB = wordSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let shared = 0;
  for (const word of setA) if (setB.has(word)) shared += 1;
  return shared / (setA.size + setB.size - shared);
}

function requireNonEmptyList(
  errors: string[],
  exercise: LibraryExercise,
  field: keyof LibraryExercise,
  minimum: number
): void {
  const value = exercise[field];
  if (!Array.isArray(value) || value.length < minimum) {
    errors.push(`${exercise.id}: "${String(field)}" doit contenir au moins ${minimum} élément(s).`);
    return;
  }
  for (const item of value) {
    if (typeof item === "string" && item.trim().length === 0) {
      errors.push(`${exercise.id}: "${String(field)}" contient une chaîne vide.`);
    }
  }
}

export interface ValidationOptions {
  /** Autorise une bibliothèque incomplète (utile pendant la rédaction). */
  partial?: boolean;
}

export interface ValidationResult {
  errors: string[];
  countsByCategory: Record<ExerciseCategory, number>;
  total: number;
}

export function validateLibrary(
  exercises: LibraryExercise[],
  options: ValidationOptions = {}
): ValidationResult {
  const errors: string[] = [];
  const countsByCategory = Object.fromEntries(
    EXERCISE_CATEGORIES.map((category) => [category, 0])
  ) as Record<ExerciseCategory, number>;

  const seenIds = new Map<string, string>();
  const seenNames = new Map<string, string>();

  for (const exercise of exercises) {
    const { id } = exercise;

    if (!id || !/^[a-z]+_\d{3}$/.test(id)) {
      errors.push(`${id || "(id manquant)"}: identifiant invalide, format attendu "categorie_001".`);
    }
    if (seenIds.has(id)) {
      errors.push(`${id}: identifiant dupliqué (déjà utilisé par "${seenIds.get(id)}").`);
    } else {
      seenIds.set(id, exercise.name);
    }

    const normalizedName = normalize(exercise.name);
    if (seenNames.has(normalizedName)) {
      errors.push(`${id}: nom dupliqué avec "${seenNames.get(normalizedName)}".`);
    } else {
      seenNames.set(normalizedName, id);
    }

    if (!EXERCISE_CATEGORIES.includes(exercise.category)) {
      errors.push(`${id}: catégorie inconnue "${exercise.category}".`);
    } else {
      countsByCategory[exercise.category] += 1;
      const prefix = CATEGORY_ID_PREFIX[exercise.category];
      if (!id.startsWith(`${prefix}_`)) {
        errors.push(`${id}: l'identifiant devrait commencer par "${prefix}_" (catégorie ${exercise.category}).`);
      }
    }

    for (const field of ["name", "description", "objective"] as const) {
      if (!exercise[field] || exercise[field].trim().length === 0) {
        errors.push(`${id}: "${field}" est vide.`);
      }
    }

    requireNonEmptyList(errors, exercise, "skills", 1);
    requireNonEmptyList(errors, exercise, "tags", 1);
    requireNonEmptyList(errors, exercise, "positions", 1);
    requireNonEmptyList(errors, exercise, "levels", 1);
    requireNonEmptyList(errors, exercise, "instructions", 2);
    requireNonEmptyList(errors, exercise, "coachingPoints", 2);
    requireNonEmptyList(errors, exercise, "commonMistakes", 1);
    requireNonEmptyList(errors, exercise, "progressions", 1);
    requireNonEmptyList(errors, exercise, "regressions", 1);

    for (const level of exercise.levels) {
      if (!LIBRARY_LEVELS.includes(level)) errors.push(`${id}: niveau inconnu "${level}".`);
    }
    for (const position of exercise.positions) {
      if (!ALL_POSITIONS.includes(position)) errors.push(`${id}: poste inconnu "${position}".`);
    }
    for (const item of exercise.equipment) {
      if (!EQUIPMENTS.includes(item)) errors.push(`${id}: matériel inconnu "${item}".`);
    }
    if (!INTENSITIES.includes(exercise.intensity)) {
      errors.push(`${id}: intensité inconnue "${exercise.intensity}".`);
    }
    if (!TRAINING_OBJECTIVES.includes(exercise.trainingObjective)) {
      errors.push(`${id}: objectif d'entraînement inconnu "${exercise.trainingObjective}".`);
    }

    if (!(exercise.durationMinutes > 0)) {
      errors.push(`${id}: durée invalide (${exercise.durationMinutes}), elle doit être supérieure à 0.`);
    }
    if (exercise.playersMin < 1) {
      errors.push(`${id}: playersMin doit valoir au moins 1.`);
    }
    if (exercise.playersMin > exercise.playersMax) {
      errors.push(`${id}: playersMin (${exercise.playersMin}) > playersMax (${exercise.playersMax}).`);
    }
    for (const field of ["physicalLoad", "technicalLoad"] as const) {
      const load = exercise[field];
      if (!Number.isInteger(load) || load < 1 || load > 5) {
        errors.push(`${id}: "${field}" doit être un entier entre 1 et 5 (reçu ${load}).`);
      }
    }

    if (exercise.soloCompatible && exercise.playersMin !== 1) {
      errors.push(`${id}: marqué soloCompatible mais playersMin vaut ${exercise.playersMin}.`);
    }
    if (exercise.ballRequired && !exercise.equipment.includes("ballons")) {
      errors.push(`${id}: ballRequired est vrai mais "ballons" ne figure pas dans equipment.`);
    }
    if (!exercise.ballRequired && exercise.equipment.includes("ballons")) {
      errors.push(`${id}: "ballons" figure dans equipment mais ballRequired est faux.`);
    }
  }

  // Similarité: repère deux exercices trop proches par le nom ou la description.
  for (const [index, a] of exercises.entries()) {
    for (const b of exercises.slice(index + 1)) {
      const nameScore = similarity(a.name, b.name);
      if (nameScore >= NAME_SIMILARITY_THRESHOLD) {
        errors.push(
          `${a.id} / ${b.id}: noms trop proches (${Math.round(nameScore * 100)}%) — "${a.name}" vs "${b.name}".`
        );
        continue;
      }
      const descriptionScore = similarity(a.description, b.description);
      if (descriptionScore >= DESCRIPTION_SIMILARITY_THRESHOLD) {
        errors.push(
          `${a.id} / ${b.id}: descriptions trop proches (${Math.round(descriptionScore * 100)}%).`
        );
      }
    }
  }

  if (!options.partial) {
    if (exercises.length !== TOTAL_EXERCISES) {
      errors.push(`Total incorrect: ${exercises.length} exercices au lieu de ${TOTAL_EXERCISES}.`);
    }
    for (const category of EXERCISE_CATEGORIES) {
      const expected = CATEGORY_TARGETS[category];
      const actual = countsByCategory[category];
      if (actual !== expected) {
        errors.push(`Catégorie ${category}: ${actual} exercices au lieu de ${expected}.`);
      }
    }
  }

  return { errors, countsByCategory, total: exercises.length };
}
