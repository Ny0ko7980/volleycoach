/**
 * Typographie d'Orvadin.
 *
 * Deux familles, deux rôles stricts :
 *
 * - **Saira Condensed** pour les chiffres et les compteurs, en casse normale.
 *   Chasse étroite, chiffres tabulaires : un compte à rebours ne tremble pas.
 * - **Archivo** pour les titres et le texte courant.
 *
 * Les capitales ne sont jamais une graisse : pas de libellé en majuscules
 * « pour faire sport ». Ce module ne contient que des noms et des tailles ;
 * les fichiers de police sont chargés par `src/design/fonts.ts`, séparé pour
 * que ce fichier reste importable par les scripts de contrôle.
 *
 * Chaque préréglage porte `fontFamily` **et** `fontWeight` : React Native
 * choisit la face par la famille quand elle est chargée, et retombe sur la
 * graisse système si elle ne l'est pas encore. Un écran ne doit jamais poser
 * un `fontWeight` seul : il obtiendrait la police système.
 */

export const fontFamily = {
  text: "Archivo_400Regular",
  textMedium: "Archivo_500Medium",
  textSemiBold: "Archivo_600SemiBold",
  textBold: "Archivo_700Bold",
  textExtraBold: "Archivo_800ExtraBold",
  numericSemiBold: "SairaCondensed_600SemiBold",
  numericBold: "SairaCondensed_700Bold",
  numericExtraBold: "SairaCondensed_800ExtraBold",
} as const;

export type FontFamilyName = (typeof fontFamily)[keyof typeof fontFamily];

/** Chiffres tabulaires : chaque chiffre occupe la même largeur. */
const tabular = { fontVariant: ["tabular-nums"] as ("tabular-nums")[] };

export const typography = {
  // Grands nombres héros : record, objectif principal.
  display: {
    fontFamily: fontFamily.numericExtraBold,
    fontWeight: "800" as const,
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1,
    ...tabular,
  },
  // Titre principal d'écran.
  titleXL: { fontFamily: fontFamily.textExtraBold, fontWeight: "800" as const, fontSize: 27, lineHeight: 32, letterSpacing: -0.5 },
  // Titre de section.
  titleL: { fontFamily: fontFamily.textBold, fontWeight: "700" as const, fontSize: 20, lineHeight: 25, letterSpacing: -0.2 },
  // Titre de carte.
  titleM: { fontFamily: fontFamily.textBold, fontWeight: "700" as const, fontSize: 17, lineHeight: 22 },
  // Texte courant.
  body: { fontFamily: fontFamily.text, fontWeight: "400" as const, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fontFamily.textSemiBold, fontWeight: "600" as const, fontSize: 16, lineHeight: 24 },
  // Texte secondaire.
  bodySecondary: { fontFamily: fontFamily.text, fontWeight: "400" as const, fontSize: 14, lineHeight: 21 },
  bodySecondaryStrong: { fontFamily: fontFamily.textSemiBold, fontWeight: "600" as const, fontSize: 14, lineHeight: 21 },
  // Libellés et métadonnées.
  caption: { fontFamily: fontFamily.textMedium, fontWeight: "500" as const, fontSize: 13, lineHeight: 18 },
  // Petit libellé au-dessus d'un bloc. Conservé pour les écrans existants ;
  // la refonte le retire (plafond : un pour trois sections) et n'y met plus
  // de capitales. Sans `textTransform` volontairement.
  eyebrow: { fontFamily: fontFamily.textSemiBold, fontWeight: "600" as const, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  // Compteurs et chiffres, en casse normale.
  numeric: { fontFamily: fontFamily.numericBold, fontWeight: "700" as const, fontSize: 17, lineHeight: 20, ...tabular },
  statValue: { fontFamily: fontFamily.numericExtraBold, fontWeight: "800" as const, fontSize: 32, lineHeight: 34, letterSpacing: -0.4, ...tabular },
  statValueLarge: { fontFamily: fontFamily.numericExtraBold, fontWeight: "800" as const, fontSize: 64, lineHeight: 64, letterSpacing: -1.5, ...tabular },
  // Le compte à rebours du mode séance.
  timer: { fontFamily: fontFamily.numericExtraBold, fontWeight: "800" as const, fontSize: 96, lineHeight: 92, letterSpacing: -2, ...tabular },
} as const;

export type TypographyVariant = keyof typeof typography;
