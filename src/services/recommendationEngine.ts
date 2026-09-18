import type {
  ExerciseFeedback,
  Intensity,
  PlayerProfile,
  Position,
  SkillSignal,
  TrainingSkill,
  WorkoutSession,
} from "@/types/database";
import { FEEDBACK_DIFFICULTY_DELTA, SCORED_SKILLS, skillForObjective, skillLabel } from "@/constants/skills";
import type { SkillScoreResult } from "@/services/skillScoring";

/**
 * Moteur de recommandation — logique déterministe.
 *
 * Il ne « génère » aucun exercice : il décide quoi travailler, à quelle
 * intensité et à quelle difficulté, puis laisse `workoutService` choisir les
 * exercices correspondants dans la bibliothèque. Cette séparation est ce qui
 * permet de brancher une IA plus tard (voir `aiPlanner.ts`) sans jamais lui
 * laisser inventer d'exercice.
 *
 * Ce module ne lit rien : il reçoit un `PlayerTrainingContext` déjà assemblé
 * par `trainingContextService`. À contexte identique il produit toujours la
 * même recommandation, ce qui le rend vérifiable et garantit que l'explication
 * affichée correspond au calcul réellement effectué.
 */

export interface PlayerTrainingContext {
  profile: PlayerProfile;
  recentSessions: WorkoutSession[];
  recentFeedback: ExerciseFeedback[];
  signals: SkillSignal[];
  scores: SkillScoreResult[];
}

export interface SessionRecommendation {
  primarySkill: TrainingSkill;
  secondarySkill: TrainingSkill | null;
  physicalSkill: TrainingSkill | null;
  durationMinutes: number;
  intensity: Intensity;
  /** Difficulté visée sur l'échelle 1-5 des exercices. */
  difficultyTarget: number;
  availableEquipment?: string[];
  excludeTags: string[];
  /** Phrases justifiant la recommandation. Vide si aucune donnée ne la soutient. */
  reasons: string[];
}

/** Compétences prioritaires par poste, dans l'ordre d'importance. */
const POSITION_PRIORITIES: Record<Position, TrainingSkill[]> = {
  libero: ["reception", "defense", "deplacements"],
  outside_hitter: ["reception", "attaque", "defense"],
  opposite: ["attaque", "bloc", "detente"],
  middle_blocker: ["bloc", "attaque", "deplacements"],
  setter: ["passe", "lecture_jeu", "deplacements"],
};

const DEFAULT_DURATION = 45;
const SIGNAL_HALF_LIFE_DAYS = 21;
/** Nombre de séances récentes au-delà duquel une compétence est jugée « déjà beaucoup vue ». */
const RECENT_SESSIONS_WINDOW = 4;

/**
 * Poids d'un signal selon son ancienneté : un constat d'il y a trois semaines
 * pèse moitié moins qu'un constat d'aujourd'hui. Sans cela, un point faible
 * corrigé depuis longtemps continuerait d'orienter les séances.
 */
function decayedWeight(signal: SkillSignal, now: number): number {
  const ageDays = (now - new Date(signal.created_at).getTime()) / 86_400_000;
  return signal.weight * Math.pow(0.5, Math.max(0, ageDays) / SIGNAL_HALF_LIFE_DAYS);
}

interface SkillPriority {
  skill: TrainingSkill;
  priority: number;
  /** Raison principale du classement, reprise telle quelle dans l'explication affichée. */
  reason: string | null;
}

/**
 * Classe les compétences par priorité de travail.
 *
 * Chaque contribution est bornée pour qu'aucun critère ne domine à lui seul :
 * un objectif déclaré ne doit pas écraser une faiblesse mesurée, et
 * inversement.
 */
