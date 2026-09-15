import { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Lightbulb, X } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { WorkoutProgress } from "@/components/workouts/WorkoutProgress";
import { LoadingView } from "@/components/ui/LoadingView";
import { ErrorView } from "@/components/ui/ErrorView";
import { FeedbackChips } from "@/components/training/FeedbackChips";
import { ScaleSelector } from "@/components/training/ScaleSelector";
import { useAppTheme } from "@/hooks/useAppTheme";
import { supabase } from "@/lib/supabase";
import { useProfileStore } from "@/store/profileStore";
import {
  completeWorkoutSession,
  fetchWorkoutWithExercises,
  updateSessionProgress,
} from "@/services/workoutService";
import { saveExerciseFeedback } from "@/services/feedbackService";
import { refreshSkillScores } from "@/services/skillScoreService";
import { applySessionRewards } from "@/services/gamificationService";
import { notifyAchievementUnlocked } from "@/services/notificationsService";
import { queueMutation } from "@/services/offlineQueue";
import { skillOfExercise } from "@/constants/skills";
import { radius, spacing, typography } from "@/constants/theme";
import type { FeedbackRating, Workout, WorkoutExercise } from "@/types/database";
import { errorMessage } from "@/utils/errors";

/**
 * Étapes du mode entraînement.
 *
 * `feedback` s'intercale après la dernière série d'un exercice : c'est le seul
 * moment où le joueur a encore l'exercice en tête. `summary` clôt la séance.
 */
type Phase = "exercise" | "rest" | "feedback" | "summary";

