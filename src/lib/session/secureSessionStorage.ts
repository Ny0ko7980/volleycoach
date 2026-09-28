import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createChunkedStore, type KeyValueStore } from "@/lib/session/chunkedStore";

/**
 * Stockage de la session Supabase.
 *
 * La session contient le jeton de rafraîchissement, qui est la seule vraie
 * clé du compte : il vit longtemps et permet de régénérer des jetons d'accès.
 * Le laisser dans AsyncStorage — non chiffré, lisible sur un appareil
 * débridé ou par une sauvegarde — était le dernier point faible de
 * l'authentification.
 *
 * Il passe donc dans le coffre du système, découpé pour tenir sous la limite
 * de 2 048 octets par valeur (voir `chunkedStore.ts`).
 *
 * Trois exigences ont guidé l'écriture :
 *
 *  - **Ne déconnecter personne à la mise à jour.** Les sessions déjà écrites
 *    dans AsyncStorage sont reprises à la première lecture, puis effacées de
 *    l'ancien emplacement.
 *  - **Ne jamais empêcher l'application de démarrer.** Si le coffre est
 *    indisponible — c'est le cas sur le web, et cela peut arriver sur un
 *    appareil mal configuré —, on retombe sur AsyncStorage. Une session moins
 *    bien protégée vaut mieux qu'une application qui ne s'ouvre pas.
 *  - **Ne pas toucher à la file hors-ligne.** Elle garde ses propres clés dans
 *    AsyncStorage : elle ne contient aucun secret, seulement des séances et
 *    des ressentis, et son fonctionnement a été vérifié tel quel.
 */

const secureStore: KeyValueStore = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

const asyncStore: KeyValueStore = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

const chunked = createChunkedStore({
  secure: secureStore,
  legacy: asyncStore,
  onMigrated: (key) => console.warn(`Session reprise depuis l'ancien stockage : ${key}`),
});

/**
 * Vrai tant que le coffre répond. Une seule panne suffit à basculer : réessayer
 * à chaque appel ferait payer un accès qui échoue à chaque lecture de session.
 */
let secureStoreUsable = true;

async function withFallback<T>(secure: () => Promise<T>, plain: () => Promise<T>): Promise<T> {
  if (!secureStoreUsable) return plain();
  try {
    return await secure();
  } catch (error) {
    secureStoreUsable = false;
    console.warn("Coffre du système indisponible, repli sur le stockage simple :", error);
    return plain();
  }
}

export const sessionStorage: KeyValueStore = {
  getItem: (key) => withFallback(() => chunked.getItem(key), () => asyncStore.getItem(key)),
  setItem: (key, value) => withFallback(() => chunked.setItem(key, value), () => asyncStore.setItem(key, value)),
  removeItem: (key) => withFallback(() => chunked.removeItem(key), () => asyncStore.removeItem(key)),
};
