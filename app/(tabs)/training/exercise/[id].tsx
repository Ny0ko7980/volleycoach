import { useEffect, useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { TriangleAlert, Lightbulb } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingView } from "@/components/ui/LoadingView";
import { ErrorView } from "@/components/ui/ErrorView";
import { useAppTheme } from "@/hooks/useAppTheme";
import { fetchExerciseById } from "@/services/exerciseService";
import { levelLabel, objectiveLabel, positionLabel } from "@/constants/positions";
import { spacing } from "@/constants/theme";
import type { Exercise } from "@/types/database";

export default function ExerciseDetailScreen() {
  const { theme } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchExerciseById(id)
      .then(setExercise)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} />;
  if (!exercise) return <ErrorView message="Exercice introuvable." />;

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: theme.text }]}>{exercise.name}</Text>
      <View style={styles.badgeRow}>
        <Badge label={objectiveLabel(exercise.objective)} tone="primary" />
        <Badge label={levelLabel(exercise.level)} />
        <Badge label={`${exercise.duration_minutes} min`} />
        <Badge label={"★".repeat(exercise.difficulty)} tone="warning" />
      </View>

      <Text style={{ color: theme.textMuted, marginBottom: spacing.lg }}>{exercise.description}</Text>

      {exercise.positions.length > 0 ? (
        <Card>
          <Text style={styles.sectionTitle}>Postes concernés</Text>
          <Text style={{ color: theme.textMuted }}>{exercise.positions.map(positionLabel).join(", ")}</Text>
        </Card>
      ) : null}

      {exercise.equipment.length > 0 ? (
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Matériel nécessaire</Text>
          <Text style={{ color: theme.textMuted }}>{exercise.equipment.join(", ")}</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Instructions</Text>
        <Text style={{ color: theme.textMuted, lineHeight: 20 }}>{exercise.instructions}</Text>
      </Card>

      {exercise.common_mistakes ? (
        <Card>
          <View style={styles.sectionTitleRow}>
            <TriangleAlert size={15} color={theme.warning} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Erreurs fréquentes</Text>
          </View>
          <Text style={{ color: theme.textMuted, lineHeight: 20 }}>{exercise.common_mistakes}</Text>
        </Card>
      ) : null}

      {exercise.tips ? (
        <Card>
          <View style={styles.sectionTitleRow}>
            <Lightbulb size={15} color={theme.warning} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Conseil</Text>
          </View>
          <Text style={{ color: theme.textMuted, lineHeight: 20 }}>{exercise.tips}</Text>
        </Card>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", marginTop: spacing.sm, marginBottom: spacing.sm },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.xs },
  sectionTitle: { fontSize: 14, fontWeight: "700" },
});
