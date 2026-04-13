import { supabase } from "@/lib/supabase";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type TreatmentPlan = {
  id: string;
  title: string;
  status: string | null;
  practitioner_id: string | null;
  practitioner_name: string;
  goals: JsonValue[] | null;
  interventions: JsonValue[] | null;
  created_at: string | null;
};

type PlanRow = {
  id: string;
  title: string;
  goals: JsonValue[] | null;
  interventions: JsonValue[] | null;
  status: string | null;
  practitioner_id: string | null;
  created_at: string | null;
};

function normalizeArray(value: unknown): JsonValue[] | null {
  return Array.isArray(value) ? (value as JsonValue[]) : null;
}

function toPlan(row: PlanRow, nameById: Map<string, string>): TreatmentPlan {
  return {
    id: row.id,
    title: row.title || "Care plan",
    status: row.status,
    practitioner_id: row.practitioner_id,
    practitioner_name: row.practitioner_id
      ? nameById.get(row.practitioner_id) || "Practitioner"
      : "Practitioner",
    goals: normalizeArray(row.goals),
    interventions: normalizeArray(row.interventions),
    created_at: row.created_at,
  };
}

export async function fetchTreatmentPlans(clientId: string): Promise<{
  data: TreatmentPlan[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("treatment_plans")
      .select(
        "id, title, goals, interventions, status, practitioner_id, created_at",
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = (data || []) as PlanRow[];
    if (rows.length === 0) return { data: [], error: null };

    const practitionerIds = [
      ...new Set(rows.map((r) => r.practitioner_id).filter(Boolean)),
    ] as string[];
    const nameById = new Map<string, string>();
    if (practitionerIds.length > 0) {
      const { data: users, error: uErr } = await supabase
        .from("users")
        .select("id, first_name, last_name")
        .in("id", practitionerIds);
      if (uErr) throw uErr;
      for (const u of (users || []) as Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
      }>) {
        nameById.set(
          u.id,
          `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Practitioner",
        );
      }
    }

    return { data: rows.map((r) => toPlan(r, nameById)), error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: [], error: err };
  }
}

export async function fetchTreatmentPlanById(params: {
  clientId: string;
  planId: string;
}): Promise<{ data: TreatmentPlan | null; error: Error | null }> {
  const { data, error } = await fetchTreatmentPlans(params.clientId);
  if (error) return { data: null, error };
  return {
    data: data.find((p) => p.id === params.planId) || null,
    error: null,
  };
}
