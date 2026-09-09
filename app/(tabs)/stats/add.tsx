import { useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Chip } from "@/components/ui/Chip";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { useAppTheme } from "@/hooks/useAppTheme";
import { addStatistic } from "@/services/statisticsService";
import { STAT_CATEGORIES, STAT_METRICS } from "@/constants/positions";
import { spacing } from "@/constants/theme";
import type { StatCategory } from "@/types/database";

export default function AddStatisticScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [category, setCategory] = useState<StatCategory>("reception");
  const [metric, setMetric] = useState(STAT_METRICS.reception[0]!.key);
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCategoryChange(cat: StatCategory) {
    setCategory(cat);
    setMetric(STAT_METRICS[cat][0]!.key);
  }

  async function handleSave() {
    const numericValue = Number(value.replace(",", "."));
    if (Number.isNaN(numericValue)) {
      setError("Entre une valeur numérique valide.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const metricDef = STAT_METRICS[category].find((m) => m.key === metric);
      await addStatistic({ category, metric, value: numericValue, unit: metricDef?.unit, notes: notes || undefined });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'enregistrer la statistique.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: theme.text }]}>Ajouter une statistique</Text>

      <Text style={[styles.label, { color: theme.textMuted }]}>Catégorie</Text>
      <View style={styles.wrap}>
        {STAT_CATEGORIES.map((c) => (
          <Chip key={c.value} label={`${c.icon} ${c.label}`} selected={category === c.value} onPress={() => handleCategoryChange(c.value)} />
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textMuted }]}>Indicateur</Text>
      <View style={styles.wrap}>
        {STAT_METRICS[category].map((m) => (
          <Chip key={m.key} label={m.label} selected={metric === m.key} onPress={() => setMetric(m.key)} />
        ))}
      </View>

      <TextField label="Valeur" value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder="Ex: 18" />
      <TextField label="Notes (optionnel)" value={notes} onChangeText={setNotes} placeholder="Contexte, ressenti..." />

      {error ? <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text> : null}

      <Button label="Enregistrer" onPress={handleSave} loading={loading} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "800", marginTop: spacing.sm, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: "700", marginBottom: spacing.sm },
  wrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.md },
});
