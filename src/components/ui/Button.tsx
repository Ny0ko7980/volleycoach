import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { radius, spacing } from "@/constants/theme";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function Button({ label, onPress, variant = "primary", loading, disabled, fullWidth = true }: Props) {
  const { theme } = useAppTheme();
  const isDisabled = disabled || loading;

  const backgrounds: Record<string, string> = {
    primary: theme.primary,
    secondary: theme.secondary,
    outline: "transparent",
    ghost: "transparent",
  };
  const textColors: Record<string, string> = {
    primary: "#FFFFFF",
    secondary: "#FFFFFF",
    outline: theme.primary,
    ghost: theme.textMuted,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        fullWidth && styles.fullWidth,
        {
          backgroundColor: backgrounds[variant],
          borderWidth: variant === "outline" ? 1.5 : 0,
          borderColor: theme.primary,
          opacity: pressed ? 0.85 : isDisabled ? 0.5 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} />
      ) : (
        <Text style={[styles.label, { color: textColors[variant] }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  fullWidth: { alignSelf: "stretch" },
  label: { fontSize: 16, fontWeight: "700" },
});
