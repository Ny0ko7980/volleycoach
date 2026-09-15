import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { radius, spacing, typography } from "@/constants/theme";

interface Props {
  label: string;
  /** Légendes des extrêmes, pour que « 1 » et « 5 » veuillent dire quelque chose. */
  lowLabel: string;
  highLabel: string;
  value: number | null;
  onChange: (value: number) => void;
}

const VALUES = [1, 2, 3, 4, 5];

/** Échelle 1-5 en cinq boutons, saisissable d'un seul geste en fin de séance. */
export function ScaleSelector({ label, lowLabel, highLabel, value, onChange }: Props) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.block}>
      <Text style={[typography.bodyStrong, { color: theme.text, marginBottom: spacing.sm }]}>{label}</Text>
      <View style={styles.row}>
        {VALUES.map((item) => {
          const selected = value === item;
          return (
            <Pressable
              key={item}
              onPress={() => onChange(item)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label} : ${item} sur 5`}
              style={({ pressed }) => [
                styles.dot,
                {
                  backgroundColor: selected ? theme.primary : theme.surfaceAlt,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[typography.bodyStrong, { color: selected ? "#FFFFFF" : theme.textMuted }]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legend}>
        <Text style={[typography.caption, { color: theme.textFaint }]}>{lowLabel}</Text>
        <Text style={[typography.caption, { color: theme.textFaint }]}>{highLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: spacing.lg },
  row: { flexDirection: "row", gap: spacing.sm },
  dot: { flex: 1, height: 44, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  legend: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
});
