/**
 * Règle unique de robustesse des mots de passe.
 *
 * Elle était dédoublée et incohérente : l'inscription acceptait 6 caractères,
 * la réinitialisation en exigeait 8. Un joueur pouvait donc créer un compte
 * avec un mot de passe qu'il lui était ensuite impossible de se redonner.
 *
 * La valeur de référence est ici, et les deux écrans l'utilisent. Elle doit
 * rester alignée sur la configuration Auth du projet Supabase :
 *
 *   Authentication → Sign In / Providers → Email
 *     Minimum password length          : 8
 *     Password Requirements            : lettres minuscules, majuscules et chiffres
 *
 * Si la configuration du serveur devenait plus stricte que cette règle, le
 * joueur verrait un refus du serveur après avoir passé la validation locale —
 * d'où l'importance de les garder identiques.
 *
 * Note : la protection contre les mots de passe compromis (HaveIBeenPwned)
 * n'est pas concernée ici. Elle est vérifiée côté serveur par Supabase et
 * n'est disponible qu'à partir du plan Pro.
 */

export const MINIMUM_PASSWORD_LENGTH = 8;

/**
 * Renvoie la raison pour laquelle le mot de passe est refusé, ou null s'il
 * convient. Le message est destiné à être affiché tel quel.
 */
export function passwordProblem(password: string): string | null {
  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    return `Ton mot de passe doit contenir au moins ${MINIMUM_PASSWORD_LENGTH} caractères.`;
  }
  if (!/[a-z]/.test(password)) {
    return "Ton mot de passe doit contenir au moins une lettre minuscule.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Ton mot de passe doit contenir au moins une lettre majuscule.";
  }
  if (!/[0-9]/.test(password)) {
    return "Ton mot de passe doit contenir au moins un chiffre.";
  }
  return null;
}

/** Texte d'aide affiché sous le champ, pour ne pas faire deviner la règle. */
export const PASSWORD_HINT = `Au moins ${MINIMUM_PASSWORD_LENGTH} caractères, avec une minuscule, une majuscule et un chiffre.`;
