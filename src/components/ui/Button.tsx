import { ReactNode, useRef } from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/hooks/useAppTheme";
import { radius, spacing, typography } from "@/constants/theme";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  size?: "default" | "compact";
}

export function Button({
  label,
  onPress,
  variant = "primary",
  loading,
  disabled,
  fullWidth = true,
  icon,
  size = "default",
}: Props) {
  const { theme } = useAppTheme();
  const isDisabled = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;

  const backgrounds: Record<Variant, string> = {
    primary: theme.primary,
    secondary: theme.surfaceAlt,
    outline: "transparent",
    ghost: "transparent",
    danger: theme.danger,
  };
  const textColors: Record<Variant, string> = {
    primary: "#FFFFFF",
    secondary: theme.text,
    outline: theme.primary,
    ghost: theme.textMuted,
    danger: "#FFFFFF",
  };

  function animateTo(value: number) {
    Animated.timing(scale, { toValue: value, duration: 100, useNativeDriver: true }).start();
  }

  function handlePress() {
    if (isDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onPress();
  }

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, { transform: [{ scale }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        onPress={handlePress}
        onPressIn={() => !isDisabled && animateTo(0.97)}
        onPressOut={() => animateTo(1)}
        disabled={isDisabled}
        style={[
          styles.button,
          size === "compact" && styles.buttonCompact,
          fullWidth && styles.fullWidth,
          {
            backgroundColor: backgrounds[variant],
            borderWidth: variant === "outline" ? 1 : 0,
            borderColor: theme.border,
            opacity: isDisabled ? 0.45 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColors[variant]} />
        ) : (
          <View style={styles.content}>
            {icon}
            <Text style={[typography.bodyStrong, styles.label, { color: textColors[variant] }]}>{label}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  buttonCompact: { minHeight: 44, borderRadius: radius.lg, paddingHorizontal: spacing.md },
  fullWidth: { alignSelf: "stretch" },
  content: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  label: { textAlign: "center" },
});
