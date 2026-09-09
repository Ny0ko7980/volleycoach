import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatLineChart } from "@/components/charts/StatLineChart";
import { LoadingView } from "@/components/ui/LoadingView";
import { ErrorView } from "@/components/ui/ErrorView";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppTheme } from "@/hooks/useAppTheme";
import { fetchStatistics } from "@/services/statisticsService";
import { STAT_CATEGORIES, STAT_METRICS } from "@/constants/positions";
import { spacing } from "@/constants/theme";
import type { StatCategory, Statistic } from "@/types/database";

export default function StatisticsScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [statsByCategory, setStatsByCategory] = useState<Record<StatCategory, Statistic[]>>({
    service: [],
    reception: [],
    attaque: [],
    bloc: [],
    defense: [],
    physique: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchStatistics();
      const grouped: Record<StatCategory, Statistic[]> = { service: [], reception: [], attaque: [], bloc: [], defense: [], physique: [] };
      for (const s of all) grouped[s.category].push(s);
      setStatsByCategory(grouped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement des statistiques.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={load} />;

  const totalEntries = Object.values(statsByCategory).reduce((s, arr) => s + arr.length, 0);

  return (
    <ScreenContainer onRefresh={load} refreshing={loading}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text }]}>Statistiques</Text>
        <Button label="+ Ajouter" onPress={() => router.push("/(tabs)/stats/add")} fullWidth={false} />
      </View>

      <Button label="📈 Voir ma progression" variant="outline" onPress={() => router.push("/(tabs)/stats/progress")} />

      {totalEntries === 0 ? (
        <EmptyState
          icon="📊"
          title="Aucune statistique enregistrée"
          description="Ajoute tes premières statistiques après une séance ou un match."
          actionLabel="Ajouter une statistique"
          onAction={() => router.push("/(tabs)/stats/add")}
        />
      ) : (
        STAT_CATEGORIES.map((cat) => {
          const stats = statsByCategory[cat.value];
          if (stats.length === 0) return null;
          const metricGroups = groupByMetric(stats);
          return (
            <Card key={cat.value}>
              <Text style={[styles.categoryTitle, { color: theme.text }]}>
                {cat.icon} {cat.label}
              </Text>
              {Object.entries(metricGroups).map(([metric, values]) => (
                <View key={metric} style={styles.chartWrap}>
                  <StatLineChart title={metricLabel(cat.value, metric)} stats={values} unit={values[0]?.unit} />
                </View>
              ))}
            </Card>
          );
        })
      )}
    </ScreenContainer>
  );
}

function groupByMetric(stats: Statistic[]): Record<string, Statistic[]> {
  const groups: Record<string, Statistic[]> = {};
  for (const s of stats) {
    if (!groups[s.metric]) groups[s.metric] = [];
    groups[s.metric]!.push(s);
  }
  return groups;
}

function metricLabel(category: StatCategory, metricKey: string): string {
  return STAT_METRICS[category].find((m) => m.key === metricKey)?.label ?? metricKey;
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm, marginBottom: spacing.md },
  title: { fontSize: 24, fontWeight: "800" },
  categoryTitle: { fontSize: 16, fontWeight: "700", marginBottom: spacing.md },
  chartWrap: { marginBottom: spacing.md },
});
