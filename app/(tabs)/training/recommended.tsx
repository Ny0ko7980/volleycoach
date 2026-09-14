import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Sparkles, Clock3, Flame, Target } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DifficultyDots } from "@/components/ui/DifficultyDots";
import { LoadingView } from "@/components/ui/LoadingView";
import { ErrorView } from "@/components/ui/ErrorView";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useProfileStore } from "@/store/profileStore";
import {
  describeRecommendation,
  recommendSession,
  type SessionRecommendation,
} from "@/services/recommendationEngine";
import { buildTrainingContext } from "@/services/trainingContextService";
import { generateWorkoutFromRecommendation, startWorkoutSession } from "@/services/workoutService";
import { skillIcon, skillLabel } from "@/constants/skills";
import { spacing, typography, radius } from "@/constants/theme";
import { errorMessage } from "@/utils/errors";

const INTENSITY_LABELS: Record<SessionRecommendation["intensity"], string> = {
  low: "Intensité légère",
  medium: "Intensité modérée",
  high: "Intensité élevée",
};

export default function RecommendedSessionScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { profile } = useProfileStore();

  const [recommendation, setRecommendation] = useState<SessionRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const context = await buildTrainingContext(profile);
      setRecommendation(recommendSession(context));
    } catch (e) {
      setError(errorMessage(e, "Impossible de préparer la recommandation."));
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleStart() {
    if (!recommendation || !profile) return;
    setStarting(true);
    setError(null);
    try {
      const workout = await generateWorkoutFromRecommendation(recommendation, profile);
      const session = await startWorkoutSession(workout.id);
      router.replace(`/(tabs)/training/session/${session.id}`);
    } catch (e) {
      setError(errorMessage(e, "Impossible de générer la séance."));
    } finally {
      setStarting(false);
    }
  }

  if (!profile) {
    return <EmptyState title="Profil incomplet" description="Termine ton profil pour recevoir une recommandation." />;
  }
  if (loading) return <LoadingView label="Analyse de ton profil..." />;
  if (error && !recommendation) return <ErrorView message={error} onRetry={load} />;
  if (!recommendation) return <ErrorView message="Aucune recommandation disponible." onRetry={load} />;

  return (
    <ScreenContainer>
      <Text style={[typography.titleXL, styles.title, { color: theme.text }]}>Séance recommandée</Text>

      <Card>
        <View style={styles.headerRow}>
          <View style={[styles.icon, { backgroundColor: theme.primaryMuted }]}>
            <Sparkles size={18} color={theme.primary} />
          </View>
          <Text style={[typography.body, styles.pitch, { color: theme.text }]}>
            {describeRecommendation(recommendation)}
          </Text>
        </View>

        {recommendation.reasons.length > 0 ? (
          <View style={[styles.reasons, { backgroundColor: theme.surfaceAlt }]}>
            {recommendation.reasons.map((reason) => (
              <Text key={reason} style={[typography.bodySecondary, { color: theme.textMuted }]}>
                • {reason}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={[typography.caption, { color: theme.textFaint, marginTop: spacing.md }]}>
            Cette première recommandation s'appuie sur ton poste, ton niveau et tes objectifs. Elle s'affinera à
            mesure que tu donneras ton ressenti sur les exercices.
          </Text>
        )}
      </Card>

      <Card>
        <Text style={[typography.bodyStrong, { color: theme.text, marginBottom: spacing.md }]}>Au programme</Text>

        <FocusRow label="Travail principal" skill={recommendation.primarySkill} />
        {recommendation.secondarySkill ? (
          <FocusRow label="Travail secondaire" skill={recommendation.secondarySkill} />
        ) : null}
        {recommendation.physicalSkill ? (
          <FocusRow label="Bloc physique" skill={recommendation.physicalSkill} />
        ) : null}

        <View style={[styles.metaRow, { borderTopColor: theme.border }]}>
          <View style={styles.meta}>
            <Clock3 size={14} color={theme.textMuted} />
            <Text style={[typography.caption, { color: theme.textMuted }]}>
              {recommendation.durationMinutes} min
            </Text>
          </View>
          <View style={styles.meta}>
            <Flame size={14} color={theme.textMuted} />
            <Text style={[typography.caption, { color: theme.textMuted }]}>
              {INTENSITY_LABELS[recommendation.intensity]}
            </Text>
          </View>
          <View style={styles.meta}>
            <Target size={14} color={theme.textMuted} />
            <DifficultyDots value={Math.round(recommendation.difficultyTarget)} />
          </View>
        </View>
      </Card>

      {error ? <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text> : null}

      <Button label="Démarrer cette séance" onPress={handleStart} loading={starting} />
      <View style={{ marginTop: spacing.sm }}>
        <Button
          label="Je préfère choisir moi-même"
          variant="ghost"
          onPress={() => router.replace("/(tabs)/training/generate")}
        />
      </View>
    </ScreenContainer>
  );
}

function FocusRow({ label, skill }: { label: string; skill: SessionRecommendation["primarySkill"] }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.focusRow}>
      <Text style={styles.focusIcon}>{skillIcon(skill)}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[typography.caption, { color: theme.textFaint }]}>{label}</Text>
        <Text style={[typography.bodyStrong, { color: theme.text }]}>{skillLabel(skill)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.sm, marginBottom: spacing.lg },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  pitch: { flex: 1, lineHeight: 22 },
  reasons: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, gap: spacing.xs },
  focusRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  focusIcon: { fontSize: 22 },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  meta: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
});
