// Contrôle de la bibliothèque d'exercices.
//
//   npm run exercises:check             -- exige la bibliothèque complète (300)
//   npm run exercises:check -- --partial -- tolère une bibliothèque en cours
//
// Sort en code 1 dès qu'une donnée est invalide, en listant chaque problème.

import {
  ALL_EXERCISES,
  CATEGORY_LABELS,
  CATEGORY_TARGETS,
  EXERCISE_CATEGORIES,
  TOTAL_EXERCISES,
} from "../src/data/exercises";
import { validateLibrary } from "./exerciseValidation";

const partial = process.argv.includes("--partial");
const { errors, countsByCategory, total } = validateLibrary(ALL_EXERCISES, { partial });

console.log("Bibliothèque d'exercices Coach Volley\n");
for (const category of EXERCISE_CATEGORIES) {
  const actual = countsByCategory[category];
  const expected = CATEGORY_TARGETS[category];
  const mark = actual === expected ? "[ok]" : "[ .]";
  console.log(`  ${mark} ${CATEGORY_LABELS[category].padEnd(28)}${String(actual).padStart(4)} / ${expected}`);
}
console.log(`\n  Total ${total} / ${TOTAL_EXERCISES}`);

if (errors.length > 0) {
  console.error(`\n${errors.length} erreur(s) de validation :\n`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(partial ? "\nValidation partielle OK." : "\nValidation complète OK.");
