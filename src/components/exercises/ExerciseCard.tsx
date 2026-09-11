import { Pressable, StyleSheet, Text, View } from "react-native";
import { Clock } from "lucide-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Badge } from "@/components/ui/Badge";
import { DifficultyDots } from "@/components/ui/DifficultyDots";
import { radius, shadow, spacing, typography } from "@/constants/theme";
import type { Exercise } from "@/types/database";
import { levelLabel, objectiveLabel } from "@/constants/positions";

export function ExerciseCard({ exercise, onPress }: { exercise: Exercise; onPress?: () => void }) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        shadow.sm,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[typography.titleM, styles.name, { color: theme.text }]} numberOfLines={1}>
          {exercise.name}
        </Text>
        <View style={styles.durationRow}>
          <Clock size={12} color={theme.textMuted} />
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>{exercise.duration_minutes} min</Text>
        </View>
      </View>
      <Text style={[typography.bodySecondary, { color: theme.textMuted }]} numberOfLines={2}>
        {exercise.description}
      </Text>
      <View style={styles.footerRow}>
        <View style={styles.badgeRow}>
          <Badge label={objectiveLabel(exercise.objective)} tone="primary" />
          <Badge label={levelLabel(exercise.level)} tone="neutral" />
        </View>
        <DifficultyDots value={exercise.difficulty} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.md, marginBottom: spacing.sm },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { flex: 1, marginRight: spacing.sm },
  durationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  badgeRow: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap", flex: 1 },
});
