/**
 * Mouvement.
 *
 * Chaque animation doit pouvoir dire en une phrase ce qu'elle communique :
 * hiérarchie, enchaînement, retour d'action, changement d'état. Sinon elle
 * n'existe pas. Les durées sont courtes, rien n'empêche jamais d'agir, et
 * tout respecte la réduction de mouvement du téléphone.
 */

export const motion = {
  duration: {
    fast: 150,
    base: 200,
    slow: 280,
  },
  /** Courbe de sortie douce, pour les entrées et les retours d'action. */
  easing: {
    out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  },
  /** Réglage de ressort pour reanimated : ferme, sans rebond gadget. */
  spring: {
    damping: 20,
    stiffness: 180,
    mass: 1,
  },
  /** Décalage entre deux cartes qui entrent l'une après l'autre. */
  stagger: 40,
  /** Rétrécissement à la pression d'un bouton. */
  pressScale: 0.97,
} as const;
