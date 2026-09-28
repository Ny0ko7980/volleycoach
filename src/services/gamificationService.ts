import { supabase } from "@/lib/supabase";
import type { Achievement, PlayerAchievement, PlayerProfile } from "@/types/database";

// Doit rester synchronisé avec grant_session_rewards() côté serveur
// (supabase/migrations/20260922203616_rewards_integrity_and_badges.sql),
// seule source de vérité pour l'attribution réelle de l'XP — cette constante
// ne sert ici qu'à afficher la progression côté client.
const XP_PER_LEVEL = 200;

export function xpToNextLevel(xp: number): { level: number; progressInLevel: number; xpForNext: number } {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const progressInLevel = xp % XP_PER_LEVEL;
  return { level, progressInLevel, xpForNext: XP_PER_LEVEL };
}

/**
 * Relit le profil après une séance complétée, et dit quels badges viennent
 * d'être débloqués.
 *
 * L'attribution elle-même ne dépend pas de cet appel. XP, niveau, série et
 * badges sont accordés côté serveur par `grant_session_rewards()`, déclenchée
 * par le trigger `trg_apply_rewards_after_session` au moment où la séance
 * passe à « completed »
 * (supabase/migrations/20260922203616_rewards_integrity_and_badges.sql). La
 * colonne `workout_sessions.rewarded_at` garantit qu'une même séance ne
 * rapporte qu'une fois, même si elle est enregistrée deux fois — ce qui rend
 * la fin de séance rejouable depuis la file d'attente hors-ligne.
 *
 * Le client n'envoie donc aucune valeur d'XP, de série ou de badge : il ne
 * peut pas s'attribuer un score arbitraire. `apply_session_rewards()` ne fait
 * plus que renvoyer le profil à jour.
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
