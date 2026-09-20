import { ReactNode, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/hooks/useAppTheme";

interface Props {
  icon: ReactNode;
  onPress: () => void;
  variant?: "default" | "filled";
  size?: number;
  accessibilityLabel: string;
  disabled?: boolean;
}

// Bouton icône seule — réglages, envoi, fermeture. Toujours avec un label
// d'accessibilité explicite (jamais d'icône muette pour VoiceOver/TalkBack).
export function IconButton({ icon, onPress, variant = "default", size = 40, accessibilityLabel, disabled }: Props) {
  const { theme } = useAppTheme();
  const scale = useRef(new Animated.Value(1)).current;

  function animateTo(value: number) {
    Animated.timing(scale, { toValue: value, duration: 100, useNativeDriver: true }).start();
  }

  function handlePress() {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onPress();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        onPress={handlePress}
        onPressIn={() => !disabled && animateTo(0.92)}
        onPressOut={() => animateTo(1)}
        disabled={disabled}
        style={[
          styles.base,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: variant === "filled" ? theme.primary : theme.surfaceAlt,
            opacity: disabled ? 0.4 : 1,
          },
        ]}
      >
        {icon}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
});
