import { useCallback, useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { CategoryScoreRow } from "@/components/charts/CategoryScoreRow";
import { GoalCard } from "@/components/goals/GoalCard";
import { LoadingView } from "@/components/ui/LoadingView";
import { ErrorView } from "@/components/ui/ErrorView";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppTheme } from "@/hooks/useAppTheme";
import { fetchStatistics, computeCategoryScore } from "@/services/statisticsService";
import { fetchGoals } from "@/services/goalsService";
import { fetchSessionHistory } from "@/services/workoutService";
import { STAT_CATEGORIES } from "@/constants/positions";
import { spacing } from "@/constants/theme";
import type { Goal, StatCategory, WorkoutSession } from "@/types/database";

export default function ProgressScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [scores, setScores] = useState<Record<StatCategory, number>>({
    service: 0,
    reception: 0,
    attaque: 0,
    bloc: 0,
    defense: 0,
    physique: 0,
  });
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sessionsThisWeek, setSessionsThisWeek] = useState(0);
  const [sessionsThisMonth, setSessionsThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allStats, activeGoals, sessions] = await Promise.all([
        fetchStatistics(),
        fetchGoals("active"),
        fetchSessionHistory(200),
      ]);

      const grouped: Record<StatCategory, typeof allStats> = { service: [], reception: [], attaque: [], bloc: [], defense: [], physique: [] };
      for (const s of allStats) grouped[s.category].push(s);
      const nextScores = {} as Record<StatCategory, number>;
      for (const cat of STAT_CATEGORIES) nextScores[cat.value] = computeCategoryScore(grouped[cat.value]);
      setScores(nextScores);
      setGoals(activeGoals);

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
      const monthAgo = new Date(now.getTime() - 30 * 86_400_000);
      const completed = sessions.filter((s: WorkoutSession) => s.status === "completed");
      setSessionsThisWeek(completed.filter((s) => new Date(s.created_at) >= weekAgo).length);
      setSessionsThisMonth(completed.filter((s) => new Date(s.created_at) >= monthAgo).length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
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

  return (
    <ScreenContainer onRefresh={load} refreshing={loading}>
      <Text style={[styles.title, { color: theme.text }]}>Ma progression</Text>

      <Card>
        <View style={styles.evolutionRow}>
          <EvolutionBlock label="Cette semaine" value={`${sessionsThisWeek} séances`} />
          <EvolutionBlock label="Ce mois-ci" value={`${sessionsThisMonth} séances`} />
        </View>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Scores par catégorie</Text>
        <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: spacing.md }}>
          Indicateurs internes de progression basés sur ton suivi — pas une mesure scientifique.
        </Text>
        {STAT_CATEGORIES.map((cat) => (
          <CategoryScoreRow key={cat.value} label={cat.label} icon={cat.icon} score={scores[cat.value]} />
        ))}
      </Card>

      <Text style={[styles.sectionTitle, { color: theme.text, marginTop: spacing.md }]}>Objectifs en cours</Text>
      {goals.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="Aucun objectif actif"
          description="Crée un objectif pour suivre ta progression précisément."
          actionLabel="Créer un objectif"
          onAction={() => router.push("/(tabs)/profile/goals")}
        />
      ) : (
        goals.map((g) => <GoalCard key={g.id} goal={g} />)
      )}
    </ScreenContainer>
  );
}

function EvolutionBlock({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.evolutionBlock}>
      <Text style={[styles.evolutionValue, { color: theme.primary }]}>{value}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800", marginTop: spacing.sm, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: spacing.xs },
  evolutionRow: { flexDirection: "row", justifyContent: "space-around" },
  evolutionBlock: { alignItems: "center" },
  evolutionValue: { fontSize: 20, fontWeight: "800" },
});
