import { Pressable, StyleSheet, Text, View } from "react-native";
import { Dumbbell, ChevronRight } from "lucide-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { radius, spacing, typography } from "@/constants/theme";

interface Props {
  label: string;
  onPress: () => void;
}

/**
 * Proposition de séance jointe à une réponse du coach.
 *
 * Le texte de la réponse propose déjà de construire une séance ; ce bouton
 * évite au joueur d'avoir à ressortir du chat et à re-sélectionner lui-même la
 * compétence dont on vient de parler.
 */
export function SessionSuggestion({ label, onPress }: Props) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Créer une séance sur ${label}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.primaryMuted, borderColor: theme.primary, opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: theme.surface }]}>
        <Dumbbell size={16} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyStrong, { color: theme.primary }]}>Créer une séance</Text>
        <Text style={[typography.caption, { color: theme.textMuted, marginTop: 2 }]} numberOfLines={1}>
          Ciblée sur {label}, adaptée à ton poste et ton niveau
        </Text>
      </View>
      <ChevronRight size={18} color={theme.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
});
