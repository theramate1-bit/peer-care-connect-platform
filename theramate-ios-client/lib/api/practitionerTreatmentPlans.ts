/**
 * Care plans (`treatment_plans`) — list/select and RPC create/update/link session.
 */

import { supabase } from "@/lib/supabase";

export type TreatmentPlanRow = {
  id: string;
  practitioner_id: string;
  client_id: string;
  title: string;
  goals: unknown;
  interventions: unknown;
  start_date: string | null;
  end_date: string | null;
  status: string;
  progress: unknown;
  clinician_notes: string | null;
  attachments: unknown;
  created_at: string;
  updated_at: string;
};

export async function fetchTreatmentPlansForPractitioner(
  practitionerId: string,
): Promise<{ data: TreatmentPlanRow[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("treatment_plans")
      .select("*")
      .eq("practitioner_id", practitionerId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return { data: (data || []) as TreatmentPlanRow[], error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function fetchTreatmentPlansForClient(params: {
  practitionerId: string;
  clientId: string;
}): Promise<{ data: TreatmentPlanRow[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("treatment_plans")
      .select("*")
      .eq("practitioner_id", params.practitionerId)
      .eq("client_id", params.clientId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return { data: (data || []) as TreatmentPlanRow[], error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function fetchTreatmentPlanById(
  planId: string,
): Promise<{ data: TreatmentPlanRow | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("treatment_plans")
      .select("*")
      .eq("id", planId)
      .maybeSingle();
    if (error) throw error;
    return { data: data as TreatmentPlanRow | null, error: null };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function createTreatmentPlanRpc(params: {
  practitionerId: string;
  clientId: string;
  title: string;
  goals: string[];
  interventions: string[];
  startDate: string | null;
  endDate: string | null;
  clinicianNotes: string | null;
}): Promise<{ data: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc("create_treatment_plan", {
      p_practitioner_id: params.practitionerId,
      p_client_id: params.clientId,
      p_title: params.title,
      p_goals: params.goals,
      p_interventions: params.interventions,
      p_start_date: params.startDate,
      p_end_date: params.endDate,
      p_clinician_notes: params.clinicianNotes,
      p_attachments: [],
    });
    if (error) throw error;
    return { data: data as string, error: null };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function updateTreatmentPlanRpc(params: {
  planId: string;
  patch: Record<string, unknown>;
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const { error } = await supabase.rpc("update_treatment_plan", {
      p_plan_id: params.planId,
      p_patch: params.patch,
    });
    if (error) throw error;
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export type TreatmentPlanSessionLink = {
  link_id: string;
  plan_id: string;
  plan_title: string;
};

/** Rows in `treatment_plan_sessions` for this session (for practitioner RLS). */
export async function fetchTreatmentPlanLinksForSession(
  sessionId: string,
): Promise<{ data: TreatmentPlanSessionLink[]; error: Error | null }> {
  try {
    const { data: links, error: lErr } = await supabase
      .from("treatment_plan_sessions")
      .select("id, plan_id")
      .eq("session_id", sessionId);
    if (lErr) throw lErr;
    const rows = (links || []) as { id: string; plan_id: string }[];
    if (rows.length === 0) return { data: [], error: null };

    const planIds = [...new Set(rows.map((r) => r.plan_id))];
    const { data: plans, error: pErr } = await supabase
      .from("treatment_plans")
      .select("id, title")
      .in("id", planIds);
    if (pErr) throw pErr;
    const titleById = new Map(
      ((plans || []) as { id: string; title: string }[]).map((p) => [
        p.id,
        p.title,
      ]),
    );
    const out: TreatmentPlanSessionLink[] = rows.map((r) => ({
      link_id: r.id,
      plan_id: r.plan_id,
      plan_title: titleById.get(r.plan_id) ?? "Care plan",
    }));
    return { data: out, error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

/** Sessions linked to a care plan (`treatment_plan_sessions` → `client_sessions`). */
export type TreatmentPlanLinkedSession = {
  link_id: string;
  session_id: string;
  session_date: string;
  start_time: string;
  session_type: string | null;
  status: string | null;
};

export async function fetchSessionsForTreatmentPlan(params: {
  planId: string;
  practitionerId: string;
}): Promise<{ data: TreatmentPlanLinkedSession[]; error: Error | null }> {
  try {
    const { data: links, error: lErr } = await supabase
      .from("treatment_plan_sessions")
      .select("id, session_id")
      .eq("plan_id", params.planId);
    if (lErr) throw lErr;
    const linkRows = (links || []) as {
      id: string;
      session_id: string | null;
    }[];
    const sessionIds = linkRows
      .map((r) => r.session_id)
      .filter((id): id is string => !!id);
    if (sessionIds.length === 0) return { data: [], error: null };

    const { data: sessions, error: sErr } = await supabase
      .from("client_sessions")
      .select("id, session_date, start_time, session_type, status, therapist_id")
      .in("id", sessionIds)
      .eq("therapist_id", params.practitionerId);
    if (sErr) throw sErr;

    const bySessionId = new Map(
      (
        (sessions || []) as {
          id: string;
          session_date: string;
          start_time: string;
          session_type: string | null;
          status: string | null;
        }[]
      ).map((s) => [s.id, s]),
    );

    const out: TreatmentPlanLinkedSession[] = [];
    for (const row of linkRows) {
      if (!row.session_id) continue;
      const s = bySessionId.get(row.session_id);
      if (!s) continue;
      out.push({
        link_id: row.id,
        session_id: s.id,
        session_date: s.session_date,
        start_time: s.start_time,
        session_type: s.session_type,
        status: s.status,
      });
    }
    out.sort((a, b) =>
      `${b.session_date}T${b.start_time}`.localeCompare(
        `${a.session_date}T${a.start_time}`,
      ),
    );
    return { data: out, error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function linkSessionToTreatmentPlan(params: {
  planId: string;
  sessionId: string;
  notes?: string | null;
  adherence?: number | null;
}): Promise<{ data: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc("link_session_to_plan", {
      p_plan_id: params.planId,
      p_session_id: params.sessionId,
      p_notes: params.notes ?? null,
      p_adherence: params.adherence ?? null,
    });
    if (error) throw error;
    return { data: data as string, error: null };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

/** Parse JSONB goals/interventions to string arrays for forms */
export function jsonbToStringList(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) {
    return v.map((x) => (typeof x === "string" ? x : JSON.stringify(x)));
  }
  return [];
}
