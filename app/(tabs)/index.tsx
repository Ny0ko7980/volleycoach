import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { WorkoutCard } from "@/components/workouts/WorkoutCard";
import { LoadingView } from "@/components/ui/LoadingView";
import { ErrorView } from "@/components/ui/ErrorView";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useProfileStore } from "@/store/profileStore";
import { fetchMyProfile } from "@/services/profileService";
import { generateWorkout, fetchTodaySession, startWorkoutSession } from "@/services/workoutService";
import { fetchStatistics, computeCategoryScore } from "@/services/statisticsService";
import { xpToNextLevel } from "@/services/gamificationService";
import { objectiveLabel } from "@/constants/positions";
import { spacing } from "@/constants/theme";
import type { StatCategory, Workout, WorkoutExercise, WorkoutSession } from "@/types/database";
import { STAT_CATEGORIES } from "@/constants/positions";

export default function DashboardScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { profile, setProfile } = useProfileStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todaySession, setTodaySession] = useState<WorkoutSession | null>(null);
  const [todayWorkout, setTodayWorkout] = useState<(Workout & { exercises: WorkoutExercise[] }) | null>(null);
  const [starting, setStarting] = useState(false);
  const [monthlyTrend, setMonthlyTrend] = useState<number>(0);

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
      setMonthlyTrend(scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) - 50 : 0);
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

  if (loading) return <LoadingView label="Préparation de ton tableau de bord..." />;
  if (error) return <ErrorView message={error} onRetry={load} />;
  if (!profile) return <ErrorView message="Profil introuvable." onRetry={load} />;

  const { level, progressInLevel, xpForNext } = xpToNextLevel(profile.xp);
  const mainGoal = profile.goals[0];

  return (
    <ScreenContainer onRefresh={load} refreshing={loading}>
      <Text style={[styles.greeting, { color: theme.text }]}>Salut {profile.username} 👋</Text>
      {mainGoal ? (
        <Text style={{ color: theme.textMuted, marginBottom: spacing.lg }}>
          Objectif actuel : {objectiveLabel(mainGoal).toLowerCase()}
        </Text>
      ) : null}

      <Card>
        <View style={styles.levelRow}>
          <Badge label={`Niveau ${level}`} tone="primary" />
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            {progressInLevel}/{xpForNext} XP
          </Text>
        </View>
        <ProgressBar percent={(progressInLevel / xpForNext) * 100} />

        <View style={styles.statsRow}>
          <StatBlock label="Série" value={`${profile.streak_count} 🔥`} />
          <StatBlock label="Progression" value={`${monthlyTrend >= 0 ? "+" : ""}${monthlyTrend}%`} />
          <StatBlock label="XP total" value={`${profile.xp}`} />
        </View>
      </Card>

      {todaySession ? (
        <Card>
          <Text style={{ color: theme.text, fontWeight: "700", marginBottom: spacing.sm }}>
            Séance en cours 🏐
          </Text>
          <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
            Tu as une séance {todaySession.status === "in_progress" ? "en cours" : "planifiée"} aujourd'hui.
          </Text>
          <Text
            onPress={() => router.push(`/(tabs)/training/session/${todaySession.id}`)}
            style={{ color: theme.primary, fontWeight: "700" }}
          >
            Reprendre la séance →
          </Text>
        </Card>
      ) : todayWorkout ? (
        <WorkoutCard
          workout={todayWorkout}
          exerciseCount={todayWorkout.exercises.length}
          onStart={handleStart}
          starting={starting}
        />
      ) : null}

      <Card>
        <Text style={{ color: theme.text, fontWeight: "700", marginBottom: spacing.md }}>Aperçu des catégories</Text>
        {STAT_CATEGORIES.slice(0, 3).map((c) => (
          <Text key={c.value} style={{ color: theme.textMuted, marginBottom: spacing.xs }}>
            {c.icon} {c.label}
          </Text>
        ))}
        <Text onPress={() => router.push("/(tabs)/stats")} style={{ color: theme.primary, fontWeight: "700", marginTop: spacing.xs }}>
          Voir toutes les statistiques →
        </Text>
      </Card>
    </ScreenContainer>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, { color: theme.primary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: { fontSize: 26, fontWeight: "800", marginTop: spacing.sm },
  levelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.lg },
  statBlock: { alignItems: "center", flex: 1 },
  statValue: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 11, marginTop: spacing.xs },
});
