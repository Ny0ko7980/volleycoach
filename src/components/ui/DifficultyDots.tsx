import { StyleSheet, View } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";

interface Props {
  value: number; // 1-5
  max?: number;
}

// Indicateur de difficulté — points pleins/vides plutôt qu'un symbole
// Unicode (★), pour rester cohérent avec la bibliothèque d'icônes vectorielle.
export function DifficultyDots({ value, max = 5 }: Props) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.row}>
      {Array.from({ length: max }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: i < value ? theme.primary : theme.border },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
