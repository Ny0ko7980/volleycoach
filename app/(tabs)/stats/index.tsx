import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ChartNoAxesColumn, Calendar, Clock, Flame, Gauge } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { StatCard } from "@/components/ui/StatCard";
import { RecordCard } from "@/components/ui/RecordCard";
import { GoalCard } from "@/components/goals/GoalCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatLineChart } from "@/components/charts/StatLineChart";
import { CategoryScoreRow } from "@/components/charts/CategoryScoreRow";
import { SkeletonCard, Skeleton } from "@/components/ui/Skeleton";
import { ErrorView } from "@/components/ui/ErrorView";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useProfileStore } from "@/store/profileStore";
import { fetchStatistics, computeCategoryScore, computePersonalBest } from "@/services/statisticsService";
import { fetchGoals } from "@/services/goalsService";
import { fetchSessionHistory } from "@/services/workoutService";
import { STAT_CATEGORIES, STAT_METRICS } from "@/constants/positions";
import { spacing, typography } from "@/constants/theme";
import { formatDurationMinutes } from "@/utils/duration";
import type { Goal, StatCategory, Statistic, WorkoutSession } from "@/types/database";

type Period = "7j" | "30j" | "3m" | "tout";
const PERIODS: { value: Period; label: string; days: number | null }[] = [
  { value: "7j", label: "7 jours", days: 7 },
  { value: "30j", label: "30 jours", days: 30 },
  { value: "3m", label: "3 mois", days: 90 },
  { value: "tout", label: "Tout", days: null },
];

