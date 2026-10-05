// Contrôle du design system.
//
// Les règles de la refonte visuelle sont écrites dans les tokens ; ce script
// vérifie qu'elles y sont encore. Trois familles de contrôles :
//
//   - contraste : chaque paire texte / fond utilisée dans l'application est
//     mesurée avec la formule WCAG, pas estimée à l'œil ;
//   - forme : les rayons appartiennent à l'ensemble décidé (8, 12, 16,
//     pilule), les ombres ne produisent rien, aucune capitale forcée ;
//   - polices : chaque préréglage typographique nomme une police qui existe
//     réellement dans les paquets installés, et les chiffres sont tabulaires.
//
// Lancement : npm run design:check

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { darkColors, lightColors, type AppColors } from "@/design/tokens/color";
import { fontFamily, typography } from "@/design/tokens/type";
import { radius, shadow } from "@/design/tokens/space";

let failures = 0;

function check(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`OK   ${label}`);
  } else {
    failures += 1;
    console.log(`ÉCHEC ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

// ---------------------------------------------------------------------------
// Contraste, formule WCAG 2.x.
// ---------------------------------------------------------------------------
function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light! + 0.05) / (dark! + 0.05);
}

type Pair = [keyof AppColors, keyof AppColors, number, string];

function checkContrast(name: string, colors: AppColors, pairs: Pair[]): void {
  for (const [fg, bg, minimum, usage] of pairs) {
    const ratio = contrast(colors[fg], colors[bg]);
    check(
      `${name} : ${String(fg)} sur ${String(bg)} ≥ ${minimum}:1 (${usage})`,
      ratio >= minimum,
      `mesuré ${ratio.toFixed(2)}:1`
    );
  }
}

const AA_TEXT = 4.5;

checkContrast("sombre", darkColors, [
  ["text", "ground", AA_TEXT, "texte courant"],
  ["textMuted", "ground", AA_TEXT, "texte secondaire"],
  ["textFaint", "ground", AA_TEXT, "libellés d'onglets en 11 px"],
  ["text", "surface", AA_TEXT, "texte sur carte"],
  ["textMuted", "surface", AA_TEXT, "texte secondaire sur carte"],
  ["textFaint", "surfaceHigh", AA_TEXT, "métadonnées sur surface haute"],
  ["accentInk", "accent", AA_TEXT, "libellé du bouton principal"],
  ["accent", "ground", AA_TEXT, "erreur en texte sur le sol"],
  ["accent", "surface", AA_TEXT, "erreur en texte sur carte"],
  ["success", "surface", AA_TEXT, "état réussi"],
  ["warning", "surface", AA_TEXT, "état en attente"],
  ["danger", "surface", AA_TEXT, "état en échec"],
]);

checkContrast("clair", lightColors, [
  ["text", "ground", AA_TEXT, "texte courant"],
  ["textMuted", "ground", AA_TEXT, "texte secondaire"],
  ["textFaint", "ground", AA_TEXT, "libellés d'onglets en 11 px"],
  ["accentInk", "accent", AA_TEXT, "libellé du bouton principal"],
  ["accent", "surface", AA_TEXT, "erreur en texte sur carte"],
]);

// Le blanc sur l'accent sombre est la raison de l'encre noire : si un jour
// il repasse au-dessus du seuil, la décision mérite d'être revue.
check(
  "sombre : le blanc sur l'accent reste sous 4,5:1 (justification de l'encre noire)",
  contrast("#FFFFFF", darkColors.accent) < AA_TEXT,
  `mesuré ${contrast("#FFFFFF", darkColors.accent).toFixed(2)}:1`
);

// ---------------------------------------------------------------------------
// Les deux thèmes ont les mêmes clés, et les alias pointent bien.
// ---------------------------------------------------------------------------
{
  const darkKeys = Object.keys(darkColors).sort();
  const lightKeys = Object.keys(lightColors).sort();
  check("les deux thèmes exposent les mêmes clés", JSON.stringify(darkKeys) === JSON.stringify(lightKeys));

  const aliases: [keyof AppColors, keyof AppColors][] = [
    ["background", "ground"],
    ["surfaceAlt", "surfaceHigh"],
    ["surfaceRaised", "surfaceHigh"],
    ["border", "line"],
    ["primary", "accent"],
    ["primaryMuted", "accentSoft"],
    ["secondary", "accent"],
    ["chartLine", "accent"],
  ];
  for (const [alias, target] of aliases) {
    check(
      `alias ${String(alias)} = ${String(target)} dans les deux thèmes`,
      darkColors[alias] === darkColors[target] && lightColors[alias] === lightColors[target]
    );
  }
  check("un seul accent : danger partage la valeur de accent (règle par la forme)", darkColors.danger === darkColors.accent);
}

// ---------------------------------------------------------------------------
// Formes.
// ---------------------------------------------------------------------------
{
  const allowed = new Set([8, 12, 16, 999]);
  const values = Object.values(radius);
  check("rayons : toutes les valeurs appartiennent à {8, 12, 16, pilule}", values.every((v) => allowed.has(v)), values.join(", "));
  check("rayons : control = 12", radius.control === 12);
  check("rayons : card = 16", radius.card === 16);
  check("rayons : plus aucun 20 ni 28", !values.includes(20 as never) && !values.includes(28 as never));
  check(
    "ombres : aucun preset ne produit d'ombre",
    Object.values(shadow).every((preset) => Object.keys(preset).length === 0)
  );
}

// ---------------------------------------------------------------------------
// Polices.
// ---------------------------------------------------------------------------
{
  const registered = new Set<string>(Object.values(fontFamily));
  const presets = Object.entries(typography);
  check("typographie : au moins dix préréglages", presets.length >= 10);
  for (const [name, preset] of presets) {
    check(`typographie : ${name} nomme une police enregistrée`, registered.has(preset.fontFamily), preset.fontFamily);
    check(`typographie : ${name} porte un interligne`, typeof preset.lineHeight === "number" && preset.lineHeight > 0);
  }
  for (const name of ["display", "numeric", "statValue", "statValueLarge", "timer"] as const) {
    const preset = typography[name] as { fontVariant?: readonly string[] };
    check(`typographie : ${name} en chiffres tabulaires`, preset.fontVariant?.includes("tabular-nums") === true);
  }
  check(
    "typographie : aucune capitale forcée dans les préréglages",
    !presets.some(([, preset]) => "textTransform" in preset)
  );

  // Chaque nom de police doit exister dans le paquet installé : un nom mal
  // orthographié ne se voit qu'à l'exécution, par un retour silencieux à la
  // police système.
  const archivo = readFileSync("node_modules/@expo-google-fonts/archivo/index.js", "utf8");
  const saira = readFileSync("node_modules/@expo-google-fonts/saira-condensed/index.js", "utf8");
  for (const name of registered) {
    const source = name.startsWith("Archivo") ? archivo : saira;
    check(`police ${name} exportée par son paquet`, source.includes(`export const ${name} =`));
  }

  const fonts = readFileSync("src/design/fonts.ts", "utf8");
  for (const name of registered) {
    check(`police ${name} chargée par useAppFonts`, fonts.includes(name));
  }
  check("chargement des polices : un délai de garde existe", /FONT_LOAD_TIMEOUT_MS\s*=\s*\d+/.test(fonts));
}

// ---------------------------------------------------------------------------
// Discipline des fichiers : aucune valeur en dehors des tokens.
// ---------------------------------------------------------------------------
{
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return walk(path);
      return path.endsWith(".ts") || path.endsWith(".tsx") ? [path] : [];
    });
  }
  const hex = /#[0-9A-Fa-f]{6}\b/;
  const outsideTokens = walk("src/design").filter((file) => !file.includes("/tokens/") && hex.test(readFileSync(file, "utf8")));
  check("aucune couleur en dur hors de src/design/tokens", outsideTokens.length === 0, outsideTokens.join(" ; "));

  const bridge = readFileSync("src/constants/theme.ts", "utf8");
  check("constants/theme.ts ne contient aucune valeur, seulement des réexports", !hex.test(bridge) && !/fontSize\s*:/.test(bridge));

  const design = walk("src/design").map((file) => readFileSync(file, "utf8")).join("\n");
  check("aucune capitale forcée dans src/design", !/textTransform:\s*"uppercase"/.test(design));
}

// ---------------------------------------------------------------------------
// Écran de lancement : il part toujours.
// ---------------------------------------------------------------------------
{
  const layout = readFileSync("app/_layout.tsx", "utf8");
  check("écran de lancement retenu pendant le chargement des polices", /preventAutoHideAsync\(\)\.catch/.test(layout));
  check("écran de lancement relâché quand les polices sont prêtes", /if \(fontsReady\) SplashScreen\.hideAsync\(\)\.catch/.test(layout));
  check("le garde d'authentification n'est pas monté avant les polices", /if \(!fontsReady\) return null;/.test(layout));
}

console.log("");
if (failures === 0) {
  console.log("TOUS LES CONTRÔLES PASSENT");
} else {
  console.log(`${failures} CONTRÔLE(S) EN ÉCHEC`);
  process.exitCode = 1;
}