function rankSkills(context: PlayerTrainingContext): SkillPriority[] {
  const { profile, signals, scores } = context;
  const now = Date.now();

  const weaknessWeight = new Map<TrainingSkill, number>();
  for (const signal of signals) {
    const weight = decayedWeight(signal, now) * (signal.direction === "weakness" ? 1 : -1);
    weaknessWeight.set(signal.skill, (weaknessWeight.get(signal.skill) ?? 0) + weight);
  }

  const goalSkills = new Set(
    profile.goals.map(skillForObjective).filter((skill): skill is TrainingSkill => skill !== null)
  );
  const positionSkills = POSITION_PRIORITIES[profile.position] ?? [];
  const recentSkills = recentTrainedSkills(context);

  return SCORED_SKILLS.map((skill) => {
    let priority = 0;
    let reason: string | null = null;

    // 1. Faiblesses observées (ressenti aujourd'hui, analyse vidéo demain).
    const weakness = weaknessWeight.get(skill) ?? 0;
    if (weakness > 0) {
      priority += Math.min(40, weakness * 12);
      if (weakness >= 1.5) {
        reason = `Tes derniers retours montrent des difficultés en ${skillLabel(skill).toLowerCase()}.`;
      }
    } else if (weakness < 0) {
      priority += Math.max(-15, weakness * 6);
    }

    // 2. Score de progression, uniquement s'il repose sur assez de données.
    const score = scores.find((entry) => entry.skill === skill);
    if (score?.reliable) {
      priority += (60 - score.score) * 0.4;
      if (score.score < 45 && !reason) {
        reason = `Ton score en ${skillLabel(skill).toLowerCase()} est le plus bas de ton profil.`;
      }
    }

    // 3. Objectifs déclarés par le joueur.
    if (goalSkills.has(skill)) {
      priority += 20;
      if (!reason) reason = `C'est l'un des objectifs que tu as choisis.`;
    }

    // 4. Pertinence pour le poste.
    const positionRank = positionSkills.indexOf(skill);
    if (positionRank >= 0) priority += 15 - positionRank * 4;

    // 5. Variété : ce qui vient d'être travaillé passe derrière.
    const timesTrained = recentSkills.get(skill) ?? 0;
    priority -= timesTrained * 8;

    return { skill, priority, reason };
  }).sort((a, b) => b.priority - a.priority);
}

/** Compte, par compétence, les ressentis laissés lors des séances récentes. */
function recentTrainedSkills(context: PlayerTrainingContext): Map<TrainingSkill, number> {
  const recentSessionIds = new Set(context.recentSessions.slice(0, RECENT_SESSIONS_WINDOW).map((s) => s.id));
  const counts = new Map<TrainingSkill, number>();
  for (const entry of context.recentFeedback) {
    if (!recentSessionIds.has(entry.session_id)) continue;
    counts.set(entry.skill, (counts.get(entry.skill) ?? 0) + 1);
  }
  return counts;
}

const LEVEL_BASE_DIFFICULTY: Record<PlayerProfile["level"], number> = {
  debutant: 2,
  intermediaire: 3,
  avance: 4,
  competition: 4,
};

/**
 * Difficulté visée pour une compétence : la difficulté de base du niveau,
 * ajustée par les ressentis déjà exprimés sur cette compétence.
 *
 * L'ajustement est borné à ±1 point autour de la base : le moteur fait
 * évoluer la difficulté par paliers, jamais d'un bloc.
 */
function difficultyForSkill(context: PlayerTrainingContext, skill: TrainingSkill): number {
  const base = LEVEL_BASE_DIFFICULTY[context.profile.level];
  const relevant = context.recentFeedback.filter((entry) => entry.skill === skill);
  if (relevant.length === 0) return base;

  const delta = relevant.reduce((total, entry) => total + FEEDBACK_DIFFICULTY_DELTA[entry.rating], 0);
  const bounded = Math.max(-1, Math.min(1, delta));
  return Math.max(1, Math.min(5, Math.round((base + bounded) * 2) / 2));
}

/**
 * Fatigue récente : moyenne des fatigues déclarées sur les séances terminées
 * des sept derniers jours. `null` si le joueur n'en a déclaré aucune — auquel
 * cas le moteur n'invente rien et ne mentionne pas la fatigue.
 */
