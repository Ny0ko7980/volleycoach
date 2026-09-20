import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Volleyball } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Button } from "@/components/ui/Button";
import { useAppTheme } from "@/hooks/useAppTheme";
import { spacing, typography } from "@/constants/theme";

export default function WelcomeScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={[styles.logoWrap, { backgroundColor: theme.primaryMuted }]}>
          <Volleyball size={36} color={theme.primary} />
        </View>
        <Text style={[typography.titleXL, styles.title, { color: theme.text }]}>Bienvenue sur Coach Volley</Text>
        <Text style={[typography.body, styles.subtitle, { color: theme.textMuted }]}>
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
  logoWrap: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  title: { textAlign: "center" },
  subtitle: { textAlign: "center", marginTop: spacing.md, lineHeight: 22 },
});
