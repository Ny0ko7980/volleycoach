/**
 * Design system d'Orvadin : point d'entrée.
 *
 * Tokens (couleurs, typographie, espacements, formes, mouvement) et
 * primitives (Text, Stack, Divider, Surface). Les composants de `components/`
 * se construisent dessus ; les écrans se construisent sur les composants.
 * Aucune couleur, taille ou rayon ne s'écrit ailleurs qu'ici.
 */
export * from "./tokens";
export { Text, type TextProps, type TextTone } from "./primitives/Text";
export { Stack, type StackProps } from "./primitives/Stack";
export { Divider, type DividerProps } from "./primitives/Divider";
export { Surface, type SurfaceProps } from "./primitives/Surface";
