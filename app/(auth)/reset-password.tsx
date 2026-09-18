import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { LoadingView } from "@/components/ui/LoadingView";
import { useAppTheme } from "@/hooks/useAppTheme";
import { spacing } from "@/constants/theme";

/**
 * Cible du lien de réinitialisation envoyé par `resetPasswordForEmail`
 * (voir forgot-password.tsx : redirectTo = coachvolley://auth/reset-password).
 *
 * Cette route manquait : le lien reçu par email ouvrait bien l'application,
 * mais sur une route inexistante. Le parcours « mot de passe oublié » était
 * donc interrompu à sa dernière étape.
 *
 * Supabase renvoie les jetons dans le FRAGMENT de l'URL (#access_token=…),
 * pas dans la query string, parce que le client est configuré en flux
 * implicite. `useLocalSearchParams` d'expo-router ne voit pas le fragment :
 * on lit donc l'URL brute avec expo-linking et on l'analyse nous-mêmes. Le
 * flux PKCE (?code=…) est géré aussi, au cas où la configuration du projet
 * changerait.
 */

type Status = "verification" | "pret" | "invalide" | "termine";

function parseFragment(url: string): Record<string, string> {
  const hash = url.split("#")[1];
  if (!hash) return {};
  const out: Record<string, string> = {};
  for (const pair of hash.split("&")) {
    const [key, value] = pair.split("=");
    if (key && value) out[decodeURIComponent(key)] = decodeURIComponent(value);
  }
  return out;
}

export default function ResetPasswordScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const url = Linking.useURL();

  const [status, setStatus] = useState<Status>("verification");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;

    (async () => {
      // Une session déjà ouverte suffit : c'est le cas quand Supabase a pu
      // établir la session avant l'arrivée sur cet écran.
      const { data } = await supabase.auth.getSession();
      if (annule) return;
      if (data.session) {
        setStatus("pret");
        return;
      }

      if (!url) return; // l'URL arrive de façon asynchrone au démarrage à froid

      const fragment = parseFragment(url);
      const accessToken = fragment.access_token;
      const refreshToken = fragment.refresh_token;

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (annule) return;
        setStatus(sessionError ? "invalide" : "pret");
        return;
      }

      const code = Linking.parse(url).queryParams?.code;
      if (typeof code === "string") {
        const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
        if (annule) return;
        setStatus(codeError ? "invalide" : "pret");
        return;
      }

      setStatus("invalide");
    })();

    return () => {
      annule = true;
    };
  }, [url]);

  async function handleUpdate() {
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setStatus("termine");
  }

  if (status === "verification") {
    return <LoadingView label="Vérification du lien..." />;
  }

  if (status === "invalide") {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Lien expiré</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Ce lien de réinitialisation n&apos;est plus valide. Les liens expirent au bout
            d&apos;une heure et ne servent qu&apos;une fois. Demandes-en un nouveau.
          </Text>
        </View>
        <Button label="Demander un nouveau lien" onPress={() => router.replace("/(auth)/forgot-password")} />
        <Button label="Retour à la connexion" variant="ghost" onPress={() => router.replace("/(auth)/login")} />
      </ScreenContainer>
    );
  }

  if (status === "termine") {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Mot de passe modifié</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Tu peux maintenant te connecter avec ton nouveau mot de passe.
          </Text>
        </View>
        <Button label="Aller à la connexion" onPress={() => router.replace("/(auth)/login")} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Nouveau mot de passe</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Choisis un mot de passe d&apos;au moins 8 caractères.
        </Text>
      </View>

      <TextField
        label="Nouveau mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        placeholder="••••••••"
      />
      <TextField
        label="Confirmation"
        value={confirmation}
        onChangeText={setConfirmation}
        secureTextEntry
        autoCapitalize="none"
        placeholder="••••••••"
      />

      {error ? <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text> : null}

      <Button label="Enregistrer" onPress={handleUpdate} loading={loading} />
      <Button label="Annuler" variant="ghost" onPress={() => router.replace("/(auth)/login")} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.xxl, marginBottom: spacing.xl },
  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { fontSize: 14, marginTop: spacing.xs, lineHeight: 20 },
  errorText: { marginBottom: spacing.md, fontSize: 13 },
});
