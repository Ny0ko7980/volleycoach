import type { PropsWithChildren } from "react";
import { View, type FlexAlignType, type StyleProp, type ViewStyle } from "react-native";
import { spacing } from "@/design/tokens/space";

export interface StackProps extends PropsWithChildren {
  direction?: "column" | "row";
  /** Espace entre les enfants, sur la grille. */
  gap?: keyof typeof spacing;
  align?: FlexAlignType;
  justify?: ViewStyle["justifyContent"];
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Empilement, vertical ou horizontal, avec un espacement de la grille.
 *
 * Remplace les 34 styles `*Row` locaux relevés à l'audit : un alignement ne
 * se réécrit pas, il se nomme.
 */
export function Stack({ direction = "column", gap, align, justify, wrap, style, children }: StackProps) {
  return (
    <View
      style={[
        {
          flexDirection: direction,
          gap: gap ? spacing[gap] : undefined,
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? "wrap" : undefined,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
