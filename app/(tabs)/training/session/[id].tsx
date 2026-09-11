import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lightbulb } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LoadingView } from "@/components/ui/LoadingView";
import { ErrorView } from "@/components/ui/ErrorView";
import { useAppTheme } from "@/hooks/useAppTheme";
import { supabase } from "@/lib/supabase";
import { useProfileStore } from "@/store/profileStore";
import {
  completeWorkoutSession,
  fetchWorkoutWithExercises,
  updateSessionProgress,
} from "@/services/workoutService";
import { applySessionRewards } from "@/services/gamificationService";
import { notifyAchievementUnlocked } from "@/services/notificationsService";
import { queueMutation } from "@/services/offlineQueue";
import { spacing } from "@/constants/theme";
import type { Workout, WorkoutExercise } from "@/types/database";

type Phase = "exercise" | "rest";

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
  const [paused, setPaused] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const startedAt = useRef(Date.now());
  const sessionId = id; // workout_session id passed via route param

  useEffect(() => {
    if (!sessionId) return;
    // Le paramètre de route est l'id de la workout_session; on récupère le
    // workout associé via son propre id stocké côté session au démarrage.
    // Pour rester simple ici, on relit la session pour connaître workout_id.
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
        setError(e instanceof Error ? e.message : "Impossible de charger la séance.");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  useEffect(() => {
    if (phase !== "rest" || paused) return;
    if (restRemaining <= 0) {
      setPhase("exercise");
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

  async function handleNext() {
    if (!current) return;
    if (phase === "exercise") {
      if (!isLastSet) {
        setSetNumber((s) => s + 1);
        setPhase("rest");
        setRestRemaining(current.rest_seconds);
        return;
      }
      if (isLast) {
        await finishSession();
        return;
      }
      setIndex((i) => i + 1);
      setSetNumber(1);
      setPhase("rest");
      setRestRemaining(current.rest_seconds);
      if (sessionId) await updateSessionProgress(sessionId, index + 1).catch(() => undefined);
    } else {
      setPhase("exercise");
    }
  }

  function handlePrevious() {
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
        perceivedDifficulty: 3,
        performanceRating: 3,
      });
      const { profile: updatedProfile, newAchievements } = await applySessionRewards(profile);
      setProfile(updatedProfile);
      for (const achievement of newAchievements) {
        await notifyAchievementUnlocked(achievement.name, achievement.icon);
      }
      Alert.alert(
        "Séance terminée ! 🎉",
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
      });
      Alert.alert("Séance enregistrée hors-ligne", "Elle sera synchronisée dès que tu retrouveras une connexion.", [
        { text: "OK", onPress: () => router.replace("/(tabs)") },
      ]);
    } finally {
      setFinishing(false);
    }
  }

  function handleFinishEarly() {
    Alert.alert("Terminer la séance ?", "Tu n'as pas complété tous les exercices.", [
      { text: "Annuler", style: "cancel" },
      { text: "Terminer", style: "destructive", onPress: finishSession },
    ]);
  }

  const globalProgress = ((index + (setNumber - 1) / current.sets) / exercises.length) * 100;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <ProgressBar percent={globalProgress} />
        <Text style={[styles.progressLabel, { color: theme.textMuted }]}>
          Exercice {index + 1} / {exercises.length}
        </Text>
      </View>

      <View style={styles.body}>
        {phase === "rest" ? (
          <View style={styles.center}>
            <Text style={[styles.restLabel, { color: theme.textMuted }]}>RÉCUPÉRATION</Text>
            <Text style={[styles.timer, { color: theme.primary }]}>{restRemaining}s</Text>
            <Button label={paused ? "Reprendre" : "Pause"} variant="outline" onPress={() => setPaused((p) => !p)} />
          </View>
        ) : (
          <>
            <Text style={[styles.exerciseName, { color: theme.text }]}>{current.exercise?.name}</Text>
            <Text style={[styles.setInfo, { color: theme.primary }]}>
              Série {setNumber} / {current.sets} · {current.reps}
            </Text>
            <Text style={[styles.instructions, { color: theme.textMuted }]}>{current.exercise?.instructions}</Text>
            {current.exercise?.tips ? (
              <View style={styles.tipRow}>
                <Lightbulb size={15} color={theme.warning} />
                <Text style={[styles.tip, { color: theme.text }]}>{current.exercise.tips}</Text>
              </View>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.controls}>
        <View style={styles.controlRow}>
          <View style={styles.controlButton}>
            <Button label="Précédent" variant="ghost" onPress={handlePrevious} disabled={index === 0 && setNumber === 1} />
          </View>
          <View style={styles.controlButton}>
            <Button
              label={isLast && isLastSet && phase === "exercise" ? "Terminer" : "Suivant"}
              onPress={handleNext}
              loading={finishing}
            />
          </View>
        </View>
        <Button label="Terminer la séance maintenant" variant="ghost" onPress={handleFinishEarly} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  header: { marginBottom: spacing.lg },
  progressLabel: { fontSize: 12, marginTop: spacing.xs, textAlign: "center" },
  body: { flex: 1, justifyContent: "center" },
  center: { alignItems: "center" },
  exerciseName: { fontSize: 28, fontWeight: "800", textAlign: "center", marginBottom: spacing.sm },
  setInfo: { fontSize: 18, fontWeight: "700", textAlign: "center", marginBottom: spacing.lg },
  instructions: { fontSize: 16, lineHeight: 24, textAlign: "center" },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs, marginTop: spacing.lg, paddingHorizontal: spacing.md },
  tip: { flex: 1, fontSize: 14, fontStyle: "italic" },
  restLabel: { fontSize: 14, fontWeight: "700", letterSpacing: 1, marginBottom: spacing.md },
  timer: { fontSize: 64, fontWeight: "800", marginBottom: spacing.xl },
  controls: { gap: spacing.sm },
  controlRow: { flexDirection: "row", gap: spacing.md },
  controlButton: { flex: 1 },
});
