import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { radius, spacing, typography } from "@/constants/theme";

interface Props {
  icon: ReactNode;
  title: string;
  description: string;
  /** Met la tuile en avant : fond teinté et titre en couleur primaire. */
  highlighted?: boolean;
  onPress: () => void;
}

/** Action principale de l'écran Entraînement, façon grande tuile tactile. */
export function ChoiceTile({ icon, title, description, highlighted, onPress }: Props) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: highlighted ? theme.primaryMuted : theme.surface,
          borderColor: highlighted ? theme.primary : theme.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: highlighted ? theme.surface : theme.surfaceAlt }]}>
        {icon}
      </View>
      <View style={styles.texts}>
        <Text style={[typography.bodyStrong, { color: highlighted ? theme.primary : theme.text }]}>{title}</Text>
        <Text style={[typography.caption, { color: theme.textMuted, marginTop: 2 }]}>{description}</Text>
      </View>
      <ChevronRight size={18} color={highlighted ? theme.primary : theme.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  texts: { flex: 1 },
});
