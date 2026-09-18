import { Pressable, StyleSheet, Text } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { radius, spacing } from "@/constants/theme";

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected, onPress }: Props) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.surfaceAlt,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}
    >
      <Text style={{ color: selected ? "#FFFFFF" : theme.textMuted, fontWeight: "600", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
});
