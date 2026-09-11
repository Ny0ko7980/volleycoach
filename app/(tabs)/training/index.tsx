import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { CircleCheck, Clock3, CalendarClock } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { LoadingView } from "@/components/ui/LoadingView";
import { ErrorView } from "@/components/ui/ErrorView";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useProfileStore } from "@/store/profileStore";
import { fetchTodaySession, fetchSessionHistory } from "@/services/workoutService";
import { spacing, typography } from "@/constants/theme";
import type { WorkoutSession } from "@/types/database";

export default function TrainingHomeScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { profile } = useProfileStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [recent, setRecent] = useState<WorkoutSession[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [today, history] = await Promise.all([fetchTodaySession(), fetchSessionHistory(5)]);
      setSession(today);
      setRecent(history);
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
      <Text style={[styles.title, { color: theme.text }]}>Entraînement</Text>

      <Card>
        <Text style={{ color: theme.text, fontWeight: "700", marginBottom: spacing.sm }}>
          {session ? "Reprendre ma séance" : "Générer une séance personnalisée"}
        </Text>
        <Text style={{ color: theme.textMuted, marginBottom: spacing.md }}>
          {session
            ? "Une séance est déjà en cours ou planifiée aujourd'hui."
            : "Choisis un objectif et une durée, on s'occupe du reste."}
        </Text>
        <Button
          label={session ? "Continuer la séance" : "Créer une séance"}
          onPress={() =>
            session ? router.push(`/(tabs)/training/session/${session.id}`) : router.push("/(tabs)/training/generate")
          }
        />
      </Card>

      <SectionHeader title="Bibliothèque d'exercices" action="Voir tout" onAction={() => router.push("/(tabs)/training/exercises")} />
      <Card>
        <Text style={{ color: theme.textMuted }}>
          Filtre par poste{profile ? ` (${profile.position})` : ""}, niveau, objectif, durée et matériel.
        </Text>
        <View style={{ marginTop: spacing.md }}>
          <Button label="Parcourir les exercices" variant="outline" onPress={() => router.push("/(tabs)/training/exercises")} />
        </View>
      </Card>

      <SectionHeader title="Journal d'entraînement" action="Historique complet" onAction={() => router.push("/(tabs)/training/history")} />
      {recent.length === 0 ? (
        <Card>
          <Text style={{ color: theme.textMuted }}>Aucune séance enregistrée pour le moment.</Text>
        </Card>
      ) : (
        recent.map((s) => (
          <Card key={s.id}>
            <View style={styles.historyRow}>
              <Text style={{ color: theme.text, fontWeight: "600", flex: 1 }} numberOfLines={1}>
                {s.workout?.title ?? "Séance"}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                {new Date(s.created_at).toLocaleDateString("fr-FR")}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <SessionStatusIcon status={s.status} color={theme.textMuted} />
              <Text style={{ color: theme.textMuted, fontSize: 12, marginLeft: spacing.xs }}>
                {s.status === "completed" ? "Terminée" : s.status === "in_progress" ? "En cours" : "Planifiée"}
              </Text>
            </View>
          </Card>
        ))
      )}
    </ScreenContainer>
  );
}

function SessionStatusIcon({ status, color }: { status: string; color: string }) {
  if (status === "completed") return <CircleCheck size={14} color={color} />;
  if (status === "in_progress") return <Clock3 size={14} color={color} />;
  return <CalendarClock size={14} color={color} />;
}

const styles = StyleSheet.create({
  title: { ...typography.displayTitle, fontSize: 28, marginTop: spacing.sm, marginBottom: spacing.lg },
  historyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.xs },
});
