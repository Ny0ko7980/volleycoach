import { supabase } from "@/lib/supabase";
import { goalStatusFor, type UpdateGoalProgressInput } from "@/services/goals/goalRules";
import type { Goal, GoalStatus } from "@/types/database";

// Les règles pures vivent dans `goals/goalRules` pour être vérifiables sans
// React Native ni Supabase ; elles restent accessibles depuis ce service afin
// que les écrans n'aient qu'un seul module à connaître.
export { goalProgressPercent, goalStatusFor } from "@/services/goals/goalRules";
export type { UpdateGoalProgressInput } from "@/services/goals/goalRules";

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

export async function updateGoalProgress(input: UpdateGoalProgressInput): Promise<Goal> {
  const { data, error } = await supabase
    .from("goals")
    .update({
      current_value: input.currentValue,
      status: goalStatusFor(input.currentValue, input.targetValue),
    })
    .eq("id", input.goalId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Goal;
}

export async function deleteGoal(goalId: string): Promise<void> {
  const { error } = await supabase.from("goals").delete().eq("id", goalId);
  if (error) throw error;
}
