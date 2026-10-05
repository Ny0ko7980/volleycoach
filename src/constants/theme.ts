/**
 * Pont de compatibilité vers le design system.
 *
 * Le système vit dans `src/design/` ; ce fichier ne fait que le réexporter
 * sous les noms que les 31 écrans et 36 composants importent déjà. Changer
 * une valeur ici serait une erreur : il n'y a aucune valeur ici.
 *
 * Il disparaîtra quand le dernier import de `@/constants/theme` aura été
 * remplacé par `@/design`.
 */
export {
  darkColors as darkTheme,
  lightColors as lightTheme,
  spacing,
  radius,
  iconSize,
  shadow,
  gradient,
  motion,
  typography,
} from "@/design/tokens";
export type { AppColors as AppTheme } from "@/design/tokens";
