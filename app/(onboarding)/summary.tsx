import { useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useOnboardingStore } from "@/store/onboardingStore";
import { useProfileStore } from "@/store/profileStore";
import { completeOnboarding } from "@/services/profileService";
import { positionLabel, levelLabel, objectiveLabel } from "@/constants/positions";
import { spacing } from "@/constants/theme";

export default function SummaryScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const data = useOnboardingStore();
  const { setProfile } = useProfileStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFinish() {
    if (!data.position || !data.level) return;
    setLoading(true);
    setError(null);
    try {
      const profile = await completeOnboarding({
        username: data.username.trim(),
        age: data.age ? Number(data.age) : null,
        height_cm: data.height_cm ? Number(data.height_cm) : null,
        club: data.club.trim() || null,
        training_frequency: data.training_frequency,
        experience_years: data.experience_years ? Number(data.experience_years) : 0,
        position: data.position,
        level: data.level,
        goals: data.goals,
      });
      setProfile(profile);
      data.reset();
      router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement du profil.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Vérifie ton profil</Text>
        <Text style={{ color: theme.textMuted }}>Tu pourras tout modifier plus tard.</Text>
      </View>

      <Card>
        <Row label="Pseudo" value={data.username} />
        <Row label="Poste" value={data.position ? positionLabel(data.position) : "-"} />
        <Row label="Niveau" value={data.level ? levelLabel(data.level) : "-"} />
        {data.club ? <Row label="Club" value={data.club} /> : null}
        <Text style={[styles.goalsLabel, { color: theme.textMuted }]}>Objectifs</Text>
        <View style={styles.goalsWrap}>
          {data.goals.map((g) => (
            <Badge key={g} label={objectiveLabel(g)} tone="primary" />
          ))}
        </View>
      </Card>

      {error ? <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text> : null}

      <Button label="Terminer et accéder à l'app" onPress={handleFinish} loading={loading} />
    </ScreenContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.row}>
      <Text style={{ color: theme.textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 14, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.lg, marginBottom: spacing.lg },
  title: { fontSize: 24, fontWeight: "800", marginBottom: spacing.xs },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  goalsLabel: { fontSize: 13, marginTop: spacing.sm, marginBottom: spacing.xs },
  goalsWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
});
