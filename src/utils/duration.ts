// Formate une durée en minutes en libellé court français ("2 h 18", "45 min").
export function formatDurationMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, "0")}`;
}

// Extrait un nombre de séances/semaine cible depuis l'enum TrainingFrequency
// ("3x_semaine" → 3, "5x_plus_semaine" → 5).
export function weeklySessionTarget(frequency: string | null | undefined): number {
  if (!frequency) return 3;
  const match = frequency.match(/^(\d+)/);
  return match ? Number(match[1]) : 3;
}

export function greetingForHour(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}
