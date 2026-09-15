import { useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { Link, useRouter } from "expo-router";
import { Volleyball } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { useAppTheme } from "@/hooks/useAppTheme";
import { spacing, typography } from "@/constants/theme";

export default function LoginScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    if (!email || !password) {
      setError("Renseigne ton email et ton mot de passe.");
      return;
    }
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(traduireErreur(signInError.message));
      return;
    }
    router.replace("/(tabs)");
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={[styles.logoWrap, { backgroundColor: theme.primaryMuted }]}>
          <Volleyball size={28} color={theme.primary} />
        </View>
        <Text style={[typography.titleXL, { color: theme.text }]}>Coach Volley</Text>
        <Text style={[typography.bodySecondary, styles.subtitle, { color: theme.textMuted }]}>Ton coach de volley-ball dans ta poche</Text>
      </View>

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
        placeholder="••••••••"
      />
      {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : null}

      <Button label="Se connecter" onPress={handleLogin} loading={loading} />

      <Link href="/(auth)/forgot-password" style={[styles.link, { color: theme.textMuted }]}>
        Mot de passe oublié ?
      </Link>

      <View style={styles.footer}>
        <Text style={{ color: theme.textMuted }}>Pas encore de compte ? </Text>
        <Link href="/(auth)/register" style={{ color: theme.primary, fontWeight: "700" }}>
          Créer un compte
        </Link>
      </View>
    </ScreenContainer>
  );
}

function traduireErreur(message: string): string {
  if (message.includes("Invalid login credentials")) return "Email ou mot de passe incorrect.";
  if (message.includes("Email not confirmed")) return "Confirme ton email avant de te connecter.";
  return message;
}

const styles = StyleSheet.create({
  header: { alignItems: "center", marginTop: spacing.xxl, marginBottom: spacing.xxl },
  logoWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  subtitle: { marginTop: spacing.xs },
  errorText: { marginBottom: spacing.md, fontSize: 13 },
  link: { textAlign: "center", marginTop: spacing.lg, fontSize: 13 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.xl },
});
