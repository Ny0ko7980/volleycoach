import { create } from "zustand";
import type { PlayerProfile } from "@/types/database";

interface ProfileState {
  profile: PlayerProfile | null;
  setProfile: (profile: PlayerProfile | null) => void;
  updateLocal: (patch: Partial<PlayerProfile>) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  updateLocal: (patch) =>
    set((state) => ({ profile: state.profile ? { ...state.profile, ...patch } : state.profile })),
}));
