import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { radius, spacing } from "@/constants/theme";

interface Props {
  label: string;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
}

export function Badge({ label, tone = "neutral" }: Props) {
  const { theme } = useAppTheme();
  const colors: Record<string, string> = {
    primary: theme.primary,
    success: theme.success,
    warning: theme.warning,
    danger: theme.danger,
    neutral: theme.textMuted,
  };
  const color = colors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: color + "22", borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: "flex-start",
  },
  text: { fontSize: 12, fontWeight: "700" },
});
