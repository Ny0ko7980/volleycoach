import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { supabase } from "@/lib/supabase";

const QUEUE_KEY = "coach-volley:offline-queue";
const EXERCISES_CACHE_KEY = "coach-volley:exercises-cache";

interface QueuedMutation {
  id: string;
  table: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

/**
 * File d'attente hors-ligne minimaliste: une mutation Supabase non
 * synchronisable immédiatement (ex: fin de séance enregistrée sans réseau)
 * est stockée localement puis rejouée dès que la connexion revient.
 * Volontairement simple (pas de résolution de conflits) — suffisant pour
 * le cas d'usage "je termine ma séance dans un gymnase sans réseau".
 */
export async function queueMutation(table: string, payload: Record<string, unknown>): Promise<void> {
  const queue = await getQueue();
  queue.push({ id: `${Date.now()}-${Math.random()}`, table, payload, createdAt: new Date().toISOString() });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

async function getQueue(): Promise<QueuedMutation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
}

export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  const remaining: QueuedMutation[] = [];
  let synced = 0;

  for (const item of queue) {
    const { error } = await supabase.from(item.table).insert(item.payload);
    if (error) remaining.push(item);
    else synced += 1;
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return { synced, failed: remaining.length };
}

export function subscribeToConnectivity(onReconnect: () => void): () => void {
  let wasOffline = false;
  const unsubscribe = NetInfo.addEventListener((state) => {
    const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
    if (!isOnline) wasOffline = true;
    else if (wasOffline) {
      wasOffline = false;
      onReconnect();
    }
  });
  return unsubscribe;
}

export async function cacheExercisesForOffline(exercises: unknown[]): Promise<void> {
  await AsyncStorage.setItem(EXERCISES_CACHE_KEY, JSON.stringify(exercises));
}

export async function getCachedExercises<T>(): Promise<T[]> {
  const raw = await AsyncStorage.getItem(EXERCISES_CACHE_KEY);
  return raw ? (JSON.parse(raw) as T[]) : [];
}
