import { supabase } from "@/lib/supabase";
import type { Achievement, PlayerAchievement, PlayerProfile } from "@/types/database";

const XP_PER_SESSION = 50;
const XP_PER_LEVEL = 200;

export function xpToNextLevel(xp: number): { level: number; progressInLevel: number; xpForNext: number } {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const progressInLevel = xp % XP_PER_LEVEL;
  return { level, progressInLevel, xpForNext: XP_PER_LEVEL };
}

/**
 * Met à jour XP, niveau et série (streak) après une séance complétée, puis
 * vérifie/débloque les badges éligibles. Appelé juste après
 * completeWorkoutSession() dans le flux "Mode entraînement".
 */
export async function applySessionRewards(profile: PlayerProfile): Promise<{
  profile: PlayerProfile;
  newAchievements: Achievement[];
}> {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const lastDate = profile.last_training_date;

  let streak = profile.streak_count;
  if (!lastDate) {
    streak = 1;
  } else {
    const diffDays = Math.round((today.getTime() - new Date(lastDate).getTime()) / 86_400_000);
    if (diffDays === 0) streak = profile.streak_count; // déjà entraîné aujourd'hui
    else if (diffDays === 1) streak = profile.streak_count + 1;
    else streak = 1;
  }

  const newXp = profile.xp + XP_PER_SESSION;
  const { level } = xpToNextLevel(newXp);

  const { data: updated, error } = await supabase
    .from("player_profiles")
    .update({
      xp: newXp,
      current_level: level,
      streak_count: streak,
      longest_streak: Math.max(streak, profile.longest_streak),
      last_training_date: todayStr,
    })
    .eq("id", profile.id)
    .select("*")
    .single();
  if (error) throw error;

  const newAchievements = await checkAndUnlockAchievements(updated as PlayerProfile);
  return { profile: updated as PlayerProfile, newAchievements };
}

async function checkAndUnlockAchievements(profile: PlayerProfile): Promise<Achievement[]> {
  const { data: achievements, error: achError } = await supabase.from("achievements").select("*");
  if (achError) throw achError;

  const { data: unlocked, error: unlockedError } = await supabase
    .from("player_achievements")
    .select("achievement_id")
    .eq("player_id", profile.id);
  if (unlockedError) throw unlockedError;

  const unlockedIds = new Set((unlocked ?? []).map((u) => u.achievement_id as string));
  const { count: sessionCount } = await supabase
    .from("workout_sessions")
    .select("id", { count: "exact", head: true })
    .eq("player_id", profile.id)
    .eq("status", "completed");

  const newlyUnlocked: Achievement[] = [];

  for (const achievement of (achievements ?? []) as Achievement[]) {
    if (unlockedIds.has(achievement.id)) continue;
    let eligible = false;

    switch (achievement.criteria.type) {
      case "session_count":
        eligible = (sessionCount ?? 0) >= (achievement.criteria.value ?? 0);
        break;
      case "streak":
        eligible = profile.streak_count >= (achievement.criteria.value ?? 0);
        break;
      default:
        eligible = false;
    }

    if (eligible) {
      const { error: insertError } = await supabase
        .from("player_achievements")
        .insert({ player_id: profile.id, achievement_id: achievement.id });
      if (!insertError) newlyUnlocked.push(achievement);
    }
  }

  return newlyUnlocked;
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
