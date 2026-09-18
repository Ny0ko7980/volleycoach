import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { spacing } from "@/constants/theme";

export function LoadingView({ label = "Chargement..." }: { label?: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator color={theme.primary} size="large" />
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl },
  label: { marginTop: spacing.md, fontSize: 14 },
});
