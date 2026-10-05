/**
 * Espacements, formes, icônes.
 *
 * La règle des rayons est écrite, et vérifiée par `npm run design:check` :
 * boutons et champs 12, cartes 16, pilule pour les chips et les badges.
 * Rien d'autre. Le rayon 28 a disparu : trop arrondi, il tirait vers le
 * bien-être plutôt que vers le sport.
 *
 * L'élévation se fait par la surface et le trait, jamais par l'ombre : une
 * ombre noire sur un sol presque noir ne se voit pas. Les presets d'ombre sont
 * conservés en nom pour les composants existants, mais ne produisent rien.
 */

// Grille 4 / 8 / 12 / 16 / 20 / 24 / 32.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  screenPadding: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  /** Boutons, champs, tuiles d'icône. */
  control: 12,
  /** Cartes et surfaces. */
  card: 16,
  pill: 999,

  // ── Alias conservés pour les composants existants ─────────────────────
  /** @deprecated utiliser `control` ou `card` */
  sm: 8,
  /** @deprecated utiliser `control` */
  md: 12,
  /** @deprecated utiliser `card` */
  lg: 16,
  /** @deprecated utiliser `card` */
  xl: 16,
  /** @deprecated utiliser `card` */
  xxl: 16,
} as const;

// Trois tailles. Les douze tailles distinctes relevées dans les écrans se
// ramènent à celles-ci pendant la refonte.
export const iconSize = { sm: 16, md: 20, lg: 24, xl: 32 } as const;

// Épaisseur de trait des icônes lucide : une au repos, une à l'état actif.
export const iconStroke = { base: 1.8, active: 2.3 } as const;

/** Hauteur de la barre d'onglets, partagée avec le bandeau de synchronisation. */
export const tabBarHeight = 62;

export const shadow = {
  none: {},
  sm: {},
  md: {},
  lg: {},
} as const;

// Le dégradé n'existe plus que pour la carte de séance actuelle, qui le perd
// à sa refonte. Il reste cohérent avec l'accent d'ici là.
export const gradient = {
  accent: ["#EE3F36", "#D7322A"] as [string, string],
  accentSubtle: ["#2E1210", "#1C0D0B"] as [string, string],
};
