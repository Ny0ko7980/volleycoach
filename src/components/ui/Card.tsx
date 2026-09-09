import { PropsWithChildren } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { radius, spacing } from "@/constants/theme";

interface Props extends PropsWithChildren {
  style?: ViewStyle;
}

export function Card({ children, style }: Props) {
  const { theme } = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
});
