// Contrôle du comportement du moteur de recommandation.
//
// Le moteur est une fonction pure : à contexte identique il rend toujours la
// même décision. Ce script lui soumet des contextes construits à la main et
// vérifie les garanties qui comptent — ne rien affirmer sans donnée, réagir
// aux faiblesses, adapter la difficulté par paliers, respecter un choix manuel.
//
// Lancement : npm run engine:check

import { recommendSession, type PlayerTrainingContext } from "@/services/recommendationEngine";
import { computeSkillScores, MIN_SAMPLE_SIZE } from "@/services/skillScoring";
import type { ExerciseFeedback, PlayerProfile, WorkoutSession } from "@/types/database";

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

const libero = {
  id: "p1", position: "libero", level: "intermediaire",
  goals: ["reception"], preferred_duration_minutes: null,
  available_equipment: [], avoid_tags: [],
} as unknown as PlayerProfile;

const fb = (skill: string, rating: string, daysAgo = 1, session = "s1") =>
  ({ id: Math.random().toString(), player_id: "p1", session_id: session, exercise_id: "e",
     skill, rating, created_at: iso(daysAgo) }) as ExerciseFeedback;

const ctx = (over: Partial<PlayerTrainingContext> = {}): PlayerTrainingContext => ({
  profile: libero, recentSessions: [], recentFeedback: [], signals: [], scores: [], ...over,
});

let failures = 0;
function check(name: string, condition: boolean, detail: string) {
  console.log(`${condition ? "OK  " : "FAIL"} ${name}${condition ? "" : ` — ${detail}`}`);
  if (!condition) failures++;
}

// 1. Sans aucune donnée : le poste et l'objectif décident, aucune raison inventée.
const cold = recommendSession(ctx());
check("profil vierge → réception (poste libéro + objectif)", cold.primarySkill === "reception", cold.primarySkill);
check("profil vierge → aucune justification fabriquée",
  cold.reasons.every((r) => !r.includes("montrent")), JSON.stringify(cold.reasons));

// 2. Faiblesse signalée : la compétence remonte et la raison est affichée.
const weak = recommendSession(ctx({
  signals: [1, 2, 3].map((i) => ({ id: `${i}`, player_id: "p1", skill: "service", source: "feedback",
    direction: "weakness", weight: 2, note: null, session_id: null, created_at: iso(i) })) as never,
}));
check("faiblesse répétée en service → service prioritaire", weak.primarySkill === "service", weak.primarySkill);
check("faiblesse → justification adossée à la donnée",
  weak.reasons.some((r) => r.toLowerCase().includes("service")), JSON.stringify(weak.reasons));

// 3. Un signal ancien ne doit plus piloter la séance.
const stale = recommendSession(ctx({
  signals: [{ id: "1", player_id: "p1", skill: "service", source: "feedback", direction: "weakness",
    weight: 2, note: null, session_id: null, created_at: iso(180) }] as never,
}));
check("signal vieux de 6 mois → n'impose plus la compétence", stale.primarySkill !== "service", stale.primarySkill);

// 4. Fatigue élevée : intensité basse et pas de bloc physique.
const tired = recommendSession(ctx({
  recentSessions: [1, 2].map((i) => ({ id: `s${i}`, created_at: iso(i), fatigue_level: 5 })) as WorkoutSession[],
}), { durationMinutes: 60 });
check("fatigue élevée → intensité basse", tired.intensity === "low", tired.intensity);
check("fatigue élevée → pas de bloc physique", tired.physicalSkill === null, String(tired.physicalSkill));

// 5. Adaptation de la difficulté, par paliers.
const easy = recommendSession(ctx({ recentFeedback: Array.from({ length: 8 }, () => fb("reception", "trop_facile")) }));
const hard = recommendSession(ctx({ recentFeedback: Array.from({ length: 8 }, () => fb("reception", "impossible")) }));
const base = 3; // intermediaire
check("8 « trop facile » → difficulté montée d'un cran max", easy.difficultyTarget === base + 1, String(easy.difficultyTarget));
check("8 « impossible » → difficulté baissée d'un cran max", hard.difficultyTarget === base - 1, String(hard.difficultyTarget));
check("difficulté toujours dans 1..5", [easy, hard].every((r) => r.difficultyTarget >= 1 && r.difficultyTarget <= 5), "");

// 6. Variété : ce qui vient d'être travaillé passe derrière.
const justDone = recommendSession(ctx({
  recentSessions: [{ id: "s1", created_at: iso(1) }] as WorkoutSession[],
  recentFeedback: Array.from({ length: 5 }, () => fb("reception", "adapte", 1, "s1")),
}));
check("compétence travaillée hier → ne repasse pas en principal", justDone.primarySkill !== "reception", justDone.primarySkill);

// 7. Choix manuel : la compétence imposée est respectée, sans raison inventée.
const manual = recommendSession(ctx(), { primarySkill: "bloc", durationMinutes: 30, intensity: "high" });
check("choix manuel respecté", manual.primarySkill === "bloc" && manual.durationMinutes === 30 && manual.intensity === "high", "");
check("choix manuel → pas de justification automatique", manual.reasons.length === 0, JSON.stringify(manual.reasons));

// 8. Scores : sous le seuil, rien n'est affirmé.
const few = computeSkillScores([fb("reception", "adapte"), fb("reception", "adapte")], []);
check(`${MIN_SAMPLE_SIZE - 1} observations → score non fiable`,
  few.find((s) => s.skill === "reception")?.reliable === false, "");

const many = computeSkillScores(Array.from({ length: 6 }, () => fb("reception", "trop_facile")), []);
const receptionScore = many.find((s) => s.skill === "reception");
check("6 observations positives → score fiable et > 50",
  receptionScore?.reliable === true && receptionScore.score > 50, JSON.stringify(receptionScore));

const struggling = computeSkillScores(Array.from({ length: 6 }, () => fb("service", "impossible")), []);
const serviceScore = struggling.find((s) => s.skill === "service");
check("6 échecs → score fiable et < 50", serviceScore?.reliable === true && serviceScore.score < 50, JSON.stringify(serviceScore));
check("tous les scores restent dans 0..100",
  [...many, ...struggling].every((s) => s.score >= 0 && s.score <= 100), "");

check("échauffement exclu des scores", many.every((s) => s.skill !== "echauffement"), "");

console.log(failures === 0 ? "\nTOUS LES CAS PASSENT" : `\n${failures} CAS EN ÉCHEC`);
process.exit(failures === 0 ? 0 : 1);
