import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { radius, spacing, typography } from "@/constants/theme";

/**
 * Écran affiché quand l'app est lancée sans sa configuration Supabase.
 *
 * Il ne doit dépendre de rien d'autre que du thème : c'est précisément la
 * situation où le reste de l'application ne peut pas fonctionner. Aucune valeur
 * de configuration n'est affichée — uniquement les NOMS des variables
 * manquantes, jamais leur contenu.
 */
export function ConfigErrorView({ missing }: { missing: string[] }) {
  const { theme } = useAppTheme();
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[typography.titleXL, styles.title, { color: theme.text }]}>
        Configuration incomplète
      </Text>

      <Text style={[styles.paragraph, { color: theme.textMuted }]}>
        Coach Volley n&apos;a pas pu se connecter à sa base de données : ce build
        a été compilé sans ses variables d&apos;environnement. L&apos;application
        ne peut pas démarrer tant qu&apos;elles ne sont pas définies.
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.danger },
        ]}
      >
        <Text style={[typography.titleM, { color: theme.text }]}>
          {missing.length > 1 ? "Variables manquantes" : "Variable manquante"}
        </Text>
        {missing.map((name) => (
          <Text key={name} style={[styles.varName, { color: theme.danger }]}>
            {name}
          </Text>
        ))}
      </View>

      <Text style={[styles.paragraph, { color: theme.textMuted }]}>
        Si tu es en développement, copie{" "}
        <Text style={{ color: theme.text }}>.env.example</Text> vers{" "}
        <Text style={{ color: theme.text }}>.env</Text>, renseigne ces valeurs,
        puis relance le serveur Expo.
      </Text>

      <Text style={[styles.paragraph, { color: theme.textMuted }]}>
        S&apos;il s&apos;agit d&apos;un build TestFlight, ces variables doivent
        être définies dans l&apos;environnement EAS correspondant avant de
        relancer le build : elles sont figées au moment de la compilation.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.screenPadding,
    gap: spacing.lg,
  },
  title: { marginBottom: spacing.xs },
  paragraph: { fontSize: 15, lineHeight: 22 },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  varName: { fontSize: 14, fontWeight: "700", letterSpacing: 0.2 },
});
