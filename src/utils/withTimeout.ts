/**
 * Borne l'attente d'une promesse.
 *
 * Nécessaire parce qu'aucune requête n'a de délai d'expiration : sur un réseau
 * « connecté mais mort » — wifi de gymnase, portail captif —, la sonde réseau
 * répond « connecté » et la requête pend indéfiniment. L'écran reste alors sur
 * son indicateur de chargement sans que le joueur puisse abandonner.
 *
 * Attention à ce que cette fonction ne fait pas : elle n'annule pas la requête
 * sous-jacente, elle arrête seulement de l'attendre. Le travail déjà engagé
 * côté serveur se poursuit donc, et ses effets sont acquis. À n'utiliser que
 * là où c'est acceptable — pas pour rendre une écriture rejouable.
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}
