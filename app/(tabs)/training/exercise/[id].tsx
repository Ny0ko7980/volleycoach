import { useEffect, useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { TriangleAlert, Lightbulb, Clock } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DifficultyDots } from "@/components/ui/DifficultyDots";
import { ExerciseVideo } from "@/components/exercises/ExerciseVideo";
import { LoadingView } from "@/components/ui/LoadingView";
import { ErrorView } from "@/components/ui/ErrorView";
import { useAppTheme } from "@/hooks/useAppTheme";
import { fetchExerciseById } from "@/services/exerciseService";
import { levelLabel, objectiveLabel, positionLabel } from "@/constants/positions";
import { spacing, typography } from "@/constants/theme";
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
      <Text style={[typography.titleXL, styles.title, { color: theme.text }]}>{exercise.name}</Text>
      <View style={styles.badgeRow}>
        <Badge label={objectiveLabel(exercise.objective)} tone="primary" />
        <Badge label={levelLabel(exercise.level)} tone="neutral" />
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Clock size={14} color={theme.textMuted} />
          <Text style={[typography.bodySecondary, { color: theme.textMuted }]}>{exercise.duration_minutes} min</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={[typography.bodySecondary, { color: theme.textMuted, marginRight: 4 }]}>Difficulté</Text>
          <DifficultyDots value={exercise.difficulty} />
        </View>
      </View>

      <Text style={[typography.body, { color: theme.textMuted, marginBottom: spacing.lg }]}>{exercise.description}</Text>

      {exercise.media_url ? (
        <View style={{ marginBottom: spacing.md }}>
          <ExerciseVideo url={exercise.media_url} />
        </View>
      ) : null}

      {exercise.positions.length > 0 ? (
        <Card>
          <Text style={[typography.bodySecondaryStrong, { color: theme.text }]}>Zone travaillée</Text>
          <Text style={[typography.bodySecondary, { color: theme.textMuted, marginTop: 2 }]}>
            {exercise.positions.map(positionLabel).join(", ")}
          </Text>
        </Card>
      ) : null}

      {exercise.equipment.length > 0 ? (
        <Card>
          <Text style={[typography.bodySecondaryStrong, { color: theme.text }]}>Matériel nécessaire</Text>
          <Text style={[typography.bodySecondary, { color: theme.textMuted, marginTop: 2 }]}>
            {exercise.equipment.join(", ")}
          </Text>
        </Card>
      ) : null}

      <Card>
        <Text style={[typography.bodySecondaryStrong, { color: theme.text }]}>Instructions</Text>
        <Text style={[typography.bodySecondary, { color: theme.textMuted, marginTop: 2, lineHeight: 20 }]}>
          {exercise.instructions}
        </Text>
      </Card>

      {exercise.common_mistakes ? (
        <Card>
          <View style={styles.sectionTitleRow}>
            <TriangleAlert size={15} color={theme.warning} />
            <Text style={[typography.bodySecondaryStrong, { color: theme.text }]}>Erreurs fréquentes</Text>
          </View>
          <Text style={[typography.bodySecondary, { color: theme.textMuted, lineHeight: 20 }]}>{exercise.common_mistakes}</Text>
        </Card>
      ) : null}

      {exercise.tips ? (
        <Card>
          <View style={styles.sectionTitleRow}>
            <Lightbulb size={15} color={theme.warning} />
            <Text style={[typography.bodySecondaryStrong, { color: theme.text }]}>Conseil</Text>
          </View>
          <Text style={[typography.bodySecondary, { color: theme.textMuted, lineHeight: 20 }]}>{exercise.tips}</Text>
        </Card>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.sm, marginBottom: spacing.sm },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginBottom: spacing.md },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.xs },
});
