import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { spacing } from "@/constants/theme";
import type { Goal } from "@/types/database";
import { goalProgressPercent } from "@/services/goalsService";

export function GoalCard({ goal }: { goal: Goal }) {
  const { theme } = useAppTheme();
  const percent = goalProgressPercent(goal);

  return (
    <Card>
      <View style={styles.headerRow}>
        <Text style={[styles.name, { color: theme.text }]}>{goal.name}</Text>
        {goal.status === "achieved" ? <Badge label="Atteint ✅" tone="success" /> : <Badge label={`${percent}%`} tone="primary" />}
      </View>
      <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: spacing.sm }}>
        Actuel: {goal.current_value}
        {goal.unit ?? ""} · Objectif: {goal.target_value}
        {goal.unit ?? ""}
      </Text>
      <ProgressBar percent={percent} color={goal.status === "achieved" ? theme.success : theme.primary} />
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  name: { fontSize: 15, fontWeight: "700", flex: 1, marginRight: spacing.sm },
});
