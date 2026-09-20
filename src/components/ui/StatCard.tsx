import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TrendingDown, TrendingUp } from "lucide-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Card } from "./Card";
import { radius, spacing, typography } from "@/constants/theme";

interface Props {
  icon: ReactNode;
  label: string;
  value: string;
  trend?: number; // pourcentage, positif ou négatif
}

// Carte statistique compacte — grille de métriques (Accueil, Progression).
// Composition distincte des cartes contenu (icône + valeur forte + label +
// tendance optionnelle), jamais un simple clone de Card générique.
export function StatCard({ icon, label, value, trend }: Props) {
  const { theme } = useAppTheme();
  const hasTrend = typeof trend === "number" && trend !== 0;
  const isPositive = (trend ?? 0) >= 0;

  return (
    <Card style={styles.card} noPadding>
      <View style={styles.inner}>
        <View style={[styles.iconWrap, { backgroundColor: theme.surfaceAlt }]}>{icon}</View>
        <Text style={[typography.statValue, styles.value, { color: theme.text }]}>{value}</Text>
        <Text style={[typography.caption, { color: theme.textMuted }]}>{label}</Text>
        {hasTrend ? (
          <View style={styles.trendRow}>
            {isPositive ? (
              <TrendingUp size={12} color={theme.success} />
            ) : (
              <TrendingDown size={12} color={theme.danger} />
            )}
            <Text style={[typography.caption, { color: isPositive ? theme.success : theme.danger, fontWeight: "700" }]}>
              {isPositive ? "+" : ""}
              {trend}%
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: "45%" },
  inner: { padding: spacing.md },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  value: { marginBottom: 2 },
  trendRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: spacing.xs },
});
