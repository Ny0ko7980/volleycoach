import { darkTheme } from "@/constants/theme";

// Coach Volley utilise une seule interface sombre premium (voir constants/theme.ts).
export function useAppTheme() {
  return { theme: darkTheme, isDark: true };
}
