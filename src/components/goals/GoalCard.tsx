import { StyleSheet, Text, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { spacing } from "@/constants/theme";
import type { Goal } from "@/types/database";
import { goalProgressPercent } from "@/services/goalsService";

export function GoalCard({ goal, onDelete }: { goal: Goal; onDelete?: (goal: Goal) => void }) {
  const { theme } = useAppTheme();
  const percent = goalProgressPercent(goal);

  return (
    <Card>
      <View style={styles.headerRow}>
        <Text style={[styles.name, { color: theme.text }]}>{goal.name}</Text>
        <View style={styles.headerActions}>
          {goal.status === "achieved" ? <Badge label="Atteint ✅" tone="success" /> : <Badge label={`${percent}%`} tone="primary" />}
          {onDelete ? (
            <IconButton
              icon={<Trash2 size={16} color={theme.danger} />}
              onPress={() => onDelete(goal)}
              accessibilityLabel={`Supprimer l'objectif ${goal.name}`}
              size={32}
            />
          ) : null}
        </View>
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
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { fontSize: 15, fontWeight: "700", flex: 1, marginRight: spacing.sm },
});
