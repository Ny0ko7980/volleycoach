import { useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useProfileStore } from "@/store/profileStore";
import { generateWorkout, startWorkoutSession } from "@/services/workoutService";
import { OBJECTIVES } from "@/constants/positions";
import { spacing, typography } from "@/constants/theme";
import type { Objective } from "@/types/database";
import { errorMessage } from "@/utils/errors";

const DURATIONS = [15, 20, 30, 45, 60];

export default function GenerateWorkoutScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { profile } = useProfileStore();
  const [objective, setObjective] = useState<Objective | null>(profile?.goals[0] ?? null);
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (!objective || !profile) {
      setError("Choisis un objectif.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const workout = await generateWorkout({
        objective,
        durationMinutes: duration,
        level: profile.level,
        position: profile.position,
      });
      const session = await startWorkoutSession(workout.id);
      router.replace(`/(tabs)/training/session/${session.id}`);
    } catch (e) {
      setError(errorMessage(e, "Impossible de générer la séance."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: theme.text }]}>Générer une séance</Text>

      <Text style={[styles.label, { color: theme.textMuted }]}>Objectif de la séance</Text>
      <View style={styles.wrap}>
        {OBJECTIVES.map((o) => (
          <Chip key={o.value} label={o.label} selected={objective === o.value} onPress={() => setObjective(o.value)} />
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textMuted }]}>Durée</Text>
      <View style={styles.wrap}>
        {DURATIONS.map((d) => (
          <Chip key={d} label={`${d} min`} selected={duration === d} onPress={() => setDuration(d)} />
        ))}
      </View>

      {error ? <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text> : null}

      <Button label="Générer et démarrer" onPress={handleGenerate} loading={loading} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.titleXL, marginTop: spacing.sm, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: "700", marginBottom: spacing.sm, marginTop: spacing.sm },
  wrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.lg },
});
