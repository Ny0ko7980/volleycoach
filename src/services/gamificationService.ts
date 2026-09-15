import { supabase } from "@/lib/supabase";
import type { Achievement, PlayerAchievement, PlayerProfile } from "@/types/database";

// Doit rester synchronisé avec apply_session_rewards() côté serveur
// (supabase/migrations/0005_security_hardening.sql), seule source de vérité
// pour l'attribution réelle de l'XP — cette constante ne sert ici qu'à
// afficher la progression côté client.
const XP_PER_LEVEL = 200;

export function xpToNextLevel(xp: number): { level: number; progressInLevel: number; xpForNext: number } {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const progressInLevel = xp % XP_PER_LEVEL;
  return { level, progressInLevel, xpForNext: XP_PER_LEVEL };
}

/**
 * Met à jour XP, niveau, série (streak) et débloque les badges éligibles
 * après une séance complétée. Tout le calcul est effectué côté serveur par
 * la fonction Postgres `apply_session_rewards()` (SECURITY DEFINER,
 * supabase/migrations/0005_security_hardening.sql) : le client n'envoie
 * aucune valeur d'XP/streak/badge, il ne fait que déclencher le
 * recalcul — ce qui empêche un client malveillant de s'attribuer un score
 * ou un badge arbitraire.
 */
export async function applySessionRewards(profile: PlayerProfile): Promise<{
  profile: PlayerProfile;
  newAchievements: Achievement[];
}> {
  const { data: unlockedBefore, error: beforeError } = await supabase
    .from("player_achievements")
    .select("achievement_id")
    .eq("player_id", profile.id);
  if (beforeError) throw beforeError;
  const beforeIds = new Set((unlockedBefore ?? []).map((u) => u.achievement_id as string));

  const { data: updated, error } = await supabase.rpc("apply_session_rewards");
  if (error) throw error;

  const [{ data: allAchievements, error: allError }, { data: unlockedAfter, error: afterError }] = await Promise.all([
    supabase.from("achievements").select("*"),
    supabase.from("player_achievements").select("achievement_id").eq("player_id", profile.id),
  ]);
  if (allError) throw allError;
  if (afterError) throw afterError;

  const afterIds = new Set((unlockedAfter ?? []).map((u) => u.achievement_id as string));
  const newAchievements = ((allAchievements ?? []) as Achievement[]).filter(
    (a) => afterIds.has(a.id) && !beforeIds.has(a.id)
  );

  return { profile: updated as PlayerProfile, newAchievements };
}

export async function fetchPlayerAchievements(): Promise<PlayerAchievement[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("player_achievements")
    .select("*, achievement:achievements(*)")
    .eq("player_id", auth.user.id)
    .order("unlocked_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PlayerAchievement[];
}

export async function fetchAllAchievements(): Promise<Achievement[]> {
  const { data, error } = await supabase.from("achievements").select("*");
  if (error) throw error;
  return (data ?? []) as Achievement[];
}
