import { useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TextField } from "@/components/ui/TextField";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useProfileStore } from "@/store/profileStore";
import { updateMyProfile } from "@/services/profileService";
import { POSITIONS, LEVELS, OBJECTIVES } from "@/constants/positions";
import { spacing } from "@/constants/theme";
import type { Objective, PlayerLevel, Position } from "@/types/database";

export default function EditProfileScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { profile, setProfile } = useProfileStore();
  const [username, setUsername] = useState(profile?.username ?? "");
  const [club, setClub] = useState(profile?.club ?? "");
  const [age, setAge] = useState(profile?.age ? String(profile.age) : "");
  const [heightCm, setHeightCm] = useState(profile?.height_cm ? String(profile.height_cm) : "");
  const [position, setPosition] = useState<Position | null>(profile?.position ?? null);
  const [level, setLevel] = useState<PlayerLevel | null>(profile?.level ?? null);
  const [goals, setGoals] = useState<Objective[]>(profile?.goals ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleGoal(goal: Objective) {
    setGoals((prev) => (prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]));
  }

  async function handleSave() {
    if (!username.trim() || !position || !level) {
      setError("Le pseudo, le poste et le niveau sont obligatoires.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const updated = await updateMyProfile({
        username: username.trim(),
        club: club.trim() || null,
        age: age ? Number(age) : null,
        height_cm: heightCm ? Number(heightCm) : null,
        position,
        level,
        goals,
      });
      setProfile(updated);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'enregistrer les modifications.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: theme.text }]}>Modifier mon profil</Text>

      <TextField label="Pseudo" value={username} onChangeText={setUsername} />
      <TextField label="Club" value={club} onChangeText={setClub} />
      <TextField label="Âge" value={age} onChangeText={setAge} keyboardType="number-pad" />
      <TextField label="Taille (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="number-pad" />

      <Text style={[styles.label, { color: theme.textMuted }]}>Poste</Text>
      <View style={styles.wrap}>
        {POSITIONS.map((p) => (
          <Chip key={p.value} label={p.label} selected={position === p.value} onPress={() => setPosition(p.value)} />
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textMuted }]}>Niveau</Text>
      <View style={styles.wrap}>
        {LEVELS.map((l) => (
          <Chip key={l.value} label={l.label} selected={level === l.value} onPress={() => setLevel(l.value)} />
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textMuted }]}>Objectifs</Text>
      <View style={styles.wrap}>
        {OBJECTIVES.map((o) => (
          <Chip key={o.value} label={o.label} selected={goals.includes(o.value)} onPress={() => toggleGoal(o.value)} />
        ))}
      </View>

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
