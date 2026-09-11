import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
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
import { useProfileStore } from "@/store/profileStore";
import { fetchMyProfile } from "@/services/profileService";
import { generateWorkout, fetchTodaySession, startWorkoutSession, fetchSessionHistory } from "@/services/workoutService";
import { fetchStatistics, computeCategoryScore } from "@/services/statisticsService";
import { fetchGoals, goalProgressPercent } from "@/services/goalsService";
import { positionLabel, levelLabel } from "@/constants/positions";
import { spacing, typography } from "@/constants/theme";
import { formatDurationMinutes, greetingForHour, weeklySessionTarget } from "@/utils/duration";
import type { Goal, StatCategory, Workout, WorkoutExercise, WorkoutSession } from "@/types/database";

export default function DashboardScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { profile, setProfile } = useProfileStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todaySession, setTodaySession] = useState<WorkoutSession | null>(null);
  const [todayWorkout, setTodayWorkout] = useState<(Workout & { exercises: WorkoutExercise[] }) | null>(null);
  const [starting, setStarting] = useState(false);
  const [weeklyTrend, setWeeklyTrend] = useState<number>(0);
  const [sessionsThisWeek, setSessionsThisWeek] = useState(0);
  const [minutesThisWeek, setMinutesThisWeek] = useState(0);
  const [mainGoal, setMainGoal] = useState<Goal | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const freshProfile = await fetchMyProfile();
      if (freshProfile) setProfile(freshProfile);

      const session = await fetchTodaySession();
      setTodaySession(session);
      if (!session && freshProfile) {
        const objective = freshProfile.goals[0] ?? "global";
        const generated = await generateWorkout({
          objective,
          durationMinutes: 30,
          level: freshProfile.level,
          position: freshProfile.position,
        });
        setTodayWorkout(generated);
      }

      const allStats = await fetchStatistics();
      const grouped: Record<StatCategory, typeof allStats> = { service: [], reception: [], attaque: [], bloc: [], defense: [], physique: [] };
      for (const s of allStats) grouped[s.category].push(s);
      const scores = Object.values(grouped).map(computeCategoryScore).filter((s) => s > 0);
      setWeeklyTrend(scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) - 50 : 0);

      const [history, activeGoals] = await Promise.all([fetchSessionHistory(40), fetchGoals("active")]);
      const weekAgo = Date.now() - 7 * 86_400_000;
      const completedThisWeek = history.filter((s) => s.status === "completed" && new Date(s.created_at).getTime() >= weekAgo);
      setSessionsThisWeek(completedThisWeek.length);
      setMinutesThisWeek(completedThisWeek.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0));
      setMainGoal(activeGoals[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger le tableau de bord.");
    } finally {
      setLoading(false);
    }
  }, [setProfile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleStart() {
    if (!todayWorkout) return;
    setStarting(true);
    try {
      const session = await startWorkoutSession(todayWorkout.id);
      router.push(`/(tabs)/training/session/${session.id}`);
    } finally {
      setStarting(false);
    }
  }

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorView message={error} onRetry={load} />;
  if (!profile) return <ErrorView message="Profil introuvable." onRetry={load} />;

  const target = weeklySessionTarget(profile.training_frequency);
  const goalPercent = mainGoal ? goalProgressPercent(mainGoal) : 0;

  return (
    <ScreenContainer onRefresh={load} refreshing={loading}>
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
          label="Série actuelle"
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
