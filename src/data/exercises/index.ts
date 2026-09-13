// Bibliothèque d'exercices Coach Volley — point d'entrée unique.
//
// Les exercices sont répartis par catégorie dans des fichiers séparés pour
// rester lisibles et éditables. Ce fichier les agrège, sans aucune logique
// d'interface: les données restent indépendantes des écrans.

import { receptionExercises } from "./reception";
import { defenseExercises } from "./defense";
import { settingExercises } from "./setting";
import { attackExercises } from "./attack";
import { serveExercises } from "./serve";
import { blockExercises } from "./block";
import { footworkExercises } from "./footwork";
import { jumpingExercises } from "./jumping";
import { strengthExercises } from "./strength";
import { mobilityExercises } from "./mobility";
import { gameReadingExercises } from "./gameReading";
import { warmupExercises } from "./warmup";
import type { ExerciseCategory, LibraryExercise } from "./types";

export * from "./types";

export const EXERCISES_BY_CATEGORY: Record<ExerciseCategory, LibraryExercise[]> = {
  reception: receptionExercises,
  defense: defenseExercises,
  passe: settingExercises,
  attaque: attackExercises,
  service: serveExercises,
  bloc: blockExercises,
  deplacements: footworkExercises,
  detente: jumpingExercises,
  renforcement: strengthExercises,
  mobilite: mobilityExercises,
  lecture_jeu: gameReadingExercises,
  echauffement: warmupExercises,
};

export const ALL_EXERCISES: LibraryExercise[] = Object.values(EXERCISES_BY_CATEGORY).flat();

export {
  receptionExercises,
  defenseExercises,
  settingExercises,
  attackExercises,
  serveExercises,
  blockExercises,
  footworkExercises,
  jumpingExercises,
  strengthExercises,
  mobilityExercises,
  gameReadingExercises,
  warmupExercises,
};
