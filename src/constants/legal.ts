/**
 * Bornes et références légales de l'application, en un seul endroit.
 *
 * `MINIMUM_AGE` est répété dans la contrainte `player_profiles_age_check`
 * (migration 0015) et dans les documents de `docs/`. La base reste l'autorité :
 * la validation côté écran n'est là que pour donner un message clair avant
 * l'aller-retour réseau, jamais pour tenir lieu de contrôle.
 */
export const MINIMUM_AGE = 15;
export const MAXIMUM_AGE = 100;

/**
 * URLs publiques des documents légaux.
 *
 * Elles doivent pointer vers les fichiers de `docs/` publiés en ligne. Apple
 * exige une URL de politique de confidentialité accessible sans connexion à
 * l'application pour toute publication sur l'App Store.
 */
export const LEGAL_URLS = {
  privacy: "https://github.com/Ny0ko7980/volleycoach/blob/main/docs/politique-de-confidentialite.md",
  terms: "https://github.com/Ny0ko7980/volleycoach/blob/main/docs/conditions-generales-utilisation.md",
  legalNotice: "https://github.com/Ny0ko7980/volleycoach/blob/main/docs/mentions-legales.md",
} as const;
