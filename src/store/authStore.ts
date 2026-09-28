import { create } from "zustand";
import { AppState } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";

interface AuthState {
  session: Session | null;
  initializing: boolean;
  setSession: (session: Session | null) => void;
  init: () => () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  initializing: true,
  setSession: (session) => set({ session }),
  init: () => {
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, initializing: false });
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      // Le cache de requêtes est vidé dès qu'il n'y a plus de session. Les
      // clés ne portent pas d'identifiant de compte : sans cela, un second
      // joueur qui se connecte sur le même appareil dans les minutes qui
      // suivent verrait s'afficher les statistiques, l'historique, les
      // objectifs et les conversations du précédent.
      if (!session) queryClient.clear();
      set({ session, initializing: false });
    });

    // Sur React Native, les minuteurs JavaScript sont suspendus ou étranglés
    // quand l'application passe en arrière-plan : le rafraîchissement
    // automatique du jeton s'arrête donc sans le dire, et la première requête
    // au retour peut partir avec un jeton périmé. Supabase demande pour cette
    // raison de piloter explicitement le rafraîchissement sur AppState — sinon
    // il continue aussi à échouer en boucle pendant que l'app est en veille.
    const appStateSubscription = AppState.addEventListener("change", (status) => {
      if (!isSupabaseConfigured) return;
      if (status === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });

    return () => {
      subscription.subscription.unsubscribe();
      appStateSubscription.remove();
    };
  },
  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Après une suppression de compte, le jeton ne correspond plus à aucun
      // utilisateur et la révocation distante échoue. La session locale doit
      // être effacée quoi qu'il arrive, sinon l'application reste bloquée sur
      // un jeton mort au lieu de revenir à l'écran de connexion.
      console.warn("Déconnexion distante impossible, session locale effacée :", error);
    }
    queryClient.clear();
    set({ session: null });
  },
}));
