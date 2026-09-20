import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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
      set({ session, initializing: false });
    });
    return () => subscription.subscription.unsubscribe();
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
    set({ session: null });
  },
}));
