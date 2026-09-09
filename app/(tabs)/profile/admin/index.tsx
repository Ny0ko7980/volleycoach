import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingView } from "@/components/ui/LoadingView";
import { ErrorView } from "@/components/ui/ErrorView";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useProfileStore } from "@/store/profileStore";
import { fetchExercises } from "@/services/exerciseService";
import { fetchGlobalStats, deleteExerciseAsAdmin, type GlobalStats } from "@/services/adminService";
import { objectiveLabel } from "@/constants/positions";
import { spacing } from "@/constants/theme";
import type { Exercise } from "@/types/database";

export default function AdminHomeScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { profile } = useProfileStore();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [globalStats, exerciseList] = await Promise.all([fetchGlobalStats(), fetchExercises()]);
      setStats(globalStats);
      setExercises(exerciseList);
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

  async function handleDelete(exercise: Exercise) {
    Alert.alert("Supprimer cet exercice ?", exercise.name, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteExerciseAsAdmin(exercise.id);
            load();
          } catch (e) {
            Alert.alert(
              "Impossible de supprimer",
              e instanceof Error
                ? e.message
                : "Cet exercice est probablement utilisé dans une séance existante."
            );
          }
        },
      },
    ]);
  }

  if (profile?.role !== "admin") {
    return <ErrorView message="Accès réservé aux administrateurs." />;
  }

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={load} />;

  return (
    <ScreenContainer onRefresh={load} refreshing={loading}>
      <Text style={[styles.title, { color: theme.text }]}>Administration</Text>

      {stats ? (
        <Card>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Statistiques globales</Text>
          <View style={styles.statsGrid}>
            <StatBlock label="Joueurs" value={stats.totalPlayers} />
            <StatBlock label="Exercices" value={stats.totalExercises} />
            <StatBlock label="Séances terminées" value={stats.totalCompletedSessions} />
            <StatBlock label="Objectifs atteints" value={stats.totalGoalsAchieved} />
          </View>
          <Button label="Gérer les utilisateurs" variant="outline" onPress={() => router.push("/(tabs)/profile/admin/users")} />
        </Card>
      ) : null}

      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Exercices ({exercises.length})</Text>
        <Button
          label="+ Nouveau"
          fullWidth={false}
          onPress={() => router.push("/(tabs)/profile/admin/exercise-form")}
        />
      </View>

      {exercises.map((ex) => (
        <Card key={ex.id}>
          <View style={styles.exerciseRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: "700" }}>{ex.name}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: spacing.xs }}>
                {objectiveLabel(ex.objective)} · {ex.level} · {ex.duration_minutes} min
              </Text>
            </View>
            <View style={styles.actions}>
              <Text
                onPress={() => router.push({ pathname: "/(tabs)/profile/admin/exercise-form", params: { id: ex.id } })}
                style={{ color: theme.primary, fontSize: 13, fontWeight: "700", marginRight: spacing.md }}
              >
                Modifier
              </Text>
              <Text onPress={() => handleDelete(ex)} style={{ color: theme.danger, fontSize: 13, fontWeight: "700" }}>
                Supprimer
              </Text>
            </View>
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
}

function StatBlock({ label, value }: { label: string; value: number }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.statBlock}>
      <Text style={{ color: theme.primary, fontWeight: "800", fontSize: 20 }}>{value}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", marginTop: spacing.sm, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: spacing.md },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  statBlock: { width: "48%", alignItems: "center", marginBottom: spacing.md },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md },
  exerciseRow: { flexDirection: "row", alignItems: "center" },
  actions: { flexDirection: "row" },
});
