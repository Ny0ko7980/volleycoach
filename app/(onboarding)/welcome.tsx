import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Button } from "@/components/ui/Button";
import { useAppTheme } from "@/hooks/useAppTheme";
import { spacing } from "@/constants/theme";

export default function WelcomeScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.emoji}>🏐</Text>
        <Text style={[styles.title, { color: theme.text }]}>Bienvenue sur Coach Volley</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          En 4 étapes rapides, on personnalise ton expérience: poste, niveau et objectifs pour te proposer les bons
          exercices dès aujourd'hui.
        </Text>
      </View>
      <Button label="Commencer" onPress={() => router.push("/(onboarding)/profile-info")} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", marginTop: spacing.xxl, marginBottom: spacing.xxl },
  emoji: { fontSize: 64, marginBottom: spacing.lg },
  title: { fontSize: 26, fontWeight: "800", textAlign: "center" },
  subtitle: { fontSize: 15, textAlign: "center", marginTop: spacing.md, lineHeight: 22 },
});
