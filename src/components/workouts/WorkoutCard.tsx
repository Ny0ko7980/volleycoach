import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Target, Clock, Dumbbell, Play } from "lucide-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Button } from "@/components/ui/Button";
import { radius, shadow, spacing, typography, gradient } from "@/constants/theme";
import { objectiveLabel } from "@/constants/positions";
import type { Workout } from "@/types/database";

interface Props {
  workout: Workout;
  exerciseCount: number;
  onStart: () => void;
  starting?: boolean;
}

// Carte "entraînement du jour" — composition héros distincte du reste des
// cartes : dégradé d'accent réservé à ce bloc précis, seule surface de
// l'app à en porter un (comme demandé : CTA majeur / visualisation
// d'entraînement).
export function WorkoutCard({ workout, exerciseCount, onStart, starting }: Props) {
  const { theme } = useAppTheme();
  return (
    <LinearGradient
      colors={gradient.accent}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, shadow.md]}
    >
      <Text style={styles.eyebrow}>TON ENTRAÎNEMENT DU JOUR</Text>
      <Text style={styles.title}>{workout.title}</Text>
      <View style={styles.metaRow}>
        <MetaItem icon={<Target size={14} color="#FFFFFF" />} label={objectiveLabel(workout.objective)} />
        <MetaItem icon={<Clock size={14} color="#FFFFFF" />} label={`${workout.duration_minutes} min`} />
        <MetaItem icon={<Dumbbell size={14} color="#FFFFFF" />} label={`${exerciseCount} exercices`} />
      </View>
      <View style={{ marginTop: spacing.lg }}>
        <Button
          label="Commencer"
          variant="secondary"
          icon={<Play size={16} color={theme.text} fill={theme.text} />}
          onPress={onStart}
          loading={starting}
        />
      </View>
    </LinearGradient>
  );
}

function MetaItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.metaItem}>
      {icon}
      <Text style={styles.metaLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xxl, padding: spacing.lg, marginBottom: spacing.md },
  eyebrow: { ...typography.eyebrow, color: "rgba(255,255,255,0.85)", marginBottom: spacing.xs },
  title: { ...typography.titleXL, fontSize: 22, color: "#FFFFFF", marginBottom: spacing.sm },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaLabel: { color: "rgba(255,255,255,0.92)", fontSize: 13, fontWeight: "600" },
});
