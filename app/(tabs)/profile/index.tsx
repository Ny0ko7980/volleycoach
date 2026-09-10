import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LoadingView } from "@/components/ui/LoadingView";
import { ErrorView } from "@/components/ui/ErrorView";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useAuthStore } from "@/store/authStore";
import { useProfileStore } from "@/store/profileStore";
import { fetchMyProfile } from "@/services/profileService";
import { fetchPlayerAchievements, fetchAllAchievements, xpToNextLevel } from "@/services/gamificationService";
import { positionLabel, levelLabel, objectiveLabel } from "@/constants/positions";
import { spacing } from "@/constants/theme";
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [freshProfile, playerAchievements, achievements] = await Promise.all([
        fetchMyProfile(),
        fetchPlayerAchievements(),
        fetchAllAchievements(),
      ]);
      if (freshProfile) setProfile(freshProfile);
      setUnlocked(playerAchievements);
      setAllAchievements(achievements);
      if (!freshProfile) setError("Profil introuvable.");
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
  const unlockedIds = new Set(unlocked.map((u) => u.achievement_id));

  return (
    <ScreenContainer onRefresh={load} refreshing={loading}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: theme.primaryMuted }]}>
          <Text style={styles.avatarLabel}>{profile.username.slice(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={[styles.name, { color: theme.text }]}>{profile.username}</Text>
        <View style={styles.badgeRow}>
          <Badge label={positionLabel(profile.position)} tone="primary" />
          <Badge label={levelLabel(profile.level)} />
          {profile.club ? <Badge label={profile.club} tone="neutral" /> : null}
        </View>
      </View>

      <Card>
        <View style={styles.levelRow}>
          <Text style={{ color: theme.text, fontWeight: "700" }}>Niveau {level}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            {progressInLevel}/{xpForNext} XP
          </Text>
        </View>
        <ProgressBar percent={(progressInLevel / xpForNext) * 100} />
        <View style={styles.quickStats}>
          <QuickStat label="Série" value={`${profile.streak_count}🔥`} />
          <QuickStat label="Record série" value={`${profile.longest_streak}`} />
          <QuickStat label="XP total" value={`${profile.xp}`} />
        </View>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Objectifs</Text>
        <View style={styles.badgeRow}>
          {profile.goals.length === 0 ? (
            <Text style={{ color: theme.textMuted }}>Aucun objectif défini.</Text>
          ) : (
            profile.goals.map((g) => <Badge key={g} label={objectiveLabel(g)} tone="primary" />)
          )}
        </View>
        <View style={{ marginTop: spacing.md }}>
          <Button label="Gérer mes objectifs" variant="outline" onPress={() => router.push("/(tabs)/profile/goals")} />
        </View>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Badges ({unlocked.length}/{allAchievements.length})
        </Text>
        <View style={styles.achievementsGrid}>
          {allAchievements.map((a) => {
            const isUnlocked = unlockedIds.has(a.id);
            return (
              <View key={a.id} style={[styles.achievement, { opacity: isUnlocked ? 1 : 0.3 }]}>
                <Text style={styles.achievementIcon}>{a.icon}</Text>
                <Text style={{ color: theme.text, fontSize: 11, textAlign: "center" }} numberOfLines={2}>
                  {a.name}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Button label="Modifier mon profil" variant="outline" onPress={() => router.push("/(tabs)/profile/edit")} />
      <Button label="Mon équipe" variant="outline" onPress={() => router.push("/(tabs)/profile/team")} />
      {profile.role === "admin" ? (
        <Button label="⚙️ Administration" variant="outline" onPress={() => router.push("/(tabs)/profile/admin")} />
      ) : null}
      <Button label="Réglages & notifications" variant="ghost" onPress={() => router.push("/(tabs)/profile/settings")} />
      <Button label="Se déconnecter" variant="ghost" onPress={signOut} />
    </ScreenContainer>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.quickStatBlock}>
      <Text style={{ color: theme.primary, fontWeight: "800", fontSize: 16 }}>{value}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", marginTop: spacing.md, marginBottom: spacing.lg },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  avatarLabel: { fontSize: 24, fontWeight: "800", color: "#FF6A00" },
  name: { fontSize: 22, fontWeight: "800" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  levelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  quickStats: { flexDirection: "row", justifyContent: "space-around", marginTop: spacing.lg },
  quickStatBlock: { alignItems: "center" },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: spacing.sm },
  achievementsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  achievement: { width: 72, alignItems: "center" },
  achievementIcon: { fontSize: 28, marginBottom: spacing.xs },
});
