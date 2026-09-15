import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { spacing } from "@/constants/theme";

export function StepHeader({ step, total, title, subtitle }: { step: number; total: number; title: string; subtitle?: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.wrapper}>
      <ProgressBar percent={(step / total) * 100} />
      <Text style={[styles.step, { color: theme.textMuted }]}>
        Étape {step} / {total}
      </Text>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: spacing.lg, marginBottom: spacing.xl },
  step: { fontSize: 12, fontWeight: "700", marginTop: spacing.sm, marginBottom: spacing.xs },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { fontSize: 14, marginTop: spacing.xs },
});
