/**
 * Couleurs d'Orvadin, piste « Parquet ».
 *
 * Le terrain de volley comme grammaire : un sol bleu-nuit (la teinte du
 * taraflex, pas un gris-noir neutre), des lignes nettes, et le rouge du logo
 * réservé à l'action. Tout le reste est trait et typographie.
 *
 * Deux règles que ces valeurs encodent, vérifiées par `npm run design:check` :
 *
 * 1. Un seul accent. Le rouge est aussi la couleur de l'erreur, donc la
 *    distinction se fait par la forme et non par la teinte : un bloc plein
 *    rouge est toujours une action ; une erreur est toujours du texte ou une
 *    icône rouge, jamais un bloc. Les actions destructrices passent en contour.
 * 2. L'encre sur l'accent est noire, pas blanche. Le blanc sur ce rouge donne
 *    3,6:1, sous le seuil lisible de 4,5:1 ; le noir atteint 5,1:1.
 *
 * Les anciennes clés (`primary`, `border`, `surfaceAlt`…) sont conservées et
 * pointent sur les mêmes valeurs que les nouvelles : les 31 écrans continuent
 * de compiler sans modification, et basculent d'apparence en même temps.
 */

export interface AppColors {
  // Sol et surfaces, du plus profond au plus proche.
  ground: string;
  surface: string;
  surfaceHigh: string;
  // Traits : le motif principal de séparation, jamais l'ombre.
  line: string;
  lineStrong: string;
  // Texte, trois niveaux, tous lisibles sur le sol et sur les surfaces.
  text: string;
  textMuted: string;
  textFaint: string;
  // L'accent, son encre, et sa version en fond teinté.
  accent: string;
  accentInk: string;
  accentSoft: string;
  // États : ne disent qu'un état, ne décorent jamais.
  success: string;
  warning: string;
  danger: string;
  // Chrome.
  tabBarBackground: string;
  overlay: string;

  // ── Alias conservés pour les écrans existants ──────────────────────────
  /** @deprecated utiliser `ground` */
  background: string;
  /** @deprecated utiliser `surfaceHigh` */
  surfaceAlt: string;
  /** @deprecated utiliser `surfaceHigh` */
  surfaceRaised: string;
  /** @deprecated utiliser `line` */
  border: string;
  /** @deprecated utiliser `accent` */
  primary: string;
  /** @deprecated utiliser `accentSoft` */
  primaryMuted: string;
  /** @deprecated il n'y a qu'un accent ; pointe sur `accent` */
  secondary: string;
  /** @deprecated utiliser `accent` */
  chartLine: string;
}

const dark = {
  ground: "#080B12",
  surface: "#111826",
  surfaceHigh: "#1A2334",
  line: "#24314A",
  lineStrong: "#2E3D58",
  text: "#F2F5FA",
  textMuted: "#9AA6BC",
  // 5,6:1 sur le sol. L'ancienne valeur (#6B7180) donnait 3,8:1 et servait
  // aux libellés d'onglets en 11 px : illisible pour beaucoup de joueurs.
  textFaint: "#7C8AA3",
  accent: "#EE3F36",
  accentInk: "#0A0A0A",
  accentSoft: "#2E1210",
  success: "#35C46B",
  warning: "#F5A524",
  danger: "#EE3F36",
  tabBarBackground: "#0B0F18",
  overlay: "rgba(8,11,18,0.72)",
};

const light = {
  ground: "#F4F6FB",
  surface: "#FFFFFF",
  surfaceHigh: "#EEF1F8",
  line: "#E2E6F0",
  lineStrong: "#CBD2E0",
  text: "#0B1220",
  textMuted: "#4E5A72",
  textFaint: "#5E6A82",
  // Sur fond clair le rouge s'assombrit pour rester lisible, et l'encre
  // redevient blanche : c'est pour ça que l'encre est un token.
  accent: "#D7322A",
  accentInk: "#FFFFFF",
  accentSoft: "#FDE4E2",
  success: "#15803D",
  warning: "#B45309",
  danger: "#D7322A",
  tabBarBackground: "#FFFFFF",
  overlay: "rgba(11,18,32,0.55)",
};

function withAliases(base: typeof dark): AppColors {
  return {
    ...base,
    background: base.ground,
    surfaceAlt: base.surfaceHigh,
    surfaceRaised: base.surfaceHigh,
    border: base.line,
    primary: base.accent,
    primaryMuted: base.accentSoft,
    secondary: base.accent,
    chartLine: base.accent,
  };
}

export const darkColors: AppColors = withAliases(dark);
export const lightColors: AppColors = withAliases(light);