export default function StatisticsScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { profile } = useProfileStore();
  const [period, setPeriod] = useState<Period>("30j");
  const [allStats, setAllStats] = useState<Statistic[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stats, history, activeGoals] = await Promise.all([
        fetchStatistics(),
        fetchSessionHistory(200),
        fetchGoals("active"),
      ]);
      setAllStats(stats);
      setSessions(history);
      setGoals(activeGoals);
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

  // Volontairement non mémoïsé : Date.now() est un appel impur, il ne doit
  // pas être figé dans un useMemo (sinon la fenêtre glissante resterait
  // bloquée sur l'instant du premier rendu).
  const days = PERIODS.find((p) => p.value === period)?.days;
  const cutoff = days ? Date.now() - days * 86_400_000 : null;

  const periodStats = useMemo(
    () => (cutoff ? allStats.filter((s) => new Date(s.recorded_at).getTime() >= cutoff) : allStats),
    [allStats, cutoff]
  );
  const periodSessions = useMemo(
    () =>
      (cutoff ? sessions.filter((s) => new Date(s.created_at).getTime() >= cutoff) : sessions).filter(
        (s) => s.status === "completed"
      ),
    [sessions, cutoff]
  );

  const statsByCategory = useMemo(() => {
    const grouped: Record<StatCategory, Statistic[]> = { service: [], reception: [], attaque: [], bloc: [], defense: [], physique: [] };
    for (const s of periodStats) grouped[s.category].push(s);
    return grouped;
  }, [periodStats]);

  const totalMinutes = periodSessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);
  const trainingLoad = periodSessions.reduce(
    (sum, s) => sum + (s.duration_minutes ?? 0) * (s.perceived_difficulty ?? 3),
    0
  );

  // Le record personnel reste calculé sur tout l'historique, indépendamment
  // de la période sélectionnée (un record ne "disparaît" pas quand on filtre).
  const personalBest = useMemo(() => {
    let best: { categoryLabel: string; value: number; unit: string | null; delta: number } | null = null;
    for (const cat of STAT_CATEGORIES) {
      const pb = computePersonalBest(allStats.filter((s) => s.category === cat.value));
      if (!pb) continue;
      const metricLabel = STAT_METRICS[cat.value].find((m) => m.key === pb.metric)?.label ?? pb.metric;
      if (!best || pb.value > best.value) {
        best = { categoryLabel: `${cat.label} · ${metricLabel}`, value: pb.value, unit: pb.unit, delta: pb.value - pb.firstValue };
      }
    }
    return best;
  }, [allStats]);

  if (loading) return <ProgressionSkeleton />;
  if (error) return <ErrorView message={error} onRetry={load} />;

  const totalEntries = allStats.length;

  return (
    <ScreenContainer onRefresh={load} refreshing={loading}>
      <View style={styles.headerRow}>
        <Text style={[typography.titleXL, { color: theme.text }]}>Progression</Text>
        <Button label="+ Ajouter" fullWidth={false} size="compact" onPress={() => router.push("/(tabs)/stats/add")} />
      </View>

      {totalEntries === 0 ? (
        <EmptyState
          icon={<ChartNoAxesColumn size={26} color={theme.textMuted} />}
          title="Aucune statistique enregistrée"
          description="Ajoute tes premières statistiques après une séance ou un match."
          actionLabel="Ajouter une statistique"
          onAction={() => router.push("/(tabs)/stats/add")}
        />
      ) : (
        <>
          <View style={styles.periodRow}>
            {PERIODS.map((p) => (
              <Chip key={p.value} label={p.label} selected={period === p.value} onPress={() => setPeriod(p.value)} />
            ))}
          </View>

          {personalBest ? (
            <RecordCard
              categoryLabel={personalBest.categoryLabel}
              value={`${personalBest.value}${personalBest.unit ?? ""}`}
              deltaLabel={personalBest.delta !== 0 ? `${personalBest.delta > 0 ? "+" : ""}${Math.round(personalBest.delta)}${personalBest.unit ?? ""} depuis le début` : undefined}
            />
          ) : null}

          <View style={styles.statGrid}>
            <StatCard icon={<Calendar size={16} color={theme.primary} />} label="Séances" value={`${periodSessions.length}`} />
            <StatCard icon={<Clock size={16} color={theme.primary} />} label="Temps total" value={formatDurationMinutes(totalMinutes)} />
            <StatCard icon={<Flame size={16} color={theme.primary} />} label="Série actuelle" value={`${profile?.streak_count ?? 0} j`} />
            <StatCard icon={<Gauge size={16} color={theme.primary} />} label="Charge d'entraînement" value={`${Math.round(trainingLoad)}`} />
          </View>

          {goals.length > 0 ? (
            <>
              <SectionHeader title="Objectifs" action="Gérer" onAction={() => router.push("/(tabs)/profile/goals")} />
              {goals.slice(0, 2).map((g) => (
                <GoalCard key={g.id} goal={g} />
              ))}
            </>
          ) : null}

          <SectionHeader title="Par catégorie" />
          {STAT_CATEGORIES.map((cat) => {
            const stats = statsByCategory[cat.value];
            if (stats.length === 0) return null;
            const metricGroups = groupByMetric(stats);
            return (
              <Card key={cat.value}>
                <CategoryScoreRow label={cat.label} icon={cat.icon} score={computeCategoryScore(stats)} />
                {Object.entries(metricGroups).map(([metric, values]) => (
                  <View key={metric} style={styles.chartWrap}>
                    <StatLineChart title={metricLabel(cat.value, metric)} stats={values} unit={values[0]?.unit} />
                  </View>
                ))}
              </Card>
            );
          })}
        </>
      )}
    </ScreenContainer>
  );
}

function ProgressionSkeleton() {
  return (
    <ScreenContainer scroll={false}>
      <View style={styles.headerRow}>
        <Skeleton width={140} height={26} />
        <Skeleton width={90} height={32} borderRadius={16} />
      </View>
      <Skeleton width="100%" height={120} borderRadius={20} style={{ marginBottom: spacing.md }} />
      <SkeletonCard />
      <SkeletonCard />
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
  periodRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.md },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  chartWrap: { marginTop: spacing.md },
});
