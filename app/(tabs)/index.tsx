import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Settings, Flame, TrendingUp, Zap } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
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
import { spacing, typography } from "@/constants/theme";
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
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.greeting, { color: theme.text }]}>Salut {profile.username}</Text>
          {mainGoal ? (
            <Text style={{ color: theme.textMuted, marginTop: 2, fontSize: 14 }}>
              Objectif actuel : {objectiveLabel(mainGoal).toLowerCase()}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => router.push("/(tabs)/profile/settings")}
          style={[styles.settingsButton, { backgroundColor: theme.surfaceAlt }]}
          accessibilityRole="button"
          accessibilityLabel="Réglages"
        >
          <Settings size={18} color={theme.textMuted} />
        </Pressable>
      </View>

      <Card>
        <View style={styles.levelRow}>
          <Text style={{ color: theme.text, fontWeight: "800", fontSize: 16 }}>Niveau {level}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            {progressInLevel}/{xpForNext} XP
          </Text>
        </View>
        <ProgressBar percent={(progressInLevel / xpForNext) * 100} />

        <View style={styles.statsRow}>
          <StatBlock icon={<Flame size={16} color={theme.primary} />} label="Série" value={`${profile.streak_count}`} />
          <StatBlock
            icon={<TrendingUp size={16} color={theme.primary} />}
            label="Progression"
            value={`${monthlyTrend >= 0 ? "+" : ""}${monthlyTrend}%`}
          />
          <StatBlock icon={<Zap size={16} color={theme.primary} />} label="XP total" value={`${profile.xp}`} />
        </View>
      </Card>

      {todaySession ? (
        <Card>
          <Text style={{ color: theme.text, fontWeight: "700", marginBottom: spacing.sm }}>Séance en cours</Text>
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

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Catégories</Text>
      <View style={styles.categoryGrid}>
        {STAT_CATEGORIES.map((c) => (
          <Pressable
            key={c.value}
            onPress={() => router.push("/(tabs)/stats")}
            style={[styles.categoryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={styles.categoryIcon}>{c.icon}</Text>
            <Text style={{ color: theme.text, fontSize: 13, fontWeight: "600" }}>{c.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScreenContainer>
  );
}

function StatBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.statBlock}>
      <View style={styles.statValueRow}>
        {icon}
        <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      </View>
      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginTop: spacing.sm, marginBottom: spacing.lg },
  headerText: { flex: 1, paddingRight: spacing.md },
  greeting: { ...typography.displayTitle, fontSize: 28 },
  settingsButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  levelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.lg },
  statBlock: { alignItems: "center", flex: 1 },
  statValueRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statValue: { fontSize: 16, fontWeight: "800" },
  statLabel: { fontSize: 11, marginTop: spacing.xs },
  sectionTitle: { ...typography.sectionTitle, marginBottom: spacing.sm },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  categoryCard: {
    width: "31%",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  categoryIcon: { fontSize: 22 },
});
