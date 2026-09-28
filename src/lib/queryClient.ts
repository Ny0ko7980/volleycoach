import { QueryClient, focusManager, onlineManager } from "@tanstack/react-query";
import { AppState, type AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { classifySupabaseFailure } from "@/services/offline/classifyFailure";

/**
 * Client de requêtes serveur de l'application.
 *
 * La bibliothèque était installée et montée depuis le début, mais aucun écran
 * ne l'utilisait : chacun refaisait à la main son `useState` + `useEffect` +
 * `try/catch`. D'où trois conséquences qu'on a payées ailleurs — aucun cache,
 * donc rechargement complet à chaque focus d'onglet ; une gestion d'erreur
 * réécrite à chaque écran, donc des oublis ; et aucune invalidation, donc des
 * écrans qui affichent des données périmées après une écriture.
 *
 * Partage du travail avec la file hors-ligne, pour qu'ils ne se marchent pas
 * dessus : la file s'occupe des ÉCRITURES faites sans réseau et de leur rejeu ;
 * ce client s'occupe des LECTURES, de leur cache et de leur péremption. Une
 * écriture mise en file n'est jamais confiée à react-query.
 */

/** Au-delà, on considère que la requête n'aboutira pas et on rend la main. */
export const QUERY_TIMEOUT_MS = 15_000;

/**
 * Relie react-query au cycle de vie React Native.
 *
 * `refetchOnWindowFocus` ne veut rien dire sans fenêtre : sur mobile, c'est le
 * retour de l'application au premier plan qui joue ce rôle. De même,
 * `onlineManager` doit être alimenté par NetInfo, sinon react-query croit être
 * toujours en ligne et fait échouer les requêtes au lieu de les mettre en
 * pause — c'est ce qui permet à un écran de reprendre tout seul au retour du
 * réseau, sans code par écran.
 *
 * Appelée une fois, au montage du layout racine.
 */
export function connectQueryClientToAppLifecycle(): () => void {
  const appStateSubscription = AppState.addEventListener("change", (status: AppStateStatus) => {
    focusManager.setFocused(status === "active");
  });

  // `setEventListener` ne rend pas de fonction de désinscription : c'est la
  // fonction de nettoyage rendue par le `setup` que le gestionnaire appellera.
  // On la garde de côté pour pouvoir tout défaire.
  let unsubscribeNetwork: (() => void) | undefined;
  onlineManager.setEventListener((setOnline) => {
    unsubscribeNetwork = NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    return unsubscribeNetwork;
  });

  return () => {
    appStateSubscription.remove();
    unsubscribeNetwork?.();
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Une donnée reste fraîche une minute : traverser deux onglets et
      // revenir ne relance pas la requête. Les données de référence
      // (catalogue d'exercices) surchargent cette valeur à la hausse.
      staleTime: 60_000,
      // Conservée cinq minutes après le démontage du dernier écran qui
      // l'utilise : revenir sur un écran affiche immédiatement la donnée
      // connue pendant que la mise à jour se fait en arrière-plan.
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // Décisif, et contre-intuitif : avec le mode par défaut (« online »),
      // brancher `onlineManager` sur NetInfo transforme « hors réseau » en
      // requête EN PAUSE — statut « pending », jamais d'erreur. L'écran
      // resterait sur son indicateur de chargement indéfiniment, et le repli
      // sur le cache disque, qui se déclenche sur l'erreur, ne viendrait
      // jamais. En « offlineFirst », la requête est tentée quand même :
      // elle échoue proprement, l'erreur s'affiche, le cache prend le relais,
      // et les nouvelles tentatives reprennent au retour du réseau.
      networkMode: "offlineFirst",
      // Réessayer un refus de RLS ou une contrainte violée ne sert à rien et
      // retarde l'affichage de l'erreur. On réutilise la classification écrite
      // pour la file hors-ligne, seule source de vérité sur ce qui mérite une
      // nouvelle tentative.
      retry: (failureCount, error) => classifySupabaseFailure(error) === "retryable" && failureCount < 2,
      retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
    },
    mutations: {
      // Une écriture n'est jamais rejouée automatiquement ici : celles qui
      // doivent l'être passent par la file hors-ligne, qui garantit l'ordre et
      // l'idempotence. Rejouer des deux côtés créerait des doublons.
      retry: false,
      // Même raison que pour les lectures : sans cela, une écriture faite hors
      // réseau resterait en attente sans rien dire, puis partirait toute seule
      // plus tard. Le joueur doit voir l'échec au moment où il agit.
      networkMode: "offlineFirst",
    },
  },
});