export default function TrainingModeScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, setProfile } = useProfileStore();

  const [workout, setWorkout] = useState<(Workout & { workout_exercises: WorkoutExercise[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [setNumber, setSetNumber] = useState(1);
  const [phase, setPhase] = useState<Phase>("exercise");
  const [restRemaining, setRestRemaining] = useState(0);
  const [restTotal, setRestTotal] = useState(1);
  const [paused, setPaused] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [ratings, setRatings] = useState<Record<string, FeedbackRating>>({});
  const [fatigue, setFatigue] = useState<number | null>(null);
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const startedAt = useRef(Date.now());
  const sessionId = id; // workout_session id passed via route param

  useEffect(() => {
    if (!sessionId) return;
    // Le paramètre de route est l'id de la workout_session; on récupère le
    // workout associé via son propre id stocké côté session au démarrage.
    (async () => {
      try {
        const { data: session, error: sessionError } = await supabase
          .from("workout_sessions")
          .select("workout_id, current_exercise_index")
          .eq("id", sessionId)
          .single();
        if (sessionError) throw sessionError;
        if (!session.workout_id) throw new Error("Séance introuvable.");
        const w = await fetchWorkoutWithExercises(session.workout_id);
        setWorkout(w);
        setIndex(session.current_exercise_index ?? 0);
      } catch (e) {
        setError(errorMessage(e, "Impossible de charger la séance."));
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  useEffect(() => {
    if (phase !== "rest" || paused) return;
    if (restRemaining <= 0) {
      setPhase("exercise");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      return;
    }
    const t = setTimeout(() => setRestRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, restRemaining, paused]);

  if (loading) return <LoadingView label="Chargement de la séance..." />;
  if (error) return <ErrorView message={error} />;
  if (!workout || workout.workout_exercises.length === 0) return <ErrorView message="Aucun exercice dans cette séance." />;

  const exercises = [...workout.workout_exercises].sort((a, b) => a.order_index - b.order_index);
  const current = exercises[index];
  if (!current) return <ErrorView message="Exercice introuvable dans cette séance." />;
  const isLast = index === exercises.length - 1;
  const isLastSet = setNumber >= current.sets;

  function goToNextExercise() {
    if (!current) return;
    setIndex((i) => i + 1);
    setSetNumber(1);
    setPhase("rest");
    setRestRemaining(current.rest_seconds);
    setRestTotal(current.rest_seconds || 1);
    if (sessionId) updateSessionProgress(sessionId, index + 1).catch(() => undefined);
  }

  async function handleNext() {
    if (!current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    if (phase === "exercise") {
      if (!isLastSet) {
        setSetNumber((s) => s + 1);
        setPhase("rest");
        setRestRemaining(current.rest_seconds);
        setRestTotal(current.rest_seconds || 1);
        return;
      }
      // Toutes les séries sont faites : on demande le ressenti avant de passer
      // à la suite, tant que l'exercice est encore frais.
      setPhase("feedback");
      return;
    }
    if (phase === "rest") {
      setPhase("exercise");
      return;
    }
    if (phase === "feedback") {
      if (isLast) setPhase("summary");
      else goToNextExercise();
    }
  }

  /**
   * Enregistre le ressenti sans bloquer la séance : en cas d'échec réseau, le
   * joueur continue son entraînement, seule l'adaptation future est perdue.
   */
  async function handleRate(rating: FeedbackRating) {
    if (!current?.exercise || !sessionId) return;
    Haptics.selectionAsync().catch(() => undefined);
    setRatings((previous) => ({ ...previous, [current.exercise_id]: rating }));
    await saveExerciseFeedback({
      sessionId,
      exerciseId: current.exercise_id,
      skill: skillOfExercise(current.exercise),
      rating,
    }).catch(() => undefined);
  }

  function handlePrevious() {
    if (phase === "feedback") {
      setPhase("exercise");
      return;
    }
    if (setNumber > 1) {
      setSetNumber((s) => s - 1);
      setPhase("exercise");
      return;
    }
    if (index > 0) {
      setIndex((i) => i - 1);
      setSetNumber(exercises[index - 1]?.sets ?? 1);
      setPhase("exercise");
    }
  }

  async function finishSession() {
    if (!sessionId || !profile) return;
    setFinishing(true);
    const durationMinutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    try {
      await completeWorkoutSession(sessionId, {
        durationMinutes,
        // Les échelles non renseignées retombent sur la valeur neutre plutôt
        // que de bloquer la fin de séance sur un formulaire obligatoire.
        perceivedDifficulty: difficulty ?? 3,
        performanceRating: satisfaction ?? 3,
        ...(fatigue !== null ? { fatigueLevel: fatigue } : {}),
        ...(satisfaction !== null ? { satisfaction } : {}),
      });
      // Les scores de compétence alimentent la prochaine recommandation : on
      // les recalcule maintenant, sans faire échouer la fin de séance.
      await refreshSkillScores().catch(() => undefined);
      const { profile: updatedProfile, newAchievements } = await applySessionRewards(profile);
      setProfile(updatedProfile);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      for (const achievement of newAchievements) {
        await notifyAchievementUnlocked(achievement.name, achievement.icon);
      }
      Alert.alert(
        "Séance terminée !",
        newAchievements.length > 0
          ? `Bravo, tu as débloqué: ${newAchievements.map((a) => a.name).join(", ")}`
          : "Bravo, continue comme ça !",
        [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
      );
    } catch {
      // Hors-ligne ou erreur réseau: on met la complétion en file d'attente
      // pour synchronisation ultérieure, sans bloquer le joueur.
      await queueMutation("workout_sessions", {
        id: sessionId,
        status: "completed",
        completed_at: new Date().toISOString(),
        duration_minutes: durationMinutes,
        perceived_difficulty: difficulty ?? 3,
        fatigue_level: fatigue,
        satisfaction,
      });
      Alert.alert("Séance enregistrée hors-ligne", "Elle sera synchronisée dès que tu retrouveras une connexion.", [
        { text: "OK", onPress: () => router.replace("/(tabs)") },
      ]);
    } finally {
      setFinishing(false);
    }
  }

  function handleFinishEarly() {
    if (phase === "summary") {
      router.replace("/(tabs)");
      return;
    }
    Alert.alert("Terminer la séance ?", "Tu n'as pas complété tous les exercices.", [
      { text: "Annuler", style: "cancel" },
      { text: "Terminer", style: "destructive", onPress: () => setPhase("summary") },
    ]);
  }

  const restPercent = restTotal > 0 ? ((restTotal - restRemaining) / restTotal) * 100 : 0;

  if (phase === "summary") {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={styles.summary} showsVerticalScrollIndicator={false}>
          <Text style={[typography.titleXL, { color: theme.text, marginBottom: spacing.xs }]}>Séance terminée</Text>
          <Text style={[typography.bodySecondary, { color: theme.textMuted, marginBottom: spacing.xl }]}>
            Trois questions rapides : elles servent à ajuster tes prochaines séances.
          </Text>

          <ScaleSelector
            label="Fatigue ressentie"
            lowLabel="Frais"
            highLabel="Épuisé"
            value={fatigue}
            onChange={setFatigue}
          />
          <ScaleSelector
            label="Difficulté globale"
            lowLabel="Trop facile"
            highLabel="Trop dure"
            value={difficulty}
            onChange={setDifficulty}
          />
          <ScaleSelector
            label="Satisfaction"
            lowLabel="Déçu"
            highLabel="Très satisfait"
            value={satisfaction}
            onChange={setSatisfaction}
          />

          <Button label="Enregistrer ma séance" onPress={finishSession} loading={finishing} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.topBar}>
        <IconButton
          icon={<X size={18} color={theme.textMuted} />}
          accessibilityLabel="Quitter le mode entraînement"
          onPress={handleFinishEarly}
        />
        <View style={{ flex: 1 }} />
      </View>

      <View style={styles.header}>
        <WorkoutProgress current={index + 1} total={exercises.length} />
      </View>

      <View style={styles.body}>
        {phase === "rest" ? (
          <View style={styles.center}>
            <Text style={[typography.eyebrow, { color: theme.textMuted, marginBottom: spacing.lg }]}>RÉCUPÉRATION</Text>
            <ProgressRing
              percent={restPercent}
              size={180}
              strokeWidth={12}
              color={theme.primary}
              valueLabel={`${restRemaining}s`}
              label="restant"
            />
            <View style={{ marginTop: spacing.xl, minWidth: 160 }}>
              <Button label={paused ? "Reprendre" : "Pause"} variant="secondary" onPress={() => setPaused((p) => !p)} />
            </View>
          </View>
        ) : phase === "feedback" ? (
          <View style={styles.center}>
            <Text style={[typography.eyebrow, { color: theme.textMuted, marginBottom: spacing.md }]}>TON RESSENTI</Text>
            <Text style={[typography.titleM, styles.exerciseName, { color: theme.text }]}>
              {current.exercise?.name}
            </Text>
            <Text style={[typography.bodySecondary, styles.feedbackHint, { color: theme.textMuted }]}>
              Comment as-tu trouvé cet exercice ?
            </Text>
            <View style={styles.feedbackChips}>
              <FeedbackChips value={ratings[current.exercise_id] ?? null} onChange={handleRate} />
            </View>
          </View>
        ) : (
          <View style={styles.center}>
            <View style={styles.exerciseNumberRow}>
              <View style={[styles.exerciseNumberBadge, { backgroundColor: theme.primaryMuted }]}>
                <Text style={[typography.bodyStrong, { color: theme.primary }]}>{index + 1}</Text>
              </View>
            </View>
            <Text style={[typography.titleXL, styles.exerciseName, { color: theme.text }]}>{current.exercise?.name}</Text>
            <Text style={[typography.titleM, styles.setInfo, { color: theme.primary }]}>
              Série {setNumber} / {current.sets} · {current.reps}
            </Text>
            <Text style={[typography.body, styles.instructions, { color: theme.textMuted }]}>
              {current.exercise?.instructions}
            </Text>
            {current.exercise?.tips ? (
              <View style={[styles.tipRow, { backgroundColor: theme.surfaceAlt }]}>
                <Lightbulb size={15} color={theme.warning} />
                <Text style={[typography.bodySecondary, styles.tip, { color: theme.text }]}>{current.exercise.tips}</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <View style={styles.controlRow}>
          <View style={styles.controlButton}>
            <Button label="Précédent" variant="ghost" onPress={handlePrevious} disabled={index === 0 && setNumber === 1 && phase !== "feedback"} />
          </View>
          <View style={styles.controlButton}>
            <Button
              label={
                phase === "feedback"
                  ? ratings[current.exercise_id]
                    ? isLast
                      ? "Terminer"
                      : "Exercice suivant"
                    : "Passer"
                  : "Suivant"
              }
              onPress={handleNext}
              loading={finishing}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  topBar: { flexDirection: "row", alignItems: "center", paddingTop: spacing.xs },
  header: { marginTop: spacing.sm, marginBottom: spacing.lg },
  body: { flex: 1, justifyContent: "center" },
  center: { alignItems: "center" },
  exerciseNumberRow: { marginBottom: spacing.md },
  exerciseNumberBadge: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  exerciseName: { textAlign: "center", marginBottom: spacing.xs },
  setInfo: { textAlign: "center", marginBottom: spacing.lg },
  instructions: { textAlign: "center", lineHeight: 22, paddingHorizontal: spacing.sm },
  feedbackHint: { textAlign: "center", marginTop: spacing.sm, marginBottom: spacing.xl },
  feedbackChips: { width: "100%" },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    width: "100%",
  },
  tip: { flex: 1 },
  controls: { gap: spacing.sm, paddingBottom: spacing.sm },
  controlRow: { flexDirection: "row", gap: spacing.md },
  controlButton: { flex: 1 },
  summary: { paddingTop: spacing.xl, paddingBottom: spacing.xl },
});
