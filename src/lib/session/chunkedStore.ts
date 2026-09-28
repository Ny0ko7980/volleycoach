/**
 * Stockage clé/valeur découpé en morceaux, sans dépendance React Native.
 *
 * Raison d'être : la session Supabase doit vivre dans le coffre du système
 * (Keychain sur iOS, KeyStore sur Android) plutôt que dans AsyncStorage, qui
 * n'est pas chiffré. Mais `expo-secure-store` documente une limite de
 * 2 048 octets par valeur.
 *
 * Contrairement à ce qu'on lit souvent, une session Supabase ne dépasse pas
 * systématiquement cette limite : mesurée dans `scripts/check-session-storage.ts`,
 * une session minimale fait environ 1 700 octets. Le problème n'est pas le
 * dépassement, c'est la marge — quelques centaines d'octets sur une valeur
 * dont la taille dépend des claims du jeton et des métadonnées du compte,
 * c'est-à-dire de choses hors de notre contrôle. Parier que ça tient revient à
 * parier sur le pseudo que choisira un joueur, et l'échec se manifesterait par
 * « impossible de rester connecté », au pire endroit possible.
 *
 * On découpe donc la valeur, ce qui rend la question sans objet, et on la
 * recompose à la lecture.
 *
 * Deux principes gouvernent tout le reste :
 *
 *  1. **Échouer fermé.** Une session à moitié écrite ou à moitié lue n'est pas
 *     une session : on renvoie `null`, ce qui renvoie le joueur à l'écran de
 *     connexion. Rendre une valeur tronquée à Supabase produirait un état
 *     bien plus difficile à diagnostiquer.
 *  2. **Le manifeste fait foi.** Il est écrit en dernier et supprimé en
 *     premier, et il désigne une génération de morceaux.
 *
 *     La génération est ce qui rend une réécriture sûre. Écrire les nouveaux
 *     morceaux par-dessus les anciens semblait suffisant — c'est faux : une
 *     interruption laissait un début de nouvelle valeur suivi d'une fin
 *     d'ancienne, que le manifeste inchangé déclarait lisible. On obtenait
 *     donc une session corrompue, pas une session absente, ce qui est
 *     exactement ce qu'on voulait éviter. En écrivant chaque version sous une
 *     nouvelle génération, une écriture interrompue laisse simplement
 *     l'ancienne intacte.
 */

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Taille d'un morceau, en caractères.
 *
 * La limite documentée est en octets. Un caractère accentué en pèse deux en
 * UTF-8, et l'objet utilisateur d'une session peut en contenir (un pseudo,
 * par exemple). 1 024 caractères restent donc sous 2 048 octets même dans le
 * pire cas, sans avoir à mesurer l'encodage à chaque écriture.
 */
export const CHUNK_SIZE = 1_024;

interface Manifest {
  v: 1 | 2;
  n: number;
  /** Génération. Absente dans le format v1, où les morceaux n'en avaient pas. */
  g?: number;
}

function chunkKey(key: string, index: number, generation?: number): string {
  return generation === undefined ? `${key}.${index}` : `${key}.g${generation}.${index}`;
}

function parseManifest(raw: string | null): Manifest | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const { v, n, g } = parsed as Partial<Manifest>;
    if (v !== 1 && v !== 2) return null;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1) return null;
    if (v === 2 && (typeof g !== "number" || !Number.isInteger(g))) return null;
    return v === 2 ? { v, n, g: g as number } : { v, n };
  } catch {
    return null;
  }
}

export function splitIntoChunks(value: string, size: number = CHUNK_SIZE): string[] {
  if (value.length === 0) return [""];
  const chunks: string[] = [];
  for (let start = 0; start < value.length; start += size) {
    chunks.push(value.slice(start, start + size));
  }
  return chunks;
}

/**
 * Enveloppe un stockage à valeurs courtes pour lui faire accepter des valeurs
 * longues. `legacy` sert à récupérer une valeur écrite par une version
 * précédente de l'application, avant ce découpage.
 */
export function createChunkedStore(options: {
  secure: KeyValueStore;
  /** Stockage de l'ancienne version, lu une seule fois par clé. */
  legacy?: KeyValueStore;
  chunkSize?: number;
  /** Prévenu quand une valeur est reprise de l'ancien stockage. */
  onMigrated?: (key: string) => void;
}): KeyValueStore {
  const { secure, legacy, onMigrated } = options;
  const size = options.chunkSize ?? CHUNK_SIZE;

  async function readChunks(key: string, manifest: Manifest): Promise<string | null> {
    const parts: string[] = [];
    for (let i = 0; i < manifest.n; i += 1) {
      const part = await secure.getItem(chunkKey(key, i, manifest.g));
      // Un morceau manquant rend la valeur inexploitable : mieux vaut une
      // absence franche qu'une session tronquée.
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join("");
  }

  async function clearChunks(key: string, count: number, generation?: number): Promise<void> {
    for (let i = 0; i < count; i += 1) {
      await secure.removeItem(chunkKey(key, i, generation));
    }
  }

  return {
    async getItem(key: string): Promise<string | null> {
      const manifest = parseManifest(await secure.getItem(key));
      if (manifest) return readChunks(key, manifest);

      // Pas de manifeste : soit rien n'a jamais été écrit, soit la valeur vient
      // d'une version antérieure. On la reprend pour que la mise à jour de
      // l'application ne déconnecte personne.
      if (!legacy) return null;
      const inherited = await legacy.getItem(key);
      if (inherited === null) return null;
      await this.setItem(key, inherited);
      await legacy.removeItem(key);
      onMigrated?.(key);
      return inherited;
    },

    async setItem(key: string, value: string): Promise<void> {
      const previous = parseManifest(await secure.getItem(key));
      const chunks = splitIntoChunks(value, size);
      const generation = ((previous?.g ?? 0) + 1) % 1_000_000;

      // Nouvelle génération d'abord, manifeste ensuite : tant qu'il n'est pas
      // écrit, il continue de désigner l'ancienne génération, intacte. Une
      // interruption ne dégrade donc rien.
      for (let i = 0; i < chunks.length; i += 1) {
        await secure.setItem(chunkKey(key, i, generation), chunks[i] as string);
      }
      await secure.setItem(key, JSON.stringify({ v: 2, n: chunks.length, g: generation } satisfies Manifest));

      // L'ancienne génération n'est plus atteignable, mais elle contient
      // encore des fragments du jeton précédent : on l'efface.
      if (previous) await clearChunks(key, previous.n, previous.g);
    },

    async removeItem(key: string): Promise<void> {
      const manifest = parseManifest(await secure.getItem(key));
      // Le manifeste en premier : à partir de là, la valeur est invisible même
      // si la suppression des morceaux est interrompue.
      await secure.removeItem(key);
      if (manifest) await clearChunks(key, manifest.n, manifest.g);
      await legacy?.removeItem(key);
    },
  };
}
