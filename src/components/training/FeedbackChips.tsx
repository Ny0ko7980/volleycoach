import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { FEEDBACK_OPTIONS } from "@/constants/skills";
import { radius, spacing, typography } from "@/constants/theme";
import type { FeedbackRating } from "@/types/database";

interface Props {
  value: FeedbackRating | null;
  onChange: (rating: FeedbackRating) => void;
  disabled?: boolean;
}

/**
 * Sélecteur de ressenti : quatre cibles tactiles sur une seule ligne, pour
 * qu'un joueur essoufflé puisse répondre d'un pouce sans viser.
 */
export function FeedbackChips({ value, onChange, disabled }: Props) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.row}>
      {FEEDBACK_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: selected ? theme.primaryMuted : theme.surfaceAlt,
                borderColor: selected ? theme.primary : "transparent",
                opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={styles.icon}>{option.icon}</Text>
            <Text
              numberOfLines={1}
              style={[typography.caption, { color: selected ? theme.primary : theme.textMuted, fontWeight: "700" }]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.xs },
  chip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  icon: { fontSize: 18, marginBottom: 2 },
});
