import type { PropsWithChildren } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { radius, spacing } from "@/design/tokens/space";

export interface SurfaceProps extends PropsWithChildren {
  /** `base` pose sur le sol ; `high` pose sur une autre surface. */
  tone?: "base" | "high";
  /** `card` pour un bloc de contenu, `control` pour un élément manipulable. */
  shape?: "card" | "control";
  /** `false` pour un contenu qui gère lui-même ses marges (liste, image). */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Une surface posée sur le sol, délimitée par un trait.
 *
 * C'est la seule façon de faire un bloc dans Orvadin : pas d'ombre, pas de
 * dégradé, pas de bordure colorée pour « faire ressortir ». Deux tons, deux
 * formes, et c'est tout. Si un bloc a besoin de plus, c'est que ce n'est pas
 * une surface mais un composant à nommer.
 */
export function Surface({ tone = "base", shape = "card", padded = true, style, children }: SurfaceProps) {
  const { theme } = useAppTheme();
  return (
    <View
      style={[
        {
          backgroundColor: tone === "high" ? theme.surfaceHigh : theme.surface,
          borderColor: tone === "high" ? theme.lineStrong : theme.line,
          borderWidth: 1,
          borderRadius: radius[shape],
          padding: padded ? spacing.lg : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
