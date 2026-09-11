import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Inbox } from "lucide-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { Button } from "./Button";
import { spacing } from "@/constants/theme";

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: Props) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: theme.surfaceAlt }]}>
        {icon ?? <Inbox size={26} color={theme.textMuted} />}
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {description ? <Text style={[styles.description, { color: theme.textMuted }]}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  description: { fontSize: 14, textAlign: "center", marginTop: spacing.xs },
  action: { marginTop: spacing.lg, minWidth: 200 },
});
