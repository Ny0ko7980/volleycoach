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

export interface CategoryScore {
  category: StatCategory;
  score: number; // 0-100, indicateur interne (voir note UI: pas une vérité scientifique)
  entryCount: number;
}

/**
 * Calcule un score interne de progression 0-100 par catégorie, basé sur le
 * nombre d'entrées enregistrées et la tendance récente (moyenne des 5
 * dernières valeurs vs les 5 précédentes). C'est un indicateur motivationnel,
 * pas une mesure scientifique — affiché comme tel dans l'UI.
 */
export function computeCategoryScore(stats: Statistic[]): number {
  if (stats.length === 0) return 0;
  const sorted = [...stats].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  const recent = sorted.slice(-5);
  const previous = sorted.slice(-10, -5);

  const avg = (arr: Statistic[]) => (arr.length ? arr.reduce((s, x) => s + x.value, 0) / arr.length : 0);
  const recentAvg = avg(recent);
  const previousAvg = avg(previous);

  const volumeScore = Math.min(40, sorted.length * 4); // jusqu'à 40 pts pour la régularité de suivi
  const trendScore =
    previousAvg > 0 ? Math.max(-30, Math.min(30, ((recentAvg - previousAvg) / previousAvg) * 100)) : 0;
  const baseScore = 50;

  return Math.round(Math.max(0, Math.min(100, baseScore + trendScore * 0.6 + volumeScore * 0.4 - 20)));
}
