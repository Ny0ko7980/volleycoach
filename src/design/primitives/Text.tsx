import { Text as NativeText, type TextProps as NativeTextProps, type TextStyle } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { typography, type TypographyVariant } from "@/design/tokens/type";
import type { AppColors } from "@/design/tokens/color";

/** Rôles de couleur de texte : jamais une valeur, toujours un rôle. */
export type TextTone = "text" | "muted" | "faint" | "accent" | "ink" | "success" | "warning" | "danger";

const toneKey: Record<TextTone, keyof AppColors> = {
  text: "text",
  muted: "textMuted",
  faint: "textFaint",
  accent: "accent",
  ink: "accentInk",
  success: "success",
  warning: "warning",
  danger: "danger",
};

export interface TextProps extends NativeTextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  align?: TextStyle["textAlign"];
}

/**
 * Le seul composant texte de la refonte.
 *
 * Il ne prend ni `fontSize` ni `fontWeight` : il prend un `variant`, qui
 * porte la famille, la graisse, la taille et l'interligne ensemble. C'est ce
 * qui empêche de recréer les 103 tailles écrites à la main relevées à l'audit.
 * Un `style` reste possible pour les marges ; y remettre une taille ou une
 * graisse est une erreur de relecture.
 */
export function Text({ variant = "body", tone = "text", align, style, ...rest }: TextProps) {
  const { theme } = useAppTheme();
  return (
    <NativeText
      {...rest}
      style={[typography[variant], { color: theme[toneKey[tone]] }, align ? { textAlign: align } : null, style]}
    />
  );
}
