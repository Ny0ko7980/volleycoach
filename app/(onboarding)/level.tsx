import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Button } from "@/components/ui/Button";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useOnboardingStore } from "@/store/onboardingStore";
import { LEVELS } from "@/constants/positions";
import { spacing } from "@/constants/theme";

export default function LevelScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const data = useOnboardingStore();
  const [error, setError] = useState<string | null>(null);

  function handleNext() {
    if (!data.level) {
      setError("Sélectionne ton niveau.");
      return;
    }
    setError(null);
    router.push("/(onboarding)/goals");
  }

  return (
    <ScreenContainer>
      <StepHeader step={3} total={4} title="Quel est ton niveau ?" subtitle="On ajuste la difficulté des séances en conséquence." />

      {LEVELS.map((l) => {
        const selected = data.level === l.value;
        return (
          <Pressable
            key={l.value}
            onPress={() => data.update({ level: l.value })}
            style={[
              styles.option,
              { backgroundColor: selected ? theme.primaryMuted : theme.surface, borderColor: selected ? theme.primary : theme.border },
            ]}
          >
            <Text style={[styles.label, { color: theme.text }]}>{l.label}</Text>
          </Pressable>
        );
      })}

      {error ? <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text> : null}

      <Button label="Continuer" onPress={handleNext} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  option: { borderWidth: 1.5, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm },
  label: { fontSize: 16, fontWeight: "600" },
});
