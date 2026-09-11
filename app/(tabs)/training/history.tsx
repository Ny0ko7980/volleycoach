import { useEffect, useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { History as HistoryIcon } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LoadingView } from "@/components/ui/LoadingView";
import { ErrorView } from "@/components/ui/ErrorView";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppTheme } from "@/hooks/useAppTheme";
import { fetchSessionHistory } from "@/services/workoutService";
import { spacing, typography } from "@/constants/theme";
import type { WorkoutSession } from "@/types/database";

const STATUS_LABEL: Record<string, { label: string; tone: "success" | "primary" | "neutral" }> = {
  completed: { label: "Terminée", tone: "success" },
  in_progress: { label: "En cours", tone: "primary" },
  planned: { label: "Planifiée", tone: "neutral" },
  skipped: { label: "Ignorée", tone: "neutral" },
};

export default function TrainingHistoryScreen() {
  const { theme } = useAppTheme();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    fetchSessionHistory(100)
      .then(setSessions)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  if (loading) return <LoadingView />;
  if (error) return <ErrorView message={error} onRetry={load} />;

  return (
    <ScreenContainer onRefresh={load} refreshing={loading}>
      <Text style={[styles.title, { color: theme.text }]}>Journal d'entraînement</Text>

      {sessions.length === 0 ? (
        <EmptyState
          icon={<HistoryIcon size={26} color={theme.textMuted} />}
          title="Aucune séance enregistrée"
          description="Ton historique apparaîtra ici après ta première séance."
        />
      ) : (
        sessions.map((s) => {
          const status = STATUS_LABEL[s.status] ?? { label: s.status, tone: "neutral" as const };
          return (
            <Card key={s.id}>
              <View style={styles.row}>
                <Text style={{ color: theme.text, fontWeight: "700", flex: 1 }}>{s.workout?.title ?? "Séance"}</Text>
                <Badge label={status.label} tone={status.tone} />
              </View>
              <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: spacing.xs }}>
                {new Date(s.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                {s.duration_minutes ? ` · ${s.duration_minutes} min` : ""}
              </Text>
              {s.status === "completed" ? (
                <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: spacing.xs }}>
                  Difficulté ressentie: {s.perceived_difficulty}/5 · Performance: {s.performance_rating}/5
                </Text>
              ) : null}
              {s.comment ? (
                <Text style={{ color: theme.text, fontSize: 13, marginTop: spacing.sm, fontStyle: "italic" }}>
                  "{s.comment}"
                </Text>
              ) : null}
            </Card>
          );
        })
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.titleXL, marginTop: spacing.sm, marginBottom: spacing.lg },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
