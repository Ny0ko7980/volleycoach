import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Button } from "@/components/ui/Button";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useOnboardingStore } from "@/store/onboardingStore";
import { OBJECTIVES } from "@/constants/positions";
import { spacing } from "@/constants/theme";

export default function GoalsScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const data = useOnboardingStore();
  const [error, setError] = useState<string | null>(null);

  function handleNext() {
    if (data.goals.length === 0) {
      setError("Sélectionne au moins un objectif.");
      return;
    }
    setError(null);
    router.push("/(onboarding)/summary");
  }

  return (
    <ScreenContainer>
      <StepHeader step={4} total={4} title="Quels sont tes objectifs ?" subtitle="Tu peux en choisir plusieurs." />

      <View style={styles.grid}>
        {OBJECTIVES.map((o) => {
          const selected = data.goals.includes(o.value);
          return (
            <Pressable
              key={o.value}
              onPress={() => data.toggleGoal(o.value)}
              style={[
                styles.option,
                { backgroundColor: selected ? theme.primaryMuted : theme.surface, borderColor: selected ? theme.primary : theme.border },
              ]}
            >
              <Text style={styles.icon}>{o.icon}</Text>
              <Text style={[styles.label, { color: theme.text }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text> : null}

      <Button label="Continuer" onPress={handleNext} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  grid: { marginBottom: spacing.md },
  option: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  icon: { fontSize: 20, marginRight: spacing.md },
  label: { fontSize: 15, fontWeight: "600", flex: 1 },
});
