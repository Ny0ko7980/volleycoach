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

/**
 * Supprime définitivement le compte de l'utilisateur connecté.
 *
 * Tout passe par le RPC `delete_my_account()` (migration 0014). Il ne prend
 * aucun paramètre et n'efface que `auth.uid()` : le client ne peut pas viser
 * un autre compte que le sien, même en appelant le RPC directement. La cascade
 * du schéma se charge du reste — profil, séances, statistiques, objectifs,
 * badges, conversations et messages du Coach IA.
 *
 * L'opération est irréversible et l'appelant doit l'avoir fait confirmer.
 */
export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw error;
}
