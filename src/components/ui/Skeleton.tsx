import { useEffect, useRef } from "react";
import { Animated, DimensionValue, StyleSheet, View } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { radius, spacing } from "@/constants/theme";

interface Props {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: object;
}

// Bloc de chargement "squelette" — pulsation douce, pas de spinner brut.
export function Skeleton({ width = "100%", height = 16, borderRadius: br = radius.sm, style }: Props) {
  const { theme } = useAppTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: br, backgroundColor: theme.surfaceAlt, opacity }, style]}
    />
  );
}

export function SkeletonCard() {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Skeleton width="60%" height={14} />
      <View style={{ height: spacing.sm }} />
      <Skeleton width="90%" height={20} />
      <View style={{ height: spacing.md }} />
      <Skeleton width="100%" height={10} borderRadius={5} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md },
});
