// Palette "sportive premium": fond sombre profond, accent orange dynamique
// (couleur volley-ball), succès vert, alerte rouge. Mode clair en miroir.

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
};

export const darkTheme = {
  background: "#0B1220",
  surface: "#141B2C",
  surfaceAlt: "#1B2338",
  border: "#242D45",
  text: "#F5F7FC",
  textMuted: "#9AA4BF",
  primary: "#FF6A00",
  primaryMuted: "#3A2213",
  secondary: "#3B82F6",
  success: "#22C55E",
  warning: "#FBBF24",
  danger: "#EF4444",
  chartLine: "#3B82F6",
};

export type AppTheme = typeof lightTheme;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };
