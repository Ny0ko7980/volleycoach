/**
 * Message lisible d'une erreur, quelle que soit sa forme.
 *
 * supabase-js ne lève pas des `Error` mais de simples objets
 * (`{ message, code, details, hint }`). Un `e instanceof Error ? e.message : …`
 * renvoie donc systématiquement le message de repli sur une erreur de base de
 * données, ce qui masque la cause réelle et rend le diagnostic impossible.
 */
export function errorMessage(value: unknown, fallback: string): string {
  if (value instanceof Error && value.message.trim().length > 0) return value.message;
  if (typeof value === "string" && value.trim().length > 0) return value;

  if (value !== null && typeof value === "object") {
    const { message, hint } = value as { message?: unknown; hint?: unknown };
    if (typeof message === "string" && message.trim().length > 0) {
      return typeof hint === "string" && hint.trim().length > 0 ? `${message} (${hint})` : message;
    }
  }

  return fallback;
}
