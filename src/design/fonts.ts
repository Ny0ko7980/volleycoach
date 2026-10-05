import { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
} from "@expo-google-fonts/archivo";
import {
  SairaCondensed_600SemiBold,
  SairaCondensed_700Bold,
  SairaCondensed_800ExtraBold,
} from "@expo-google-fonts/saira-condensed";
import { fontFamily } from "@/design/tokens/type";

/**
 * Fichiers de police, indexés par le nom que `typography` utilise.
 *
 * Séparé de `tokens/type.ts` : ce module touche au système de fichiers natif
 * et n'est importable que par l'application, alors que les tokens doivent
 * rester lisibles par les scripts de contrôle.
 */
export const fontAssets: Record<(typeof fontFamily)[keyof typeof fontFamily], number> = {
  [fontFamily.text]: Archivo_400Regular,
  [fontFamily.textMedium]: Archivo_500Medium,
  [fontFamily.textSemiBold]: Archivo_600SemiBold,
  [fontFamily.textBold]: Archivo_700Bold,
  [fontFamily.textExtraBold]: Archivo_800ExtraBold,
  [fontFamily.numericSemiBold]: SairaCondensed_600SemiBold,
  [fontFamily.numericBold]: SairaCondensed_700Bold,
  [fontFamily.numericExtraBold]: SairaCondensed_800ExtraBold,
};

/**
 * Au-delà de ce délai, l'application démarre avec les polices système plutôt
 * que de rester sur l'écran de lancement. Les fichiers sont embarqués dans
 * l'application, donc ce cas ne devrait jamais arriver ; la garde existe
 * parce qu'un écran de lancement qui ne part jamais est le pire défaut
 * possible, bien pire qu'une mauvaise police.
 */
const FONT_LOAD_TIMEOUT_MS = 3000;

/**
 * Charge les polices et dit quand l'interface peut s'afficher.
 *
 * `true` dès que les polices sont là, qu'elles ont échoué, ou que le délai
 * est écoulé : dans les trois cas on affiche. Un échec n'est jamais bloquant.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(fontAssets);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (loaded || error) return;
    const timer = setTimeout(() => setTimedOut(true), FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loaded, error]);

  useEffect(() => {
    if (error) console.warn("Polices non chargées, police système utilisée :", error);
  }, [error]);

  return loaded || Boolean(error) || timedOut;
}
