import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { spacing } from "@/design/tokens/space";

export interface DividerProps {
  /**
   * Marque l'entame du trait d'un segment d'accent, comme la ligne des trois
   * mètres sur le terrain. Réservé aux séparateurs qui ouvrent une section ;
   * un trait de liste reste nu.
   */
  marked?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Le trait : l'unique moyen de séparer dans Orvadin.
 *
 * Un trait fin de la couleur « ligne ». Jamais d'ombre, jamais de bordure
 * épaisse ; l'élévation vient de la surface, la séparation vient d'ici.
 */
export function Divider({ marked, style }: DividerProps) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.row, style]}>
      {marked ? <View style={[styles.mark, { backgroundColor: theme.accent }]} /> : null}
      <View style={[styles.line, { backgroundColor: theme.line }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  mark: { width: 22, height: 3 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, minHeight: 1 },
});
