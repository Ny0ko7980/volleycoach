import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Button } from "@/components/ui/Button";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useOnboardingStore } from "@/store/onboardingStore";
import { POSITIONS } from "@/constants/positions";
import { spacing } from "@/constants/theme";

export default function PositionScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const data = useOnboardingStore();
  const [error, setError] = useState<string | null>(null);

  function handleNext() {
    if (!data.position) {
      setError("Sélectionne ton poste.");
      return;
    }
    setError(null);
    router.push("/(onboarding)/level");
  }

  return (
    <ScreenContainer>
      <StepHeader step={2} total={4} title="Quel est ton poste ?" subtitle="Les exercices proposés s'adaptent à ton poste." />

      {POSITIONS.map((p) => {
        const selected = data.position === p.value;
        return (
          <Pressable
            key={p.value}
            onPress={() => data.update({ position: p.value })}
            style={[
              styles.option,
              { backgroundColor: selected ? theme.primaryMuted : theme.surface, borderColor: selected ? theme.primary : theme.border },
            ]}
          >
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <Text style={styles.badgeText}>{p.short}</Text>
            </View>
            <Text style={[styles.label, { color: theme.text }]}>{p.label}</Text>
          </Pressable>
        );
      })}

      {error ? <Text style={{ color: theme.danger, marginBottom: spacing.md }}>{error}</Text> : null}

      <View style={{ marginTop: spacing.lg }}>
        <Button label="Continuer" onPress={handleNext} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  badge: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  badgeText: { color: "#FFF", fontWeight: "800", fontSize: 12 },
  label: { fontSize: 16, fontWeight: "600" },
});
