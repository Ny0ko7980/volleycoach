import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { spacing, typography } from "@/constants/theme";

interface Props {
  current: number; // 1-based
  total: number;
}

// Barre de progression de séance — "4 / 7 exercices", utilisée en mode focus.
export function WorkoutProgress({ current, total }: Props) {
  const { theme } = useAppTheme();
  const percent = total > 0 ? (current / total) * 100 : 0;
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[typography.caption, { color: theme.textMuted }]}>Progression de la séance</Text>
        <Text style={[typography.bodySecondaryStrong, { color: theme.text }]}>
          {current} / {total} exercices
        </Text>
      </View>
      <ProgressBar percent={percent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.xs },
});
