import { supabase } from "@/lib/supabase";
import type { Goal, GoalStatus } from "@/types/database";

export interface CreateGoalInput {
  name: string;
  category: string;
  currentValue: number;
  targetValue: number;
  unit?: string;
  targetDate?: string;
}

export async function fetchGoals(status?: GoalStatus): Promise<Goal[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  let query = supabase
    .from("goals")
    .select("*")
    .eq("player_id", auth.user.id)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Goal[];
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Utilisateur non authentifié.");

  const { data, error } = await supabase
    .from("goals")
    .insert({
      player_id: auth.user.id,
      name: input.name,
      category: input.category,
      current_value: input.currentValue,
      target_value: input.targetValue,
      unit: input.unit ?? null,
      target_date: input.targetDate ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Goal;
}

export async function updateGoalProgress(goalId: string, currentValue: number): Promise<Goal> {
  const { data: goal, error: fetchError } = await supabase.from("goals").select("*").eq("id", goalId).single();
  if (fetchError) throw fetchError;

  const status: GoalStatus = currentValue >= (goal as Goal).target_value ? "achieved" : "active";

  const { data, error } = await supabase
    .from("goals")
    .update({ current_value: currentValue, status })
    .eq("id", goalId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Goal;
}

export async function deleteGoal(goalId: string): Promise<void> {
  const { error } = await supabase.from("goals").delete().eq("id", goalId);
  if (error) throw error;
}

export function goalProgressPercent(goal: Goal): number {
  if (goal.target_value === 0) return 0;
  return Math.max(0, Math.min(100, Math.round((goal.current_value / goal.target_value) * 100)));
}
