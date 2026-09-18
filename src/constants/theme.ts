// Design system "Coach Volley" — source unique de vérité pour le rendu
// visuel de toute l'app. Aucune couleur, taille de texte ou espacement ne
// doit être recopié en dur dans un écran : tout référence ces tokens.

export const lightTheme = {
  background: "#F4F6FB",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF1F8",
  surfaceRaised: "#FFFFFF",
  border: "#E2E6F0",
  text: "#0B1220",
  textMuted: "#5B6478",
  textFaint: "#8891A6",
  primary: "#FF6A00",
  primaryMuted: "#FFE3D0",
  secondary: "#2563EB",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",
  chartLine: "#2563EB",
  tabBarBackground: "#FFFFFF",
  overlay: "rgba(11,18,32,0.55)",
};

export const darkTheme = {
  background: "#0D1017",
  surface: "#171B24",
  surfaceAlt: "#202632",
  surfaceRaised: "#1D222D",
  border: "#262C38",
  text: "#F7F8FA",
  textMuted: "#9299A8",
  textFaint: "#6B7180",
  primary: "#FF6500",
  primaryMuted: "#3A2213",
  secondary: "#FF8A3D",
  success: "#22C55E",
  warning: "#FBBF24",
  danger: "#EF4444",
  chartLine: "#FF8A3D",
  tabBarBackground: "#12161F",
  overlay: "rgba(0,0,0,0.6)",
};

export type AppTheme = typeof lightTheme;

// Grille d'espacement — 4 / 8 / 12 / 16 / 20 / 24 / 32.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  screenPadding: 20,
  xl: 24,
  xxl: 32,
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, pill: 999 };

export const iconSize = { sm: 16, md: 20, lg: 24, xl: 32 };

// Presets d'ombre légère (jamais de bordure épaisse — on sépare par contraste
// de surface + ombre douce, comme demandé).
export const shadow = {
  none: {},
  sm: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
};

// Dégradé d'accent — réservé aux moments importants (score, objectif,
// progression, CTA majeur, visualisation d'entraînement). Jamais utilisé
// en fond d'écran ou de carte générique.
export const gradient = {
  accent: ["#FF6500", "#FF8A3D"] as [string, string],
  accentSubtle: ["#3A2213", "#241A12"] as [string, string],
};

// Durées d'animation — courtes, jamais gadget.
export const motion = {
  fast: 150,
  base: 200,
  slow: 280,
};

// Échelle typographique — chaque écran doit piocher ici, jamais de
// fontSize/fontWeight arbitraire recopié à la main.
export const typography = {
  // Display: grands nombres héros (record, objectif principal en avant).
  display: { fontSize: 40, fontWeight: "800" as const, letterSpacing: -0.5 },
  // Titre principal d'écran.
  titleXL: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.3 },
  // Titre de section.
  titleL: { fontSize: 20, fontWeight: "700" as const, letterSpacing: -0.1 },
  // Sous-titre / titre de carte.
  titleM: { fontSize: 17, fontWeight: "700" as const },
  // Texte principal.
  body: { fontSize: 16, fontWeight: "400" as const },
  bodyStrong: { fontSize: 16, fontWeight: "600" as const },
  // Texte secondaire.
  bodySecondary: { fontSize: 14, fontWeight: "400" as const },
  bodySecondaryStrong: { fontSize: 14, fontWeight: "600" as const },
  // Caption (labels, métadonnées).
  caption: { fontSize: 13, fontWeight: "500" as const },
  // Eyebrow — libellé court en majuscules au-dessus d'un bloc important.
  eyebrow: { fontSize: 11, fontWeight: "800" as const, letterSpacing: 0.8 },
  // Valeur statistique — chiffres qui doivent se lire instantanément.
  statValue: { fontSize: 26, fontWeight: "800" as const, letterSpacing: -0.4 },
  statValueLarge: { fontSize: 44, fontWeight: "800" as const, letterSpacing: -1 },
};
