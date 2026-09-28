/**
 * Classification des erreurs Supabase pour le rejeu hors-ligne.
 *
 * Volontairement isolée dans un module sans dépendance React Native : c'est la
 * décision la plus lourde de conséquences de toute la file (une erreur réseau
 * classée « permanente » envoie la donnée du joueur dans les échecs alors
 * qu'elle passerait à la tentative suivante), et elle doit donc être
 * vérifiable cas par cas dans `scripts/check-offline-queue.ts`.
 */
import type { FailureKind } from "@/services/offline/queueEngine";

/** Code PostgreSQL d'une violation d'unicité. */
export const UNIQUE_VIOLATION = "23505";

export function codeOf(error: unknown): string | null {
  if (error && typeof error === "object") {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return null;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(error);
}

/**
 * Traduit une erreur Supabase en décision de rejeu.
 *
 * Le point important : ne jamais classer « permanent » ce qui est en réalité
 * une coupure réseau, sinon la donnée du joueur part dans les échecs alors
 * qu'elle passerait à la tentative suivante. Et ne jamais classer
 * « temporaire » un refus définitif, sinon la file boucle indéfiniment.
 */
export function classifySupabaseFailure(error: unknown): FailureKind {
  const code = codeOf(error);
  const message = messageOf(error).toLowerCase();

  // Reconnu par son nom, pas par son texte : nos propres dépassements de délai
  // portent un message en français, que la détection par mots-clés anglais
  // ci-dessous manquait — ils étaient donc classés « définitifs » et jamais
  // réessayés, exactement l'inverse de ce qu'il faut.
  if (error instanceof Error && error.name === "TimeoutError") return "retryable";

  // Jeton expiré ou absent : une seule tentative de rafraîchissement, puis on
  // garde la file intacte jusqu'à la reconnexion.
  if (code === "PGRST301" || code === "401" || message.includes("jwt expired") || message.includes("invalid claim")) {
    return "auth";
  }

  // `fetch` échoue sans réponse HTTP : réseau absent, DNS, coupure en cours
  // de requête. C'est exactement le cas du gymnase sans couverture.
  if (
    error instanceof TypeError ||
    message.includes("network request failed") ||
    message.includes("failed to fetch") ||
    message.includes("fetch failed") ||
    message.includes("network error") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("aborted") ||
    message.includes("socket") ||
    message.includes("econnreset") ||
    message.includes("enotfound") ||
    message.includes("etimedout")
  ) {
    return "retryable";
  }

  // Erreurs serveur et limitation de débit : réessayables.
  if (code && /^(5\d\d|429|408)$/.test(code)) return "retryable";
  if (message.includes("service unavailable") || message.includes("too many requests")) return "retryable";
  // Indisponibilité passagère de PostgREST / du pooler.
  if (code === "PGRST000" || code === "57P03" || code === "53300") return "retryable";

  // Refus RLS, contrainte violée, ligne absente, charge invalide : la mutation
  // ne passera jamais telle quelle.
  return "permanent";
}
