import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { CircleCheck, Clock3, CalendarClock, Dumbbell, ChevronRight, Play, Sparkles, SlidersHorizontal } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ChoiceTile } from "@/components/training/ChoiceTile";
import { LoadingView } from "@/components/ui/LoadingView";
import { ErrorView } from "@/components/ui/ErrorView";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useProfileStore } from "@/store/profileStore";
import { fetchTodaySession, fetchSessionHistory } from "@/services/workoutService";
import { spacing, typography, radius } from "@/constants/theme";
import type { WorkoutSession } from "@/types/database";
import { errorMessage } from "@/utils/errors";

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
      setError(errorMessage(e, "Erreur de chargement."));
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
      <Text style={[typography.titleXL, styles.title, { color: theme.text }]}>Entraînement</Text>

      {session ? (
        <Card>
          <View style={styles.heroRow}>
            <View style={[styles.heroIcon, { backgroundColor: theme.primaryMuted }]}>
              <Play size={18} color={theme.primary} fill={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyStrong, { color: theme.text }]}>Reprendre ma séance</Text>
              <Text style={[typography.bodySecondary, { color: theme.textMuted, marginTop: 2 }]}>
                Une séance est déjà en cours ou planifiée aujourd'hui.
              </Text>
            </View>
          </View>
          <View style={{ marginTop: spacing.md }}>
            <Button
              label="Continuer la séance"
              onPress={() => router.push(`/(tabs)/training/session/${session.id}`)}
            />
          </View>
        </Card>
      ) : null}

      <Text style={[typography.titleM, styles.question, { color: theme.text }]}>
        Que veux-tu faire aujourd'hui ?
      </Text>
      <ChoiceTile
        highlighted
        icon={<Sparkles size={20} color={theme.primary} />}
        title="Séance recommandée"
        description="VolleyCoach compose la séance à partir de ton profil et de tes derniers retours."
        onPress={() => router.push("/(tabs)/training/recommended")}
      />
      <ChoiceTile
        icon={<SlidersHorizontal size={20} color={theme.textMuted} />}
        title="Choisir mon entraînement"
        description="Tu décides de la compétence, de la durée, de l'intensité et du matériel."
        onPress={() => router.push("/(tabs)/training/generate")}
      />

      <Pressable
        onPress={() => router.push("/(tabs)/training/exercises")}
        style={({ pressed }) => [
          styles.libraryCard,
          { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <View style={[styles.libraryIcon, { backgroundColor: theme.surfaceAlt }]}>
          <Dumbbell size={18} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.bodyStrong, { color: theme.text }]}>Bibliothèque d'exercices</Text>
          <Text style={[typography.caption, { color: theme.textMuted, marginTop: 2 }]}>
            Recherche par catégorie{profile ? `, adaptée au poste ${profile.position}` : ""}
          </Text>
        </View>
        <ChevronRight size={18} color={theme.textMuted} />
      </Pressable>

      <SectionHeader title="Journal d'entraînement" action="Historique complet" onAction={() => router.push("/(tabs)/training/history")} />
      {recent.length === 0 ? (
        <Card>
          <Text style={{ color: theme.textMuted }}>Aucune séance enregistrée pour le moment.</Text>
        </Card>
      ) : (
        recent.map((s) => (
          <Card key={s.id}>
            <View style={styles.historyRow}>
              <Text style={[typography.bodyStrong, { color: theme.text, flex: 1 }]} numberOfLines={1}>
                {s.workout?.title ?? "Séance"}
              </Text>
              <Text style={[typography.caption, { color: theme.textMuted }]}>
                {new Date(s.created_at).toLocaleDateString("fr-FR")}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <SessionStatusIcon status={s.status} color={theme.textMuted} />
              <Text style={[typography.caption, { color: theme.textMuted, marginLeft: spacing.xs }]}>
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
  title: { marginTop: spacing.sm, marginBottom: spacing.lg },
  question: { marginTop: spacing.sm, marginBottom: spacing.md },
  heroRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  heroIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  libraryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  libraryIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  historyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.xs },
});
