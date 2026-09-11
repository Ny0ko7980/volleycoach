// Design system "Coach Volley": interface sombre premium, accent orange
// (couleur volley-ball). Palette unique définie ici — aucune couleur ne
// doit être recopiée en dur ailleurs dans l'app.

export const lightTheme = {
  background: "#F4F6FB",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF1F8",
  border: "#E2E6F0",
  text: "#0B1220",
  textMuted: "#5B6478",
  primary: "#FF6A00",
  primaryMuted: "#FFE3D0",
  secondary: "#2563EB",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",
  chartLine: "#2563EB",
  tabBarBackground: "#FFFFFF",
};

export const darkTheme = {
  background: "#0D1017",
  surface: "#171B24",
  surfaceAlt: "#202632",
  border: "#262C38",
  text: "#F7F8FA",
  textMuted: "#9299A8",
  primary: "#FF6500",
  primaryMuted: "#3A2213",
  secondary: "#FF8A3D",
  success: "#22C55E",
  warning: "#FBBF24",
  danger: "#EF4444",
  chartLine: "#FF8A3D",
  tabBarBackground: "#12161F",
};

export type AppTheme = typeof lightTheme;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };

// Échelle typographique commune — remplace les tailles ad-hoc dispersées
// dans chaque écran pour garder une hiérarchie cohérente.
export const typography = {
  displayTitle: { fontSize: 34, fontWeight: "800" as const },
  screenTitle: { fontSize: 24, fontWeight: "800" as const },
  sectionTitle: { fontSize: 22, fontWeight: "700" as const },
  cardTitle: { fontSize: 18, fontWeight: "700" as const },
  body: { fontSize: 16, fontWeight: "400" as const },
  bodyStrong: { fontSize: 16, fontWeight: "600" as const },
  caption: { fontSize: 13, fontWeight: "500" as const },
  captionStrong: { fontSize: 13, fontWeight: "700" as const },
};
