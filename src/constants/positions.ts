import type { Position, PlayerLevel, TrainingFrequency, Objective, StatCategory } from "@/types/database";

export const POSITIONS: { value: Position; label: string; short: string }[] = [
  { value: "setter", label: "Passeur", short: "P" },
  { value: "outside_hitter", label: "Réceptionneur-attaquant", short: "R4" },
  { value: "opposite", label: "Pointu", short: "R2" },
  { value: "middle_blocker", label: "Central", short: "C" },
  { value: "libero", label: "Libéro", short: "L" },
];

export const LEVELS: { value: PlayerLevel; label: string }[] = [
  { value: "debutant", label: "Débutant" },
  { value: "intermediaire", label: "Intermédiaire" },
  { value: "avance", label: "Avancé" },
  { value: "competition", label: "Compétition" },
];

export const TRAINING_FREQUENCIES: { value: TrainingFrequency; label: string }[] = [
  { value: "1x_semaine", label: "1x / semaine" },
  { value: "2x_semaine", label: "2x / semaine" },
  { value: "3x_semaine", label: "3x / semaine" },
  { value: "4x_semaine", label: "4x / semaine" },
  { value: "5x_plus_semaine", label: "5x ou plus / semaine" },
];

export const OBJECTIVES: { value: Objective; label: string; icon: string }[] = [
  { value: "reception", label: "Améliorer ma réception", icon: "🙌" },
  { value: "service", label: "Améliorer mon service", icon: "🎾" },
  { value: "attaque", label: "Améliorer mon attaque", icon: "💥" },
  { value: "bloc", label: "Améliorer mon bloc", icon: "🧱" },
  { value: "detente", label: "Améliorer ma détente", icon: "⬆️" },
  { value: "vitesse", label: "Améliorer ma vitesse", icon: "⚡" },
  { value: "defense", label: "Améliorer ma défense", icon: "🛡️" },
  { value: "precision", label: "Améliorer ma précision", icon: "🎯" },
  { value: "regularite", label: "Améliorer ma régularité", icon: "🔁" },
  { value: "competition", label: "Préparer une compétition", icon: "🏆" },
  { value: "global", label: "Progresser globalement", icon: "🌱" },
];

export const STAT_CATEGORIES: { value: StatCategory; label: string; icon: string }[] = [
  { value: "service", label: "Service", icon: "🎾" },
  { value: "reception", label: "Réception", icon: "🙌" },
  { value: "attaque", label: "Attaque", icon: "💥" },
  { value: "bloc", label: "Bloc", icon: "🧱" },
  { value: "defense", label: "Défense", icon: "🛡️" },
  { value: "physique", label: "Physique", icon: "🏃" },
];

export const STAT_METRICS: Record<StatCategory, { key: string; label: string; unit: string }[]> = {
  service: [
    { key: "services_reussis", label: "Services réussis", unit: "" },
    { key: "fautes", label: "Fautes", unit: "" },
    { key: "aces", label: "Aces", unit: "" },
  ],
  reception: [
    { key: "receptions_positives", label: "Réceptions positives", unit: "" },
    { key: "receptions_parfaites", label: "Réceptions parfaites", unit: "" },
    { key: "erreurs", label: "Erreurs", unit: "" },
    { key: "pourcentage_reussite", label: "% de réussite", unit: "%" },
  ],
  attaque: [
    { key: "attaques_reussies", label: "Attaques réussies", unit: "" },
    { key: "fautes", label: "Fautes", unit: "" },
    { key: "blocs_subis", label: "Blocs subis", unit: "" },
    { key: "efficacite", label: "Efficacité", unit: "%" },
  ],
  bloc: [
    { key: "blocs_gagnants", label: "Blocs gagnants", unit: "" },
    { key: "touches", label: "Touches", unit: "" },
    { key: "fautes", label: "Fautes", unit: "" },
  ],
  defense: [
    { key: "defenses_reussies", label: "Défenses réussies", unit: "" },
    { key: "ballons_sauves", label: "Ballons sauvés", unit: "" },
    { key: "erreurs", label: "Erreurs", unit: "" },
  ],
  physique: [
    { key: "detente_cm", label: "Détente", unit: "cm" },
    { key: "vitesse_ms", label: "Vitesse (navette)", unit: "s" },
    { key: "explosivite", label: "Explosivité (score)", unit: "/10" },
    { key: "endurance_min", label: "Endurance", unit: "min" },
  ],
};

export function positionLabel(value: Position): string {
  return POSITIONS.find((p) => p.value === value)?.label ?? value;
}

export function levelLabel(value: PlayerLevel): string {
  return LEVELS.find((l) => l.value === value)?.label ?? value;
}

export function objectiveLabel(value: string): string {
  return OBJECTIVES.find((o) => o.value === value)?.label ?? value;
}
