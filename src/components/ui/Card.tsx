import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { radius, shadow, spacing } from "@/constants/theme";

interface Props extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  elevation?: "sm" | "md";
  noPadding?: boolean;
}

export function Card({ children, style, elevation = "sm", noPadding }: Props) {
  const { theme } = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        shadow[elevation],
        { backgroundColor: theme.surface, borderColor: theme.border },
        noPadding && styles.noPadding,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  noPadding: { padding: 0 },
});
