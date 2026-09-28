import { useEffect } from "react";
import { AppState } from "react-native";
import { flushQueue, subscribeToConnectivity } from "@/services/offlineQueue";
import { useSyncStore } from "@/store/syncStore";
import { useAuthStore } from "@/store/authStore";

/**
 * Déclenche le rejeu de la file hors-ligne aux quatre moments où il a une
 * chance d'aboutir.
 *
 * C'était le défaut central de la version précédente : la file existait, les
 * mutations s'y accumulaient, mais rien n'appelait jamais le rejeu. Une séance
 * terminée sans réseau était annoncée « enregistrée hors-ligne » puis restait
 * sur le téléphone indéfiniment.
 *
 * Les quatre déclencheurs :
 *  - ouverture de session : le rejeu a besoin d'un jeton valide ;
 *  - retour de la connexion réseau ;
 *  - retour de l'app au premier plan, car les événements réseau ne sont pas
 *    livrés de façon fiable quand l'app est en arrière-plan ;
 *  - montage initial, pour les mutations laissées par une exécution
 *    précédente (app fermée avec des mutations en attente).
 */
export function useOfflineSync(): void {
  const session = useAuthStore((state) => state.session);
  const start = useSyncStore((state) => state.start);

  useEffect(() => start(), [start]);

  useEffect(() => {
    if (!session) return;

    // Au montage et à chaque ouverture de session.
    void flushQueue();

    const unsubscribeNetwork = subscribeToConnectivity(() => {
      void flushQueue();
    });

    const appStateSubscription = AppState.addEventListener("change", (status) => {
      if (status === "active") void flushQueue();
    });

    return () => {
      unsubscribeNetwork();
      appStateSubscription.remove();
    };
  }, [session]);
}
