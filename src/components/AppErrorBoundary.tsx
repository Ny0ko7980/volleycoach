import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Updates from "expo-updates";
import type { ErrorBoundaryProps } from "expo-router";
import { Button } from "@/components/ui/Button";
import { useAppTheme } from "@/hooks/useAppTheme";
import { APP_NAME } from "@/constants/brand";
import { radius, spacing, typography } from "@/constants/theme";

/**
 * Dernier filet avant l'écran noir.
 *
 * Sans cette frontière, une exception levée pendant le rendu démonte l'arbre
 * React : en build de production, le joueur voit un écran figé de la couleur du
 * fond, sans message ni moyen de revenir. Il ne peut que tuer l'application.
 * Le risque n'est pas théorique — plusieurs écrans indexent des tableaux
 * construits à partir de valeurs venues de la base, et une valeur inattendue y
 * provoque une erreur au rendu.
 *
 * Deux sorties sont proposées, dans cet ordre :
 *  - « Réessayer », qui remonte l'écran fautif sans relancer l'application ;
 *  - « Redémarrer », qui recharge complètement le bundle.
 *
 * Le message technique reste affiché, replié en bas : c'est ce qui rend un
 * retour de testeur exploitable. En bêta, une capture d'écran vaut mieux
 * qu'« ça a planté ».
 */
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { theme } = useAppTheme();

  async function restart() {
    try {
      await Updates.reloadAsync();
    } catch {
      // Indisponible en développement (Expo Go, serveur Metro) : dans ce cas on
      // se rabat sur le remontage, qui ne dépend de rien.
      await retry();
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[typography.titleXL, { color: theme.text }]}>Quelque chose a lâché</Text>
        <Text style={[typography.body, { color: theme.textMuted, marginTop: spacing.sm }]}>
          {APP_NAME} a rencontré une erreur sur cet écran. Tes données ne sont pas perdues : ce qui était
          enregistré l'est toujours, et ce qui attendait une connexion attend encore.
        </Text>

        <View style={{ marginTop: spacing.xl }}>
          <Button label="Réessayer" onPress={() => void retry()} />
          <View style={{ height: spacing.sm }} />
          <Button label="Redémarrer l'application" variant="outline" onPress={() => void restart()} />
        </View>

        <View style={[styles.details, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <Text style={[typography.eyebrow, { color: theme.textMuted }]}>DÉTAIL TECHNIQUE</Text>
          <Text style={[typography.caption, { color: theme.textMuted, marginTop: spacing.xs }]} selectable>
            {error.message || "Erreur sans message."}
          </Text>
        </View>
        <Text style={[typography.caption, { color: theme.textFaint, marginTop: spacing.md }]}>
          Si l'erreur revient, envoie une capture de ce bloc : c'est ce qui permet de la corriger.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.screenPadding, paddingTop: spacing.xxl, flexGrow: 1 },
  details: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
