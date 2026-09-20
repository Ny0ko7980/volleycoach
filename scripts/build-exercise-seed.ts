// Génère la migration SQL de la bibliothèque d'exercices depuis les données
// TypeScript (source de vérité). Le fichier produit ne doit jamais être édité
// à la main : relancer `npm run exercises:build` après toute modification.
//
// La validation complète tourne avant la génération : une bibliothèque
// invalide ne peut pas produire de migration.

import { writeFileSync } from "node:fs";
import {
  ALL_EXERCISES,
  entryLevel,
  exerciseDifficulty,
  type LibraryExercise,
} from "../src/data/exercises";
import { validateLibrary } from "./exerciseValidation";

const OUTPUT_PATH = "supabase/migrations/0009_exercise_library_seed.sql";

const COLUMNS = [
  "slug",
  "name",
  "description",
  "category",
  "skills",
  "positions",
  "level",
  "levels",
  "objective",
  "objective_statement",
  "duration_minutes",
  "players_min",
  "players_max",
  "equipment",
  "intensity",
  "difficulty",
  "instructions",
  "instruction_steps",
  "coaching_points",
  "common_mistakes",
  "common_mistakes_list",
  "tips",
  "progressions",
  "regressions",
  "solo_compatible",
  "ball_required",
  "physical_load",
  "technical_load",
  "tags",
] as const;

function sqlText(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlTextArray(values: readonly string[]): string {
  if (values.length === 0) return "'{}'";
  return `array[${values.map(sqlText).join(", ")}]`;
}

function sqlRow(exercise: LibraryExercise): string {
  const values = [
    sqlText(exercise.id),
    sqlText(exercise.name),
    sqlText(exercise.description),
    sqlText(exercise.category),
    sqlTextArray(exercise.skills),
    sqlTextArray(exercise.positions),
    sqlText(entryLevel(exercise)),
    sqlTextArray(exercise.levels),
    sqlText(exercise.trainingObjective),
    sqlText(exercise.objective),
    String(exercise.durationMinutes),
    String(exercise.playersMin),
    String(exercise.playersMax),
    sqlTextArray(exercise.equipment),
    sqlText(exercise.intensity),
    String(exerciseDifficulty(exercise)),
    sqlText(exercise.instructions.join(" ")),
    sqlTextArray(exercise.instructions),
    sqlTextArray(exercise.coachingPoints),
    sqlText(exercise.commonMistakes.join(" ")),
    sqlTextArray(exercise.commonMistakes),
    sqlText(exercise.coachingPoints.join(" ")),
    sqlTextArray(exercise.progressions),
    sqlTextArray(exercise.regressions),
    String(exercise.soloCompatible),
    String(exercise.ballRequired),
    String(exercise.physicalLoad),
    String(exercise.technicalLoad),
    sqlTextArray(exercise.tags),
  ];
  return `  (${values.join(", ")})`;
}

const { errors } = validateLibrary(ALL_EXERCISES);
if (errors.length > 0) {
  console.error(`Génération annulée : ${errors.length} erreur(s) de validation.`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

const updateAssignments = COLUMNS.filter((column) => column !== "slug")
  .map((column) => `  ${column} = excluded.${column}`)
  .join(",\n");

// Les exercices déjà en base (migrations 0003 et 0006) portent parfois le même
// nom qu'un exercice de la bibliothèque. On leur attribue d'abord le slug
// correspondant : l'upsert les enrichit alors sur place au lieu de créer un
// doublon, et leur identifiant reste valide pour les séances déjà réalisées.
const nameAdoptions = ALL_EXERCISES.map(
  (exercise) => `    (${sqlText(exercise.id)}, ${sqlText(exercise.name)})`
).join(",\n");

const sql = `-- Coach Volley — bibliothèque d'exercices (${ALL_EXERCISES.length} exercices).
--
-- FICHIER GÉNÉRÉ AUTOMATIQUEMENT — NE PAS ÉDITER À LA MAIN.
-- Source : src/data/exercises/*.ts
-- Régénération : npm run exercises:build
--
-- L'insertion est idempotente (upsert sur \`slug\`) : rejouer cette migration
-- met simplement les exercices à jour, sans jamais créer de doublon ni
-- supprimer d'exercice existant (les séances déjà réalisées restent valides).

-- Adoption des exercices déjà présents portant le même nom : ils reçoivent le
-- slug de la bibliothèque et seront enrichis par l'upsert, plutôt que dupliqués.
update public.exercises as e
set slug = v.slug
from (values
${nameAdoptions}
) as v(slug, name)
where e.slug is null and e.name = v.name;

insert into public.exercises
  (${COLUMNS.join(", ")})
values
${ALL_EXERCISES.map(sqlRow).join(",\n")}
-- Le prédicat \`where slug is not null\` répète celui de l'index partiel
-- exercises_slug_key : sans lui, PostgreSQL ne peut pas rattacher le
-- \`on conflict\` à cet index et rejette l'insertion.
on conflict (slug) where slug is not null do update set
${updateAssignments};
`;

writeFileSync(OUTPUT_PATH, sql, "utf8");
console.log(`${ALL_EXERCISES.length} exercices écrits dans ${OUTPUT_PATH}.`);
