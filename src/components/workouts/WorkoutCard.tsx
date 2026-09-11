import { StyleSheet, Text, View } from "react-native";
import { Target, Clock, Dumbbell } from "lucide-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { spacing } from "@/constants/theme";
import { objectiveLabel } from "@/constants/positions";
import type { Workout } from "@/types/database";

interface Props {
  workout: Workout;
  exerciseCount: number;
  onStart: () => void;
  starting?: boolean;
}

export function WorkoutCard({ workout, exerciseCount, onStart, starting }: Props) {
  const { theme } = useAppTheme();
  return (
    <Card>
      <Text style={[styles.eyebrow, { color: theme.primary }]}>SÉANCE RECOMMANDÉE</Text>
      <Text style={[styles.title, { color: theme.text }]}>{workout.title}</Text>
      <View style={styles.metaRow}>
        <MetaItem icon={<Target size={14} color={theme.textMuted} />} label={objectiveLabel(workout.objective)} />
        <MetaItem icon={<Clock size={14} color={theme.textMuted} />} label={`${workout.duration_minutes} min`} />
        <MetaItem icon={<Dumbbell size={14} color={theme.textMuted} />} label={`${exerciseCount} exercices`} />
      </View>
      <View style={{ marginTop: spacing.md }}>
        <Button label="Démarrer la séance" onPress={onStart} loading={starting} />
      </View>
    </Card>
  );
}

function MetaItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.metaItem}>
      {icon}
      <Text style={{ color: theme.textMuted, fontSize: 13, marginLeft: 4 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5, marginBottom: spacing.xs },
  title: { fontSize: 19, fontWeight: "800", marginBottom: spacing.xs },
  metaRow: { marginTop: spacing.xs, flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  metaItem: { flexDirection: "row", alignItems: "center" },
});
