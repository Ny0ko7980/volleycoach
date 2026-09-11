import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Flame, Lock, Calendar, Clock, Trophy, Target, Settings, LogOut, Users, ShieldCheck, Pencil } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { StatCard } from "@/components/ui/StatCard";
import { LoadingView } from "@/components/ui/LoadingView";
import { ErrorView } from "@/components/ui/ErrorView";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useAuthStore } from "@/store/authStore";
import { useProfileStore } from "@/store/profileStore";
import { fetchMyProfile } from "@/services/profileService";
import { fetchPlayerAchievements, fetchAllAchievements, xpToNextLevel } from "@/services/gamificationService";
import { fetchSessionHistory } from "@/services/workoutService";
import { fetchStatistics, computePersonalBest } from "@/services/statisticsService";
import { positionLabel, levelLabel, objectiveLabel, STAT_METRICS } from "@/constants/positions";
import { spacing, typography } from "@/constants/theme";
import { formatDurationMinutes } from "@/utils/duration";
import type { Achievement, PlayerAchievement } from "@/types/database";

export default function ProfileScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { signOut } = useAuthStore();
  const { profile, setProfile } = useProfileStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<PlayerAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [record, setRecord] = useState<{ label: string; value: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [freshProfile, playerAchievements, achievements, sessions, allStats] = await Promise.all([
        fetchMyProfile(),
        fetchPlayerAchievements(),
        fetchAllAchievements(),
        fetchSessionHistory(500),
        fetchStatistics(),
      ]);
      if (freshProfile) setProfile(freshProfile);
      setUnlocked(playerAchievements);
      setAllAchievements(achievements);
      if (!freshProfile) setError("Profil introuvable.");

      const completed = sessions.filter((s) => s.status === "completed");
      setTotalSessions(completed.length);
      setTotalMinutes(completed.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0));

      let best: { label: string; value: number; display: string } | null = null;
      for (const category of ["service", "reception", "attaque", "bloc", "defense", "physique"] as const) {
        const pb = computePersonalBest(allStats.filter((s) => s.category === category));
        if (!pb) continue;
        if (!best || pb.value > best.value) {
          const metricLabel = STAT_METRICS[category].find((m) => m.key === pb.metric)?.label ?? pb.metric;
          best = { label: metricLabel, value: pb.value, display: `${pb.value}${pb.unit ?? ""}` };
        }
      }
      setRecord(best ? { label: best.label, value: best.display } : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement du profil.");
    } finally {
      setLoading(false);
    }
  }, [setProfile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <LoadingView />;
  if (error || !profile) return <ErrorView message={error ?? "Profil introuvable."} onRetry={load} />;

  const { level, progressInLevel, xpForNext } = xpToNextLevel(profile.xp);
  const levelPercent = (progressInLevel / xpForNext) * 100;
  const unlockedByAchievementId = new Map(unlocked.map((u) => [u.achievement_id, u]));
  const mainObjective = profile.goals[0];

  return (
    <ScreenContainer onRefresh={load} refreshing={loading}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: theme.primaryMuted }]}>
          <Text style={[styles.avatarLabel, { color: theme.primary }]}>{profile.username.slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={[typography.titleL, { color: theme.text }]}>{profile.username}</Text>
        <View style={styles.badgeRow}>
          <Badge label={positionLabel(profile.position)} tone="primary" />
          <Badge label={levelLabel(profile.level)} />
          {profile.height_cm ? <Badge label={`${profile.height_cm} cm`} tone="neutral" /> : null}
          {profile.club ? <Badge label={profile.club} tone="neutral" /> : null}
        </View>
      </View>

      <Card style={styles.levelCard}>
        <ProgressRing percent={levelPercent} size={68} strokeWidth={7} valueLabel={`${level}`} label="niveau" />
        <View style={styles.levelInfo}>
          <Text style={[typography.bodyStrong, { color: theme.text }]}>Niveau {level}</Text>
          <Text style={[typography.caption, { color: theme.textMuted, marginTop: 2 }]}>
            {progressInLevel} / {xpForNext} XP avant le niveau suivant
          </Text>
        </View>
      </Card>

      <View style={styles.statGrid}>
        <StatCard icon={<Target size={16} color={theme.primary} />} label="Objectif principal" value={mainObjective ? objectiveLabel(mainObjective).replace("Améliorer ", "") : "—"} />
        <StatCard icon={<Calendar size={16} color={theme.primary} />} label="Séances" value={`${totalSessions}`} />
        <StatCard icon={<Clock size={16} color={theme.primary} />} label="Temps d'entraînement" value={formatDurationMinutes(totalMinutes)} />
        <StatCard icon={<Flame size={16} color={theme.primary} />} label="Série" value={`${profile.streak_count} j`} />
      </View>

      {record ? (
        <Card style={styles.recordRow}>
          <Trophy size={18} color={theme.primary} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={[typography.bodyStrong, { color: theme.text }]}>{record.value}</Text>
            <Text style={[typography.caption, { color: theme.textMuted }]}>Record personnel · {record.label}</Text>
          </View>
        </Card>
      ) : null}

      <Card>
        <Text style={[typography.bodySecondaryStrong, { color: theme.text, marginBottom: spacing.sm }]}>Objectifs</Text>
        <View style={styles.chipRow}>
          {profile.goals.length === 0 ? (
            <Text style={{ color: theme.textMuted }}>Aucun objectif défini.</Text>
          ) : (
            profile.goals.map((g) => <Chip key={g} label={objectiveLabel(g)} selected />)
          )}
        </View>
        <View style={{ marginTop: spacing.md }}>
          <Button label="Gérer mes objectifs" variant="outline" onPress={() => router.push("/(tabs)/profile/goals")} />
        </View>
      </Card>

      <Card>
        <Text style={[typography.bodySecondaryStrong, { color: theme.text, marginBottom: spacing.sm }]}>
          Badges ({unlocked.length}/{allAchievements.length})
        </Text>
        <View style={styles.achievementsGrid}>
          {allAchievements.map((a) => {
            const unlockedEntry = unlockedByAchievementId.get(a.id);
            const isUnlocked = Boolean(unlockedEntry);
            return (
              <View key={a.id} style={styles.achievement}>
                <View
                  style={[
                    styles.achievementIconWrap,
                    { backgroundColor: theme.surfaceAlt, opacity: isUnlocked ? 1 : 0.35 },
                  ]}
                >
                  <Text style={[styles.achievementIcon, !isUnlocked && styles.achievementIconLocked]}>{a.icon}</Text>
                  {!isUnlocked ? (
                    <View style={[styles.lockBadge, { backgroundColor: theme.background }]}>
                      <Lock size={10} color={theme.textMuted} />
                    </View>
                  ) : null}
                </View>
                <Text
                  style={{ color: isUnlocked ? theme.text : theme.textMuted, fontSize: 11, textAlign: "center" }}
                  numberOfLines={2}
                >
                  {a.name}
                </Text>
                {isUnlocked && unlockedEntry ? (
                  <Text style={{ color: theme.textMuted, fontSize: 10, marginTop: 2 }}>
                    {new Date(unlockedEntry.unlocked_at).toLocaleDateString("fr-FR")}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </Card>

      <Button label="Modifier mon profil" variant="outline" icon={<Pencil size={16} color={theme.primary} />} onPress={() => router.push("/(tabs)/profile/edit")} />
      <Button label="Mon équipe" variant="outline" icon={<Users size={16} color={theme.primary} />} onPress={() => router.push("/(tabs)/profile/team")} />
      {profile.role === "admin" ? (
        <Button label="Administration" variant="outline" icon={<ShieldCheck size={16} color={theme.primary} />} onPress={() => router.push("/(tabs)/profile/admin")} />
      ) : null}

      <Text style={[typography.eyebrow, { color: theme.textFaint, marginTop: spacing.xl, marginBottom: spacing.xs }]}>PARAMÈTRES</Text>
      <Button label="Réglages & notifications" variant="ghost" icon={<Settings size={16} color={theme.textMuted} />} onPress={() => router.push("/(tabs)/profile/settings")} />
      <Button label="Se déconnecter" variant="ghost" icon={<LogOut size={16} color={theme.textMuted} />} onPress={signOut} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", marginTop: spacing.md, marginBottom: spacing.lg },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  avatarLabel: { fontSize: 26, fontWeight: "800" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm, justifyContent: "center" },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  levelCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  levelInfo: { flex: 1 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  recordRow: { flexDirection: "row", alignItems: "center" },
  achievementsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  achievement: { width: 76, alignItems: "center" },
  achievementIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  achievementIcon: { fontSize: 26 },
  achievementIconLocked: { opacity: 0.6 },
  lockBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
