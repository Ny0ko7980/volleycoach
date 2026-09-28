import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { CloudOff, RefreshCw, TriangleAlert } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useSyncStore } from "@/store/syncStore";
import { radius, spacing, typography } from "@/constants/theme";

/**
 * Dit au joueur où en sont ses données.
 *
 * Sans cet affichage, « enregistré hors-ligne » est une promesse que rien ne
 * vient confirmer : le joueur ne sait pas si sa séance est partie, ni si
 * quelque chose bloque. Deux états distincts, parce qu'ils n'appellent pas la
 * même réaction :
 *
 *  - en attente : normal dans un gymnase sans réseau, aucune action requise ;
 *  - problème de synchronisation : anormal, le joueur peut réessayer.
 *
 * Rien ne s'affiche quand la file est vide, pour ne pas encombrer l'écran.
 *
 * Positionné en surimpression au-dessus de la barre d'onglets plutôt que dans
 * le flux : apparaître dans le flux décalerait tous les écrans vers le bas et
 * ferait compter deux fois l'encoche (chaque écran gère déjà sa zone sûre).
 */
export function SyncStatusBanner() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { pending, failed, syncing, syncNow, retryFailed } = useSyncStore();

  if (pending === 0 && failed === 0) return null;

  const hasProblem = failed > 0;
  const tint = hasProblem ? theme.danger : theme.warning;

  const label = hasProblem
    ? `${failed} ${failed > 1 ? "actions n'ont pas pu être envoyées" : "action n'a pas pu être envoyée"}`
    : `${pending} ${pending > 1 ? "actions en attente d'envoi" : "action en attente d'envoi"}`;

  const hint = hasProblem
    ? "Tes données sont conservées sur ton téléphone. Touche pour réessayer."
    : syncing
      ? "Envoi en cours…"
      : "Elles partiront dès que la connexion revient.";

  return (
    <Pressable
      onPress={() => void (hasProblem ? retryFailed() : syncNow())}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${hint}`}
      style={[
        styles.container,
        { backgroundColor: theme.surfaceAlt, borderColor: tint, bottom: insets.bottom + TAB_BAR_CLEARANCE },
      ]}
    >
      <View style={styles.icon}>
        {syncing ? (
          <ActivityIndicator size="small" color={tint} />
        ) : hasProblem ? (
          <TriangleAlert size={18} color={tint} />
        ) : (
          <CloudOff size={18} color={tint} />
        )}
      </View>
      <View style={styles.text}>
        <Text style={[typography.bodySecondaryStrong, { color: theme.text }]}>{label}</Text>
        <Text style={[typography.caption, { color: theme.textMuted }]}>{hint}</Text>
      </View>
      {!syncing && <RefreshCw size={16} color={theme.textMuted} />}
    </Pressable>
  );
}

// Hauteur approximative de la barre d'onglets : le bandeau se place
// au-dessus d'elle plutôt que derrière.
const TAB_BAR_CLEARANCE = 64;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.screenPadding,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  icon: { width: 20, alignItems: "center" },
  text: { flex: 1, gap: 2 },
});
