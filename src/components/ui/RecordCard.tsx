import { StyleSheet, Text, View } from "react-native";
import { Trophy } from "lucide-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Card } from "./Card";
import { spacing, typography } from "@/constants/theme";

interface Props {
  categoryLabel: string;
  value: string;
  deltaLabel?: string;
}

// Carte record personnel — composition héros avec dégradé subtil réservé à
// cet usage précis (donnée la plus valorisante de l'écran Progression).
export function RecordCard({ categoryLabel, value, deltaLabel }: Props) {
  const { theme } = useAppTheme();
  return (
    <Card style={[styles.card, { backgroundColor: theme.primaryMuted, borderColor: theme.primary + "33" }]}>
      <View style={styles.header}>
        <Trophy size={16} color={theme.primary} />
        <Text style={[typography.eyebrow, { color: theme.primary }]}>MEILLEUR RECORD</Text>
      </View>
      <Text style={[typography.caption, { color: theme.textMuted, marginBottom: spacing.xs }]}>{categoryLabel}</Text>
      <Text style={[typography.display, { color: theme.text }]}>{value}</Text>
      {deltaLabel ? (
        <Text style={[typography.bodySecondaryStrong, { color: theme.success, marginTop: spacing.xs }]}>{deltaLabel}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm },
});
