import { useEffect, useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TextField } from "@/components/ui/TextField";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { LoadingView } from "@/components/ui/LoadingView";
import { useAppTheme } from "@/hooks/useAppTheme";
import { fetchExerciseById } from "@/services/exerciseService";
import { createExerciseAsAdmin, updateExerciseAsAdmin } from "@/services/adminService";
import { OBJECTIVES, LEVELS, POSITIONS } from "@/constants/positions";
import { spacing } from "@/constants/theme";
import type { Objective, PlayerLevel, Position } from "@/types/database";
import { errorMessage } from "@/utils/errors";

const DIFFICULTIES = [1, 2, 3, 4, 5];

export default function ExerciseFormScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [commonMistakes, setCommonMistakes] = useState("");
  const [tips, setTips] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("10");
  const [equipment, setEquipment] = useState("");
  const [positions, setPositions] = useState<Position[]>([]);
  const [level, setLevel] = useState<PlayerLevel>("debutant");
  const [objective, setObjective] = useState<Objective>("global");
  const [difficulty, setDifficulty] = useState(2);

  useEffect(() => {
    if (!id) return;
    fetchExerciseById(id).then((ex) => {
      if (!ex) return;
      setName(ex.name);
      setDescription(ex.description);
      setInstructions(ex.instructions);
      setCommonMistakes(ex.common_mistakes ?? "");
      setTips(ex.tips ?? "");
      setMediaUrl(ex.media_url ?? "");
      setDurationMinutes(String(ex.duration_minutes));
      setEquipment(ex.equipment.join(", "));
      setPositions(ex.positions);
      setLevel(ex.level);
      setObjective(ex.objective);
      setDifficulty(ex.difficulty);
      setLoading(false);
    });
  }, [id]);

  function togglePosition(p: Position) {
    setPositions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function handleSave() {
    if (!name.trim() || !description.trim() || !instructions.trim()) {
      setError("Nom, description et instructions sont obligatoires.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        description: description.trim(),
        positions,
        level,
        objective,
        durationMinutes: Number(durationMinutes) || 10,
        equipment: equipment
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean),
        difficulty,
        instructions: instructions.trim(),
        commonMistakes: commonMistakes.trim() || undefined,
        tips: tips.trim() || undefined,
        mediaUrl: mediaUrl.trim() || undefined,
      };
      if (isEditing && id) await updateExerciseAsAdmin(id, input);
      else await createExerciseAsAdmin(input);
      router.back();
    } catch (e) {
      setError(errorMessage(e, "Impossible d'enregistrer l'exercice."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingView />;

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: theme.text }]}>{isEditing ? "Modifier l'exercice" : "Nouvel exercice"}</Text>

      <TextField label="Nom" value={name} onChangeText={setName} />
      <TextField label="Description" value={description} onChangeText={setDescription} multiline />
      <TextField label="Durée (minutes)" value={durationMinutes} onChangeText={setDurationMinutes} keyboardType="number-pad" />
      <TextField label="Matériel (séparé par des virgules)" value={equipment} onChangeText={setEquipment} placeholder="ballons, filet" />

      <Text style={[styles.label, { color: theme.textMuted }]}>Objectif</Text>
      <View style={styles.wrap}>
        {OBJECTIVES.map((o) => (
          <Chip key={o.value} label={o.label} selected={objective === o.value} onPress={() => setObjective(o.value)} />
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textMuted }]}>Niveau</Text>
      <View style={styles.wrap}>
        {LEVELS.map((l) => (
          <Chip key={l.value} label={l.label} selected={level === l.value} onPress={() => setLevel(l.value)} />
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textMuted }]}>Postes concernés (aucun = tous)</Text>
      <View style={styles.wrap}>
        {POSITIONS.map((p) => (
          <Chip key={p.value} label={p.short} selected={positions.includes(p.value)} onPress={() => togglePosition(p.value)} />
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textMuted }]}>Difficulté</Text>
      <View style={styles.wrap}>
        {DIFFICULTIES.map((d) => (
          <Chip key={d} label={"★".repeat(d)} selected={difficulty === d} onPress={() => setDifficulty(d)} />
        ))}
      </View>

      <TextField label="Instructions" value={instructions} onChangeText={setInstructions} multiline />
      <TextField label="Erreurs fréquentes (optionnel)" value={commonMistakes} onChangeText={setCommonMistakes} multiline />
      <TextField label="Conseil (optionnel)" value={tips} onChangeText={setTips} multiline />
      <TextField
        label="Lien vidéo d'exemple (YouTube ou fichier vidéo, optionnel)"
        value={mediaUrl}
        onChangeText={setMediaUrl}
        placeholder="https://www.youtube.com/watch?v=..."
        autoCapitalize="none"
        keyboardType="url"
      />

      {error ? <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text> : null}

      <Button label={isEditing ? "Enregistrer les modifications" : "Créer l'exercice"} onPress={handleSave} loading={saving} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "800", marginTop: spacing.sm, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: "700", marginBottom: spacing.sm },
  wrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.md },
});
