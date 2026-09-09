import { useColorScheme } from "react-native";
import { darkTheme, lightTheme } from "@/constants/theme";

export function useAppTheme() {
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? darkTheme : lightTheme;
  return { theme, isDark: scheme === "dark" };
}