function recentFatigue(sessions: WorkoutSession[]): number | null {
  const weekAgo = Date.now() - 7 * 86_400_000;
  const values = sessions
    .filter((session) => new Date(session.created_at).getTime() >= weekAgo)
    .map((session) => session.fatigue_level)
    .filter((value): value is number => typeof value === "number");
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export interface RecommendationOverrides {
  durationMinutes?: number;
  intensity?: Intensity;
  /** Compétence imposée par le joueur dans le parcours « Choisir mon entraînement ». */
  primarySkill?: TrainingSkill;
  availableEquipment?: string[];
}

/**
 * Construit la recommandation du jour.
 *
 * Fonction pure : à contexte identique, elle produit la même recommandation,
 * ce qui la rend vérifiable et permet d'afficher une explication fidèle au
 * calcul réellement effectué.
 */
export function recommendSession(
  context: PlayerTrainingContext,
  overrides: RecommendationOverrides = {}
): SessionRecommendation {
  const { profile } = context;
  const ranked = rankSkills(context);
  const reasons: string[] = [];

  const primary = overrides.primarySkill ?? ranked[0]?.skill ?? "reception";
  const secondary = ranked.find((entry) => entry.skill !== primary)?.skill ?? null;

  // L'explication n'est reprise que si elle vient d'une donnée réelle.
  if (!overrides.primarySkill) {
    const primaryReason = ranked.find((entry) => entry.skill === primary)?.reason;
    if (primaryReason) reasons.push(primaryReason);
  }

  const durationMinutes =
    overrides.durationMinutes ?? profile.preferred_duration_minutes ?? DEFAULT_DURATION;

  const fatigue = recentFatigue(context.recentSessions);
  let intensity: Intensity = overrides.intensity ?? intensityForLevel(profile.level);
  if (!overrides.intensity && fatigue !== null && fatigue >= 4) {
    intensity = "low";
    reasons.push("Tes dernières séances t'ont laissé fatigué : on garde une intensité basse.");
  }

  // Bloc physique seulement si la séance est assez longue et le joueur pas épuisé.
  const physicalSkill =
    durationMinutes >= 45 && (fatigue === null || fatigue < 4)
      ? ranked.find((entry) => isPhysical(entry.skill) && entry.skill !== primary)?.skill ?? null
      : null;

  const difficultyTarget = difficultyForSkill(context, primary);
  const baseDifficulty = LEVEL_BASE_DIFFICULTY[profile.level];
  if (difficultyTarget > baseDifficulty) {
    reasons.push("Tu as trouvé plusieurs exercices trop faciles : la difficulté monte d'un cran.");
  } else if (difficultyTarget < baseDifficulty) {
    reasons.push("Plusieurs exercices t'ont posé problème : on repart sur des versions plus abordables.");
  }

  return {
    primarySkill: primary,
    secondarySkill: secondary,
    physicalSkill,
    durationMinutes,
    intensity,
    difficultyTarget,
    availableEquipment: overrides.availableEquipment ?? nonEmpty(profile.available_equipment),
    excludeTags: profile.avoid_tags ?? [],
    reasons,
  };
}

const PHYSICAL_SKILLS: TrainingSkill[] = ["detente", "deplacements", "renforcement", "mobilite"];

function isPhysical(skill: TrainingSkill): boolean {
  return PHYSICAL_SKILLS.includes(skill);
}

function intensityForLevel(level: PlayerProfile["level"]): Intensity {
  if (level === "debutant") return "low";
  if (level === "intermediaire") return "medium";
  return "high";
}

function nonEmpty(values: string[] | undefined): string[] | undefined {
  return values && values.length > 0 ? values : undefined;
}

/** Phrase d'annonce de la séance, construite uniquement à partir des compétences retenues. */
export function describeRecommendation(recommendation: SessionRecommendation): string {
  const primary = skillLabel(recommendation.primarySkill).toLowerCase();
  if (!recommendation.secondarySkill) {
    return `Aujourd'hui, VolleyCoach te recommande de travailler ta ${primary}.`;
  }
  const secondary = skillLabel(recommendation.secondarySkill).toLowerCase();
  return `Aujourd'hui, VolleyCoach te recommande de travailler ta ${primary} et tes ${secondary}.`;
}
