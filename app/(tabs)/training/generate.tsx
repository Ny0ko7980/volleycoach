import { useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useProfileStore } from "@/store/profileStore";
import { updateMyProfile } from "@/services/profileService";
import {
  recommendSession,
  type RecommendationOverrides,
} from "@/services/recommendationEngine";
import { buildTrainingContext } from "@/services/trainingContextService";
import { generateWorkoutFromRecommendation, startWorkoutSession } from "@/services/workoutService";
import { EQUIPMENT_OPTIONS, SKILLS, skillIcon } from "@/constants/skills";
import { spacing, typography } from "@/constants/theme";
import type { Intensity, TrainingSkill } from "@/types/database";
import { errorMessage } from "@/utils/errors";

const DURATIONS = [20, 30, 45, 60, 90];

const INTENSITIES: { value: Intensity; label: string }[] = [
  { value: "low", label: "Légère" },
  { value: "medium", label: "Modérée" },
  { value: "high", label: "Élevée" },
];

/**
 * Parcours « Choisir mon entraînement ».
 *
 * Le joueur impose ce qu'il veut travailler, mais la séance passe par le même
 * moteur que la séance recommandée : son poste, son niveau et ses ressentis
 * continuent d'écarter les exercices inadaptés.
 */
export default function ChooseWorkoutScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { profile, updateLocal } = useProfileStore();

  const [skill, setSkill] = useState<TrainingSkill | null>(null);
  const [duration, setDuration] = useState(profile?.preferred_duration_minutes ?? 45);
  const [intensity, setIntensity] = useState<Intensity | null>(null);
  const [equipment, setEquipment] = useState<string[]>(profile?.available_equipment ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleEquipment(value: string) {
    setEquipment((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  async function handleGenerate() {
    if (!profile) return;
    if (!skill) {
      setError("Choisis ce que tu veux travailler.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const overrides: RecommendationOverrides = {
        primarySkill: skill,
        durationMinutes: duration,
        ...(intensity ? { intensity } : {}),
        // Une liste vide signifie « je n'ai rien indiqué » : on ne filtre pas
        // sur le matériel plutôt que d'exclure tous les exercices.
        ...(equipment.length > 0 ? { availableEquipment: equipment } : {}),
      };
      const context = await buildTrainingContext(profile);
      const recommendation = recommendSession(context, overrides);
      const workout = await generateWorkoutFromRecommendation(recommendation, profile);
      const session = await startWorkoutSession(workout.id);
      await rememberPreferences();
      router.replace(`/(tabs)/training/session/${session.id}`);
    } catch (e) {
      setError(errorMessage(e, "Impossible de générer la séance."));
    } finally {
      setLoading(false);
    }
  }

  /**
   * Retient durée et matériel comme préférences par défaut : la séance
   * recommandée les reprendra sans que le joueur ait à les ressaisir. Un échec
   * ne doit pas empêcher la séance de démarrer, elle est déjà créée.
   */
  async function rememberPreferences() {
    const patch = { preferred_duration_minutes: duration, available_equipment: equipment };
    updateLocal(patch);
    await updateMyProfile(patch).catch(() => undefined);
  }

  return (
    <ScreenContainer>
      <Text style={[typography.titleXL, styles.title, { color: theme.text }]}>Choisir mon entraînement</Text>
      <Text style={[typography.bodySecondary, styles.intro, { color: theme.textMuted }]}>
        Ton poste, ton niveau et tes derniers ressentis continuent d'écarter les exercices inadaptés. Ces choix
        deviennent tes préférences par défaut.
      </Text>

      <Text style={[styles.label, { color: theme.textMuted }]}>Que veux-tu travailler ?</Text>
      <View style={styles.wrap}>
        {SKILLS.filter((item) => item.value !== "echauffement").map((item) => (
          <Chip
            key={item.value}
            label={`${skillIcon(item.value)} ${item.label}`}
            selected={skill === item.value}
            onPress={() => setSkill(item.value)}
          />
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textMuted }]}>Durée</Text>
      <View style={styles.wrap}>
        {DURATIONS.map((value) => (
          <Chip
            key={value}
            label={`${value} min`}
            selected={duration === value}
            onPress={() => setDuration(value)}
          />
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textMuted }]}>Intensité</Text>
      <View style={styles.wrap}>
        {INTENSITIES.map((item) => (
          <Chip
            key={item.value}
            label={item.label}
            selected={intensity === item.value}
            onPress={() => setIntensity(intensity === item.value ? null : item.value)}
          />
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textMuted }]}>Matériel disponible</Text>
      <Text style={[typography.caption, { color: theme.textFaint, marginBottom: spacing.sm }]}>
        Sans sélection, aucun filtre n'est appliqué.
      </Text>
      <View style={styles.wrap}>
        {EQUIPMENT_OPTIONS.map((item) => (
          <Chip
            key={item.value}
            label={item.label}
            selected={equipment.includes(item.value)}
            onPress={() => toggleEquipment(item.value)}
          />
        ))}
      </View>

      {error ? <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text> : null}

      <Button label="Générer et démarrer" onPress={handleGenerate} loading={loading} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.sm, marginBottom: spacing.sm },
  intro: { marginBottom: spacing.lg, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: "700", marginBottom: spacing.sm, marginTop: spacing.sm },
  wrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.lg },
});
