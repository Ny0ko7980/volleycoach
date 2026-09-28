import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Settings, Flame, TrendingUp, Calendar, Target } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { StatCard } from "@/components/ui/StatCard";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Button } from "@/components/ui/Button";
import { WorkoutCard } from "@/components/workouts/WorkoutCard";
import { ErrorView } from "@/components/ui/ErrorView";
import { SkeletonCard, Skeleton } from "@/components/ui/Skeleton";
import { useAppTheme } from "@/hooks/useAppTheme";
import {
  invalidateStartedSession,
  useGenerateTodayWorkout,
  useGoals,
  useSessionHistory,
  useStatistics,
  useSyncedProfile,
  useTodaySession,
  useTodayWorkoutProposal,
} from "@/hooks/queries";
import { startWorkoutSession } from "@/services/workoutService";
import { computeCategoryScore } from "@/services/statisticsService";
import { goalProgressPercent } from "@/services/goalsService";
import { positionLabel, levelLabel } from "@/constants/positions";
import { spacing, typography } from "@/constants/theme";
import { formatDurationMinutes, greetingForHour, weeklySessionTarget } from "@/utils/duration";
import type { StatCategory } from "@/types/database";
import { errorMessage } from "@/utils/errors";

export default function DashboardScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();

  // Lectures : rien ici n'écrit en base. C'est la différence avec l'ancien
  // `load()`, qui créait la séance du jour au passage — donc à chaque retour
  // sur l'onglet tant que la condition de garde n'était pas exactement juste.
  const profileQuery = useSyncedProfile();
  const sessionQuery = useTodaySession();
  const statsQuery = useStatistics();
  const historyQuery = useSessionHistory(40);
  const goalsQuery = useGoals("active");

  const profile = profileQuery.data ?? null;
  const todaySession = sessionQuery.data ?? null;

  // La proposition du jour n'est lue que s'il n'y a pas déjà de séance : c'est
  // la même condition qu'avant, mais elle décide maintenant d'une lecture et
  // non d'une écriture.
  const proposalQuery = useTodayWorkoutProposal(Boolean(profile) && sessionQuery.isSuccess && todaySession === null);
  const todayWorkout = proposalQuery.data ?? null;

  // Écriture, isolée et explicite.
  const generateWorkoutMutation = useGenerateTodayWorkout();
  const generate = generateWorkoutMutation.mutate;
  const generating = generateWorkoutMutation.isPending;

  const [starting, setStarting] = useState(false);

  const weeklyTrend = useMemo(() => {
    const allStats = statsQuery.data ?? [];
    const grouped: Record<StatCategory, typeof allStats> = { service: [], reception: [], attaque: [], bloc: [], defense: [], physique: [] };
    for (const s of allStats) grouped[s.category].push(s);
    const scores = Object.values(grouped).map(computeCategoryScore).filter((s) => s > 0);
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) - 50 : 0;
  }, [statsQuery.data]);

  const { sessionsThisWeek, minutesThisWeek } = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86_400_000;
    const completedThisWeek = (historyQuery.data ?? []).filter(
      (s) => s.status === "completed" && new Date(s.created_at).getTime() >= weekAgo
    );
    return {
      sessionsThisWeek: completedThisWeek.length,
      minutesThisWeek: completedThisWeek.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0),
    };
  }, [historyQuery.data]);

  const mainGoal = goalsQuery.data?.[0] ?? null;

  /**
   * Produit la séance du jour quand il n'y en a aucune.
   *
   * Le comportement visible ne change pas — le joueur trouve toujours une
   * séance prête en arrivant — mais l'écriture est désormais déclenchée une
   * seule fois, après que la lecture a répondu « rien aujourd'hui », au lieu
   * d'être imbriquée dans le chargement de l'écran.
   *
   * Le verrou retient *quelle lecture* a conclu qu'il n'y avait rien, par
   * l'horodatage de cette lecture. C'est ce qui permet de distinguer deux
   * situations qu'un simple booléen confondrait :
   *
   *   - le même « rien » relu plusieurs fois (retour sur l'onglet, double
   *     appel d'effet en développement) : une seule séance est créée ;
   *   - un nouveau « rien », après une séance terminée le matin ou au passage
   *     à un jour suivant : une nouvelle séance est proposée, comme avant.
   *
   * Une référence et non un état : ce verrou ne doit pas provoquer de rendu.
   */
  const proposalReadAt = proposalQuery.dataUpdatedAt;
  const generatedForRead = useRef<number | null>(null);
  const needsGeneration =
    profile !== null && todaySession === null && proposalQuery.isSuccess && proposalQuery.data === null;

  const generateToday = useCallback(
    (forRead: number | null) => {
      if (!profile) return;
      generatedForRead.current = forRead;
      generate({
        objective: profile.goals[0] ?? "global",
        durationMinutes: 30,
        level: profile.level,
        position: profile.position,
      });
    },
    [profile, generate]
  );

  useEffect(() => {
    if (!needsGeneration) return;
    if (generatedForRead.current === proposalReadAt) return;
    generateToday(proposalReadAt);
  }, [needsGeneration, proposalReadAt, generateToday]);

  const refetchProposal = proposalQuery.refetch;
  const proposalFailed = proposalQuery.isError;

  /**
   * Réessaie la séance du jour.
   *
   * Si c'est la *lecture* qui a échoué, on relit d'abord : générer sans savoir
   * ce qui existe déjà créerait un doublon. La génération repartira toute
   * seule si la relecture confirme qu'il n'y a rien.
   */
  function retryWorkoutCard() {
    if (proposalFailed) {
      generatedForRead.current = null;
      void refetchProposal();
      return;
    }
    generateToday(proposalReadAt);
  }

  // Dépendre des `refetch`, stables, et non des objets de requête, qui sont
  // recréés à chaque rendu : c'est ce qui évite la boucle de rechargement.
  const refetchProfile = profileQuery.refetch;
  const refetchSession = sessionQuery.refetch;
  const refetchStats = statsQuery.refetch;
  const refetchHistory = historyQuery.refetch;
  const refetchGoals = goalsQuery.refetch;
  const reload = useCallback(() => {
    void refetchProfile();
    void refetchSession();
    void refetchStats();
    void refetchHistory();
    void refetchGoals();
  }, [refetchProfile, refetchSession, refetchStats, refetchHistory, refetchGoals]);

  // Même convention que les autres onglets : on relit au retour sur l'écran,
  // en ne dépendant que des `refetch`. Ce qui a disparu, ce n'est pas le
  // rafraîchissement, c'est l'écriture en base qui y était mêlée.
  useFocusEffect(reload);

  async function handleStart() {
    if (!todayWorkout) return;
    setStarting(true);
    try {
      const session = await startWorkoutSession(todayWorkout.id);
      invalidateStartedSession();
      router.push(`/(tabs)/training/session/${session.id}`);
    } catch (e) {
      // Sans ce catch, l'échec se traduisait par un bouton qui arrête
      // simplement de tourner : rien ne se passait, sans explication.
      Alert.alert("Séance non démarrée", errorMessage(e, "La séance n'a pas pu démarrer. Vérifie ta connexion et réessaie."));
    } finally {
      setStarting(false);
    }
  }

  const loading =
    profileQuery.isPending || sessionQuery.isPending || statsQuery.isPending || historyQuery.isPending || goalsQuery.isPending;
  const refreshing =
    profileQuery.isFetching || sessionQuery.isFetching || statsQuery.isFetching || historyQuery.isFetching || goalsQuery.isFetching;
  // La proposition du jour est volontairement absente de cette liste : son
  // échec ne doit plus effacer tout le tableau de bord, il s'affiche dans la
  // carte concernée.
  const failure = profileQuery.error ?? sessionQuery.error ?? statsQuery.error ?? historyQuery.error ?? goalsQuery.error;
  const error = failure ? errorMessage(failure, "Impossible de charger le tableau de bord.") : null;

  const workoutCardFailed = proposalQuery.isError || generateWorkoutMutation.isError;
  // `needsGeneration` compte comme « en cours » : sans cela, l'écran
  // afficherait un vide d'une image entre la lecture qui répond « rien » et le
  // départ de la génération.
  const workoutCardBusy = proposalQuery.isLoading || generating || needsGeneration;

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!profile) return <ErrorView message="Profil introuvable." onRetry={reload} />;

  const target = weeklySessionTarget(profile.training_frequency);
  const goalPercent = mainGoal ? goalProgressPercent(mainGoal) : 0;

  return (
    <ScreenContainer onRefresh={reload} refreshing={refreshing}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.avatar, { backgroundColor: theme.primaryMuted }]}>
            <Text style={[styles.avatarLabel, { color: theme.primary }]}>{profile.username.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={[typography.titleXL, { color: theme.text }]}>
              {greetingForHour()} {profile.username}
            </Text>
            <Text style={[typography.bodySecondary, { color: theme.textMuted }]}>
              {positionLabel(profile.position)} • {levelLabel(profile.level)}
            </Text>
          </View>
        </View>
        <IconButton
          icon={<Settings size={18} color={theme.textMuted} />}
          onPress={() => router.push("/(tabs)/profile/settings")}
          accessibilityLabel="Réglages"
        />
      </View>

      {todaySession ? (
        <Card>
          <Text style={[typography.bodyStrong, { color: theme.text, marginBottom: spacing.xs }]}>Séance en cours</Text>
          <Text style={[typography.bodySecondary, { color: theme.textMuted, marginBottom: spacing.md }]}>
            Tu as une séance {todaySession.status === "in_progress" ? "en cours" : "planifiée"} aujourd'hui.
          </Text>
          <Button
            label="Reprendre la séance"
            variant="secondary"
            onPress={() => router.push(`/(tabs)/training/session/${todaySession.id}`)}
          />
        </Card>
      ) : todayWorkout ? (
        <WorkoutCard
          workout={todayWorkout}
          exerciseCount={todayWorkout.exercises.length}
          onStart={handleStart}
          starting={starting}
        />
      ) : workoutCardBusy ? (
        <Skeleton width="100%" height={150} borderRadius={20} style={{ marginBottom: spacing.md }} />
      ) : workoutCardFailed ? (
        <Card>
          <Text style={[typography.bodyStrong, { color: theme.text, marginBottom: spacing.xs }]}>Séance du jour indisponible</Text>
          <Text style={[typography.bodySecondary, { color: theme.textMuted, marginBottom: spacing.md }]}>
            {errorMessage(
              proposalQuery.error ?? generateWorkoutMutation.error,
              "Ta séance du jour n'a pas pu être préparée."
            )}
          </Text>
          <Button label="Réessayer" variant="secondary" onPress={retryWorkoutCard} />
        </Card>
      ) : null}

      <Text style={[typography.titleL, styles.sectionTitle, { color: theme.text }]}>Cette semaine</Text>
      <View style={styles.statGrid}>
        <StatCard
          icon={<Calendar size={16} color={theme.primary} />}
          label="Entraînements"
          value={`${sessionsThisWeek} / ${target}`}
        />
        <StatCard
          icon={<Flame size={16} color={theme.primary} />}
          label="Jours de suite"
          value={`${profile.streak_count} j`}
        />
        <StatCard
          icon={<TrendingUp size={16} color={theme.primary} />}
          label="Temps d'entraînement"
          value={formatDurationMinutes(minutesThisWeek)}
        />
        <StatCard
          icon={<TrendingUp size={16} color={theme.primary} />}
          label="Progression"
          value={`${weeklyTrend >= 0 ? "+" : ""}${weeklyTrend}%`}
          trend={weeklyTrend}
        />
      </View>

      <Text style={[typography.titleL, styles.sectionTitle, { color: theme.text }]}>Objectif</Text>
      {mainGoal ? (
        <Card style={styles.goalCard}>
          <View style={styles.goalTextBlock}>
            <Text style={[typography.eyebrow, { color: theme.primary, marginBottom: spacing.xs }]}>OBJECTIF ACTUEL</Text>
            <Text style={[typography.titleM, { color: theme.text }]}>{mainGoal.name}</Text>
            <Text style={[typography.bodySecondary, { color: theme.textMuted, marginTop: 2 }]}>
              {mainGoal.current_value}
              {mainGoal.unit ?? ""} → {mainGoal.target_value}
              {mainGoal.unit ?? ""}
            </Text>
          </View>
          <ProgressRing percent={goalPercent} size={72} strokeWidth={8} valueLabel={`${goalPercent}%`} />
        </Card>
      ) : (
        <Card style={styles.emptyGoalCard}>
          <View style={[styles.emptyGoalIcon, { backgroundColor: theme.surfaceAlt }]}>
            <Target size={18} color={theme.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyStrong, { color: theme.text }]}>Aucun objectif actif</Text>
            <Text style={[typography.caption, { color: theme.textMuted, marginTop: 2 }]}>
              Définis un objectif pour suivre ta progression.
            </Text>
          </View>
          <Button
            label="Définir"
            variant="secondary"
            size="compact"
            fullWidth={false}
            onPress={() => router.push("/(tabs)/profile/goals")}
          />
        </Card>
      )}
    </ScreenContainer>
  );
}

function DashboardSkeleton() {
  return (
    <ScreenContainer scroll={false}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Skeleton width={48} height={48} borderRadius={24} />
          <View style={{ gap: spacing.xs }}>
            <Skeleton width={140} height={20} />
            <Skeleton width={100} height={14} />
          </View>
        </View>
        <Skeleton width={38} height={38} borderRadius={19} />
      </View>
      <Skeleton width="100%" height={150} borderRadius={20} style={{ marginBottom: spacing.md }} />
      <SkeletonCard />
      <SkeletonCard />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm, marginBottom: spacing.lg },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1, paddingRight: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarLabel: { fontSize: 16, fontWeight: "800" },
  sectionTitle: { marginBottom: spacing.sm },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  goalCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  goalTextBlock: { flex: 1 },
  emptyGoalCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  emptyGoalIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
