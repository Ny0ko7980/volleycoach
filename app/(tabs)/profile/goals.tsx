import { useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View, StyleSheet } from "react-native";
import { Target } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { GoalCard } from "@/components/goals/GoalCard";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Chip } from "@/components/ui/Chip";
import { LoadingView } from "@/components/ui/LoadingView";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorView } from "@/components/ui/ErrorView";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useCreateGoal, useDeleteGoal, useGoals, useUpdateGoalProgress } from "@/hooks/queries";
import { OBJECTIVES } from "@/constants/positions";
import { spacing } from "@/constants/theme";
import type { Goal, Objective } from "@/types/database";
import { errorMessage } from "@/utils/errors";

export default function GoalsScreen() {
  const { theme } = useAppTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [editedGoal, setEditedGoal] = useState<Goal | null>(null);
  const { data, isPending, isError, error, refetch, isFetching } = useGoals();
  const deleteGoalMutation = useDeleteGoal();
  const goals = data ?? [];

  function handleDelete(goal: Goal) {
    Alert.alert("Supprimer cet objectif ?", goal.name, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        // La liste n'est plus mise à jour à la main : la mutation invalide la
        // racine « objectifs », ce qui rafraîchit aussi l'objectif principal
        // affiché sur l'accueil. C'est précisément ce que l'ancien
        // `setGoals(prev => ...)` ne faisait pas.
        onPress: () =>
          deleteGoalMutation.mutate(goal.id, {
            onError: (e) => Alert.alert("Erreur", errorMessage(e, "Impossible de supprimer cet objectif.")),
          }),
      },
    ]);
  }

  if (isPending) return <LoadingView />;
  // Un échec de chargement doit se voir : sinon « aucun objectif » et « je
  // n'ai pas réussi à les lire » se ressemblent trop.
  if (isError) {
    return (
      <ErrorView
        message={errorMessage(error, "Tes objectifs n'ont pas pu être chargés.")}
        onRetry={() => void refetch()}
      />
    );
  }

  const active = goals.filter((g) => g.status === "active");
  const achieved = goals.filter((g) => g.status === "achieved");

  return (
    <ScreenContainer onRefresh={() => void refetch()} refreshing={isFetching}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.text }]}>Mes objectifs</Text>
        <Button label="+ Nouveau" fullWidth={false} onPress={() => setModalVisible(true)} />
      </View>

      {goals.length === 0 ? (
        <EmptyState icon={<Target size={26} color={theme.textMuted} />} title="Aucun objectif" description="Crée ton premier objectif personnel." />
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>En cours ({active.length})</Text>
          {active.map((g) => (
            <GoalCard key={g.id} goal={g} onDelete={handleDelete} onUpdateProgress={setEditedGoal} />
          ))}

          {achieved.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Atteints ({achieved.length})</Text>
              {achieved.map((g) => (
                <GoalCard key={g.id} goal={g} onDelete={handleDelete} onUpdateProgress={setEditedGoal} />
              ))}
            </>
          ) : null}
        </>
      )}

      <UpdateProgressModal goal={editedGoal} onClose={() => setEditedGoal(null)} />

      <NewGoalModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </ScreenContainer>
  );
}

/**
 * Saisie de la valeur actuelle d'un objectif.
 *
 * Une vraie fenêtre et non `Alert.prompt` : ce dernier n'existe que sur iOS,
 * la saisie serait donc simplement absente sur Android.
 *
 * L'objectif est passé en entier plutôt que par identifiant : la cible doit
 * accompagner la valeur jusqu'à l'écriture pour que le statut soit décidé sans
 * relire la ligne, y compris au rejeu hors-ligne.
 */
