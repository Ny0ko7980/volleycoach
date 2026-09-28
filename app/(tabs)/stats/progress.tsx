import { useCallback, useMemo } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Target } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { CategoryScoreRow } from "@/components/charts/CategoryScoreRow";
import { GoalCard } from "@/components/goals/GoalCard";
import { LoadingView } from "@/components/ui/LoadingView";
import { ErrorView } from "@/components/ui/ErrorView";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppTheme } from "@/hooks/useAppTheme";
import { computeCategoryScore } from "@/services/statisticsService";
import { useGoals, useSessionHistory, useSkillScores, useStatistics } from "@/hooks/queries";
import { SkillScoreList } from "@/components/training/SkillScoreList";
import { STAT_CATEGORIES } from "@/constants/positions";
import { spacing, typography } from "@/constants/theme";
import type { StatCategory } from "@/types/database";
import { errorMessage } from "@/utils/errors";

export default function ProgressScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const statsQuery = useStatistics();
  const goalsQuery = useGoals("active");
  const historyQuery = useSessionHistory(200);
  const skillsQuery = useSkillScores();

  const goals = goalsQuery.data ?? [];
  const skillScores = skillsQuery.data ?? [];
  const isPending = statsQuery.isPending || goalsQuery.isPending || historyQuery.isPending || skillsQuery.isPending;
  const isError = statsQuery.isError || goalsQuery.isError || historyQuery.isError || skillsQuery.isError;
  const queryError = statsQuery.error ?? goalsQuery.error ?? historyQuery.error ?? skillsQuery.error;
  const isFetching =
    statsQuery.isFetching || goalsQuery.isFetching || historyQuery.isFetching || skillsQuery.isFetching;

  // Dérivé de la donnée, plus recopié dans un état : une valeur calculée qui
  // vit dans un `useState` finit toujours par être en retard sur sa source.
  const scores = useMemo(() => {
    const allStats = statsQuery.data ?? [];
    const grouped: Record<StatCategory, typeof allStats> = {
      service: [], reception: [], attaque: [], bloc: [], defense: [], physique: [],
    };
    // `?.` volontaire : une catégorie inconnue venue de la base ferait sinon
    // un « undefined.push » au rendu, donc un écran noir en production.
    for (const stat of allStats) grouped[stat.category]?.push(stat);
    const next = {} as Record<StatCategory, number>;
    for (const cat of STAT_CATEGORIES) next[cat.value] = computeCategoryScore(grouped[cat.value]);
    return next;
  }, [statsQuery.data]);

  const { sessionsThisWeek, sessionsThisMonth } = useMemo(() => {
    const now = Date.now();
    const completed = (historyQuery.data ?? []).filter((s) => s.status === "completed");
    const since = (days: number) => completed.filter((s) => new Date(s.created_at).getTime() >= now - days * 86_400_000).length;
    return { sessionsThisWeek: since(7), sessionsThisMonth: since(30) };
  }, [historyQuery.data]);

  // Les dépendances sont les fonctions `refetch`, pas les objets de requête :
  // ceux-ci sont recréés à chaque rendu, donc `load` changeait d'identité à
  // chaque rendu, `useFocusEffect` relançait son effet, qui relançait un
  // rendu — une boucle de rechargement sans fin tant que l'écran a le focus.
  const refetchStats = statsQuery.refetch;
  const refetchGoals = goalsQuery.refetch;
  const refetchHistory = historyQuery.refetch;
  const refetchSkills = skillsQuery.refetch;
  const load = useCallback(() => {
    void refetchStats();
    void refetchGoals();
    void refetchHistory();
    void refetchSkills();
  }, [refetchStats, refetchGoals, refetchHistory, refetchSkills]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (isPending) return <LoadingView />;
  if (isError) {
    return <ErrorView message={errorMessage(queryError, "Erreur de chargement.")} onRetry={load} />;
  }

  return (
    <ScreenContainer onRefresh={load} refreshing={isFetching}>
      <Text style={[styles.title, { color: theme.text }]}>Ma progression</Text>

      <Card>
        <View style={styles.evolutionRow}>
          <EvolutionBlock label="Cette semaine" value={`${sessionsThisWeek} séances`} />
          <EvolutionBlock label="Ce mois-ci" value={`${sessionsThisMonth} séances`} />
        </View>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Scores par compétence</Text>
        <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: spacing.md }}>
          Progression interne calculée à partir de tes séances et de tes ressentis — pas une mesure de niveau.
        </Text>
        <SkillScoreList scores={skillScores} />
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
          icon={<Target size={26} color={theme.textMuted} />}
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
  title: { ...typography.titleXL, marginTop: spacing.sm, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: spacing.xs },
  evolutionRow: { flexDirection: "row", justifyContent: "space-around" },
  evolutionBlock: { alignItems: "center" },
  evolutionValue: { fontSize: 20, fontWeight: "800" },
});
