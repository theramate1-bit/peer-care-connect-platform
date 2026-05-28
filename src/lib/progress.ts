import { supabase } from "@/integrations/supabase/client";

export type GoalItem = {
  id: string;
  goal_title: string;
  goal_description: string;
  target_value: number;
  target_unit: string;
  target_date: string;
  status: string;
  progress_notes: string | null;
  created_at: string | null;
};

export async function fetchGoals(
  clientId: string,
): Promise<{ data: GoalItem[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("progress_goals")
      .select(
        "id, goal_title, goal_description, target_value, target_unit, target_date, status, progress_notes, created_at",
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { data: (data || []) as GoalItem[], error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: [], error: err };
  }
}

export type ProgressMetricRow = {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  session_date: string;
  notes: string | null;
  created_at: string | null;
};

export async function fetchProgressMetricsForClient(params: {
  clientId: string;
  practitionerId: string;
}): Promise<{ data: ProgressMetricRow[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("progress_metrics")
      .select(
        "id, metric_name, metric_value, metric_unit, session_date, notes, created_at",
      )
      .eq("client_id", params.clientId)
      .eq("practitioner_id", params.practitionerId)
      .order("session_date", { ascending: false });
    if (error) throw error;
    return { data: (data || []) as ProgressMetricRow[], error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: [], error: err };
  }
}

export async function createGoal(params: {
  clientId: string;
  practitionerId: string;
  title: string;
  description: string;
  targetValue: number;
  targetUnit: string;
  targetDate: string;
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const { error } = await supabase.from("progress_goals").insert({
      client_id: params.clientId,
      practitioner_id: params.practitionerId,
      goal_title: params.title.trim(),
      goal_description: params.description.trim(),
      target_value: params.targetValue,
      target_unit: params.targetUnit.trim() || "sessions",
      target_date: params.targetDate,
      status: "active",
      progress_notes: null,
    });
    if (error) throw error;
    return { ok: true, error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { ok: false, error: err };
  }
}

export async function updateGoalStatus(params: {
  goalId: string;
  clientId: string;
  status: "active" | "completed" | "paused";
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from("progress_goals")
      .update({ status: params.status, updated_at: new Date().toISOString() })
      .eq("id", params.goalId)
      .eq("client_id", params.clientId);
    if (error) throw error;
    return { ok: true, error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { ok: false, error: err };
  }
}