function UpdateProgressModal({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { theme } = useAppTheme();
  const updateProgress = useUpdateGoalProgress();
  const currentValue = goal?.current_value ?? 0;

  /**
   * La saisie repart de la valeur enregistrée à chaque objectif ouvert.
   *
   * L'état retient l'objectif auquel il se rapporte : dès qu'on en ouvre un
   * autre, la saisie précédente ne lui correspond plus et la valeur affichée
   * redevient celle de la base. Ni effet de resynchronisation, ni remontage du
   * composant — qui ferait disparaître la fenêtre sans son animation.
   */
  const [draft, setDraft] = useState<{ goalId: string; value: string } | null>(null);
  const value = goal && draft?.goalId === goal.id ? draft.value : String(currentValue);
  const setValue = (next: string) => goal && setDraft({ goalId: goal.id, value: next });

  // Le message d'erreur porte lui aussi l'objectif concerné : sans cela, celui
  // d'un objectif précédent s'afficherait sous la saisie du suivant.
  const [failure, setFailure] = useState<{ goalId: string; message: string } | null>(null);
  const error = goal && failure?.goalId === goal.id ? failure.message : null;
  const setError = (message: string | null) =>
    setFailure(message !== null && goal ? { goalId: goal.id, message } : null);

  function handleSave() {
    if (!goal) return;
    const parsed = Number(value.replace(",", "."));
    if (value.trim() === "" || !Number.isFinite(parsed)) {
      setError("Renseigne une valeur numérique valide.");
      return;
    }
    setError(null);
    updateProgress.mutate(
      {
        goalId: goal.id,
        currentValue: parsed,
        targetValue: goal.target_value,
        goalName: goal.name,
        previousStatus: goal.status,
      },
      {
        onSuccess: (result) => {
          setDraft(null);
          setFailure(null);
          onClose();
          if (result.queued) {
            Alert.alert("Enregistré hors ligne", "Ta progression sera synchronisée dès le retour du réseau.");
          }
        },
        onError: (e) => setError(errorMessage(e, "Impossible d'enregistrer cette progression.")),
      },
    );
  }

  return (
    <Modal visible={goal !== null} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Ma progression</Text>
            {goal ? (
              <Text style={{ color: theme.textMuted, fontSize: 13, marginBottom: spacing.md }}>
                {goal.name} · cible {goal.target_value}
                {goal.unit ?? ""} (actuellement {currentValue}
                {goal.unit ?? ""})
              </Text>
            ) : null}
            <TextField
              label={`Valeur actuelle${goal?.unit ? ` (${goal.unit})` : ""}`}
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              autoFocus
            />
            {error ? <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text> : null}
            <Button label="Enregistrer" onPress={handleSave} loading={updateProgress.isPending} />
            <Button label="Annuler" variant="ghost" onPress={onClose} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function NewGoalModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useAppTheme();
  const createGoalMutation = useCreateGoal();
  const [category, setCategory] = useState<Objective>("detente");
  const [current, setCurrent] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    const currentValue = Number(current.replace(",", "."));
    const targetValue = Number(target.replace(",", "."));
    if (!Number.isFinite(currentValue) || !Number.isFinite(targetValue)) {
      setError("Renseigne des valeurs numériques valides.");
      return;
    }
    setError(null);
    const goalDef = OBJECTIVES.find((o) => o.value === category)!;
    // La mutation invalide la racine « objectifs » : la liste et l'objectif
    // principal de l'accueil se remettent à jour seuls, il n'y a plus de
    // rechargement à demander depuis l'écran.
    createGoalMutation.mutate(
      { name: goalDef.label.replace("Améliorer ", ""), category, currentValue, targetValue, unit },
      {
        onSuccess: () => {
          setCurrent("");
          setTarget("");
          setUnit("");
          onClose();
        },
        onError: (e) => setError(errorMessage(e, "Impossible de créer l'objectif.")),
      }
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Nouvel objectif</Text>
            <View style={styles.wrap}>
              {OBJECTIVES.map((o) => (
                <Chip key={o.value} label={o.label} selected={category === o.value} onPress={() => setCategory(o.value)} />
              ))}
            </View>
            <TextField label="Valeur actuelle" value={current} onChangeText={setCurrent} keyboardType="decimal-pad" />
            <TextField label="Valeur cible" value={target} onChangeText={setTarget} keyboardType="decimal-pad" />
            <TextField label="Unité (cm, %, ...)" value={unit} onChangeText={setUnit} />
            {error ? <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text> : null}
            <Button label="Créer l'objectif" onPress={handleCreate} loading={createGoalMutation.isPending} />
            <Button label="Annuler" variant="ghost" onPress={onClose} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.sm, marginBottom: spacing.lg },
  title: { fontSize: 22, fontWeight: "800" },
  sectionTitle: { fontSize: 13, fontWeight: "700", marginTop: spacing.lg, marginBottom: spacing.sm },
  wrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, maxHeight: "85%" },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: spacing.md },
});
