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
    await supabase.auth.signOut();
    set({ session: null });
  },
}));
