import { supabase } from "@/lib/supabase";
import type { PlayerProfile } from "@/types/database";

export async function fetchMyProfile(): Promise<PlayerProfile | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from("player_profiles")
    .select("*")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (error) throw error;
  return data as PlayerProfile | null;
}

export async function updateMyProfile(patch: Partial<PlayerProfile>): Promise<PlayerProfile> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Utilisateur non authentifié.");

  const { data, error } = await supabase
    .from("player_profiles")
    .update(patch)
    .eq("id", auth.user.id)
    .select("*")
    .single();

  if (error) throw error;
  return data as PlayerProfile;
}

export async function completeOnboarding(patch: Partial<PlayerProfile>): Promise<PlayerProfile> {
  return updateMyProfile({ ...patch, onboarding_completed: true });
}
