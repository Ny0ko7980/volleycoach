import { create } from "zustand";
import { flushQueue, queueSnapshot, retryFailedMutations, subscribeToQueueState } from "@/services/offlineQueue";

/**
 * État de la synchronisation hors-ligne, tel que l'interface doit le montrer.
 *
 * Le joueur doit pouvoir répondre à deux questions sans quitter l'écran :
 * « est-ce que ce que je viens de faire est parti ? » et « est-ce qu'il y a un
 * problème ? ». D'où deux compteurs distincts : `pending` (en attente, normal
 * dans un gymnase sans réseau) et `failed` (refusé définitivement, anormal).
 */
interface SyncState {
  pending: number;
  failed: number;
  syncing: boolean;
  lastError: string | null;
  oldestPendingAt: string | null;
  /** Branche le store sur la file. Rend la fonction de désabonnement. */
  start: () => () => void;
  /** Relance un rejeu maintenant (bouton « Réessayer »). */
  syncNow: () => Promise<void>;
  /** Remet les mutations en échec définitif dans la file. */
  retryFailed: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set) => ({
  pending: 0,
  failed: 0,
  syncing: false,
  lastError: null,
  oldestPendingAt: null,
  start: () =>
    subscribeToQueueState((snapshot) =>
      set({
        pending: snapshot.pending,
        failed: snapshot.failed,
        syncing: snapshot.syncing,
        lastError: snapshot.lastError,
        oldestPendingAt: snapshot.oldestPendingAt,
      })
    ),
  syncNow: async () => {
    // `flushQueue` ne lève jamais et publie l'état final : rien à rattraper ici.
    await flushQueue();
  },
  retryFailed: async () => {
    await retryFailedMutations();
    await flushQueue();
  },
  refresh: async () => {
    const snapshot = await queueSnapshot();
    set({
      pending: snapshot.pending,
      failed: snapshot.failed,
      syncing: snapshot.syncing,
      lastError: snapshot.lastError,
      oldestPendingAt: snapshot.oldestPendingAt,
    });
  },
}));
