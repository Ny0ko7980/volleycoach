import { useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { Link, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { useAppTheme } from "@/hooks/useAppTheme";
import { LEGAL_URLS, MINIMUM_AGE } from "@/constants/legal";
import { spacing } from "@/constants/theme";

export default function RegisterScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    setError(null);
    if (!username || !email || !password) {
      setError("Tous les champs sont obligatoires.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (!data.session) {
      // Confirmation email requise selon la config Supabase du projet.
      router.replace("/(auth)/login");
      return;
    }
    router.replace("/(onboarding)/welcome");
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Créer un compte</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Rejoins Coach Volley et commence à progresser.
        </Text>
      </View>

      <TextField label="Pseudo" value={username} onChangeText={setUsername} placeholder="Ton pseudo" />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="toi@exemple.com"
      />
      <TextField
        label="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Au moins 6 caractères"
      />
      {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : null}

      <Button label="Créer mon compte" onPress={handleRegister} loading={loading} />

      {/* Apple comme Google demandent que les conditions et la politique de
          confidentialité soient accessibles au moment de la création du compte,
          pas seulement enfouies dans les réglages. */}
      <Text style={[styles.legal, { color: theme.textMuted }]}>
        En créant un compte, tu confirmes avoir {MINIMUM_AGE} ans ou plus et acceptes les{" "}
        <Text
          style={{ color: theme.primary, fontWeight: "700" }}
          onPress={() => void Linking.openURL(LEGAL_URLS.terms)}
        >
          conditions d'utilisation
        </Text>{" "}
        et la{" "}
        <Text
          style={{ color: theme.primary, fontWeight: "700" }}
          onPress={() => void Linking.openURL(LEGAL_URLS.privacy)}
        >
          politique de confidentialité
        </Text>
        .
      </Text>

      <View style={styles.footer}>
        <Text style={{ color: theme.textMuted }}>Déjà un compte ? </Text>
        <Link href="/(auth)/login" style={{ color: theme.primary, fontWeight: "700" }}>
          Se connecter
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  legal: { fontSize: 12, lineHeight: 18, marginTop: spacing.md, textAlign: "center" },
  header: { marginTop: spacing.xxl, marginBottom: spacing.xl },
  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { fontSize: 14, marginTop: spacing.xs },
  errorText: { marginBottom: spacing.md, fontSize: 13 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.xl },
});
