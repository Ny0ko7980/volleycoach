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
import { createGoal } from "@/services/goalsService";
import { useDeleteGoal, useGoals } from "@/hooks/queries";
import { OBJECTIVES } from "@/constants/positions";
import { spacing } from "@/constants/theme";
import type { Goal, Objective } from "@/types/database";
import { errorMessage } from "@/utils/errors";

export default function GoalsScreen() {
  const { theme } = useAppTheme();
  const [modalVisible, setModalVisible] = useState(false);
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
            <GoalCard key={g.id} goal={g} onDelete={handleDelete} />
          ))}

          {achieved.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Atteints ({achieved.length})</Text>
              {achieved.map((g) => (
                <GoalCard key={g.id} goal={g} onDelete={handleDelete} />
              ))}
            </>
          ) : null}
        </>
      )}

      <NewGoalModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreated={() => {
          void refetch();
          setModalVisible(false);
        }}
      />
    </ScreenContainer>
  );
}

function NewGoalModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const { theme } = useAppTheme();
  const [category, setCategory] = useState<Objective>("detente");
  const [current, setCurrent] = useState("");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    const currentValue = Number(current.replace(",", "."));
    const targetValue = Number(target.replace(",", "."));
    if (Number.isNaN(currentValue) || Number.isNaN(targetValue)) {
      setError("Renseigne des valeurs numériques valides.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const goalDef = OBJECTIVES.find((o) => o.value === category)!;
      await createGoal({ name: goalDef.label.replace("Améliorer ", ""), category, currentValue, targetValue, unit });
      onCreated();
      setCurrent("");
      setTarget("");
      setUnit("");
    } catch (e) {
      setError(errorMessage(e, "Impossible de créer l'objectif."));
    } finally {
      setLoading(false);
    }
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
            <Button label="Créer l'objectif" onPress={handleCreate} loading={loading} />
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
