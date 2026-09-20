import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { Chip } from "@/components/ui/Chip";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useOnboardingStore } from "@/store/onboardingStore";
import { TRAINING_FREQUENCIES } from "@/constants/positions";
import { MINIMUM_AGE, MAXIMUM_AGE } from "@/constants/legal";
import { spacing } from "@/constants/theme";

export default function ProfileInfoScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const data = useOnboardingStore();
  const [error, setError] = useState<string | null>(null);

  function handleNext() {
    if (!data.username.trim()) {
      setError("Le pseudo est obligatoire.");
      return;
    }
    // La base refuse de toute façon un âge hors bornes (contrainte
    // `player_profiles_age_check`) : on le dit ici pour que le joueur le
    // découvre tout de suite, et pas après quatre écrans d'onboarding.
    const parsedAge = data.age.trim() ? Number(data.age) : null;
    if (parsedAge !== null && (!Number.isFinite(parsedAge) || parsedAge < MINIMUM_AGE || parsedAge > MAXIMUM_AGE)) {
      setError(
        parsedAge < MINIMUM_AGE
          ? `Coach Volley est réservé aux ${MINIMUM_AGE} ans et plus.`
          : "Cet âge ne semble pas valide."
      );
      return;
    }
    setError(null);
    router.push("/(onboarding)/position");
  }

  return (
    <ScreenContainer>
      <StepHeader step={1} total={4} title="Parle-nous de toi" subtitle="Ces informations personnalisent ton suivi." />

      <TextField label="Prénom / pseudo" value={data.username} onChangeText={(v) => data.update({ username: v })} placeholder="Adrien" />
      <TextField
        label={`Âge (${MINIMUM_AGE} ans minimum)`}
        value={data.age}
        onChangeText={(v) => data.update({ age: v })}
        keyboardType="number-pad"
        placeholder="16"
      />
      <TextField
        label="Taille (cm)"
        value={data.height_cm}
        onChangeText={(v) => data.update({ height_cm: v })}
        keyboardType="number-pad"
        placeholder="178"
      />
      <TextField label="Club" value={data.club} onChangeText={(v) => data.update({ club: v })} placeholder="Nom de ton club (optionnel)" />
      <TextField
        label="Expérience (années)"
        value={data.experience_years}
        onChangeText={(v) => data.update({ experience_years: v })}
        keyboardType="number-pad"
        placeholder="3"
      />

      <Text style={{ color: theme.textMuted, fontSize: 13, fontWeight: "600", marginBottom: spacing.xs }}>
        Fréquence d'entraînement
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.lg }}>
        {TRAINING_FREQUENCIES.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            selected={data.training_frequency === f.value}
            onPress={() => data.update({ training_frequency: f.value })}
          />
        ))}
      </View>

      {error ? <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text> : null}

      <Button label="Continuer" onPress={handleNext} />
    </ScreenContainer>
  );
}
