import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View, StyleSheet } from "react-native";
import { Target } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { GoalCard } from "@/components/goals/GoalCard";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Chip } from "@/components/ui/Chip";
import { LoadingView } from "@/components/ui/LoadingView";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppTheme } from "@/hooks/useAppTheme";
import { fetchGoals, createGoal } from "@/services/goalsService";
import { OBJECTIVES } from "@/constants/positions";
import { spacing } from "@/constants/theme";
import type { Goal, Objective } from "@/types/database";

export default function GoalsScreen() {
  const { theme } = useAppTheme();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  function load() {
    setLoading(true);
    fetchGoals()
      .then(setGoals)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  if (loading) return <LoadingView />;

  const active = goals.filter((g) => g.status === "active");
  const achieved = goals.filter((g) => g.status === "achieved");

  return (
    <ScreenContainer onRefresh={load} refreshing={loading}>
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
            <GoalCard key={g.id} goal={g} />
          ))}

          {achieved.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Atteints ({achieved.length})</Text>
              {achieved.map((g) => (
                <GoalCard key={g.id} goal={g} />
              ))}
            </>
          ) : null}
        </>
      )}

      <NewGoalModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreated={(g) => {
          setGoals((prev) => [g, ...prev]);
          setModalVisible(false);
        }}
      />
    </ScreenContainer>
  );
}

function NewGoalModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: (g: Goal) => void }) {
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
      const goal = await createGoal({ name: goalDef.label.replace("Améliorer ", ""), category, currentValue, targetValue, unit });
      onCreated(goal);
      setCurrent("");
      setTarget("");
      setUnit("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de créer l'objectif.");
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
