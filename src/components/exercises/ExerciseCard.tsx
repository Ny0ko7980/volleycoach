import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Badge } from "@/components/ui/Badge";
import { spacing } from "@/constants/theme";
import type { Exercise } from "@/types/database";
import { levelLabel, objectiveLabel } from "@/constants/positions";

export function ExerciseCard({ exercise, onPress }: { exercise: Exercise; onPress?: () => void }) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>{exercise.duration_minutes} min</Text>
      </View>
      <Text style={[styles.description, { color: theme.textMuted }]} numberOfLines={2}>
        {exercise.description}
      </Text>
      <View style={styles.badgeRow}>
        <Badge label={objectiveLabel(exercise.objective)} tone="primary" />
        <Badge label={levelLabel(exercise.level)} tone="neutral" />
        <Badge label={"★".repeat(exercise.difficulty)} tone="warning" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: spacing.md, marginBottom: spacing.sm },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "700", flex: 1, marginRight: spacing.sm },
  description: { fontSize: 13, marginTop: spacing.xs, marginBottom: spacing.sm },
  badgeRow: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
});
