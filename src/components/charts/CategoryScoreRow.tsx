import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { spacing } from "@/constants/theme";

interface Props {
  label: string;
  icon: string;
  score: number; // 0-100
}

export function CategoryScoreRow({ label, icon, score }: Props) {
  const { theme } = useAppTheme();
  const color = score >= 70 ? theme.success : score >= 40 ? theme.primary : theme.warning;
  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.score, { color }]}>{score}/100</Text>
      </View>
      <ProgressBar percent={score} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: spacing.md },
  labelRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xs },
  icon: { fontSize: 16, marginRight: spacing.xs },
  label: { flex: 1, fontSize: 14, fontWeight: "600" },
  score: { fontSize: 13, fontWeight: "700" },
});
