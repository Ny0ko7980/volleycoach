import { darkTheme } from "@/constants/theme";

// ORVADIN utilise une seule interface sombre premium (voir constants/theme.ts).
export function useAppTheme() {
  return { theme: darkTheme, isDark: true };
}
