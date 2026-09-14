import { supabase } from "@/lib/supabase";
import type { StatCategory, Statistic } from "@/types/database";

export interface AddStatisticInput {
  category: StatCategory;
  metric: string;
  value: number;
  unit?: string;
  notes?: string;
  sessionId?: string;
}

export async function addStatistic(input: AddStatisticInput): Promise<Statistic> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Utilisateur non authentifié.");

  const { data, error } = await supabase
    .from("statistics")
    .insert({
      player_id: auth.user.id,
      category: input.category,
      metric: input.metric,
      value: input.value,
      unit: input.unit ?? null,
      notes: input.notes ?? null,
      session_id: input.sessionId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Statistic;
}

export async function fetchStatistics(category?: StatCategory, limit = 200): Promise<Statistic[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  let query = supabase
    .from("statistics")
    .select("*")
    .eq("player_id", auth.user.id)
    .order("recorded_at", { ascending: true })
    .limit(limit);

  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Statistic[];
}

// Les calculs de score vivent dans `statisticsScoring` (aucun accès réseau).
// Ils restent réexportés ici : les écrans qui les importaient déjà n'ont pas
// à changer d'import.
export {
  computeCategoryScore,
  computePersonalBest,
  type CategoryScore,
  type PersonalBest,
} from "@/services/statisticsScoring";
