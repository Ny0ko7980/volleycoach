import { useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { useAppTheme } from "@/hooks/useAppTheme";
import { spacing } from "@/constants/theme";

export default function ForgotPasswordScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    setError(null);
    if (!email) {
      setError("Renseigne ton email.");
      return;
    }
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "coachvolley://auth/reset-password",
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Mot de passe oublié</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          On t'envoie un lien de réinitialisation par email.
        </Text>
      </View>

      {sent ? (
        <Text style={{ color: theme.success, marginBottom: spacing.lg }}>
          Email envoyé ! Vérifie ta boîte de réception.
        </Text>
      ) : (
        <>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="toi@exemple.com"
          />
          {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : null}
          <Button label="Envoyer le lien" onPress={handleReset} loading={loading} />
        </>
      )}

      <Button label="Retour à la connexion" variant="ghost" onPress={() => router.replace("/(auth)/login")} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xxl, marginBottom: spacing.xl },
  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { fontSize: 14, marginTop: spacing.xs },
  errorText: { marginBottom: spacing.md, fontSize: 13 },
});
