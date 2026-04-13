/**
 * Legacy `projects` table (therapist_profiles-scoped).
 */

import { supabase } from "@/lib/supabase";
import { fetchTherapistProfileRowByUserId } from "./practitionerTherapistProfile";

export type ProjectRow = {
  id: string;
  client_id: string;
  therapist_id: string;
  project_name: string;
  project_description: string | null;
  project_type: string;
  project_status: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ProjectRowWithClient = ProjectRow & { client_name: string };

export type ProjectPhaseRow = {
  id: string;
  project_id: string;
  phase_name: string;
  phase_description: string | null;
  phase_order: number;
  phase_status: string | null;
  start_date: string | null;
  end_date: string | null;
};

export type PractitionerProjectUpdate = {
  project_name: string;
  project_description: string | null;
  project_type: string;
  project_status: string;
  start_date: string | null;
  end_date: string | null;
};

async function enrichProjectsWithClientNames(
  rows: ProjectRow[],
): Promise<ProjectRowWithClient[]> {
  const ids = [...new Set(rows.map((r) => r.client_id).filter(Boolean))];
  if (ids.length === 0) {
    return rows.map((r) => ({ ...r, client_name: "Client" }));
  }
  const { data: users, error } = await supabase
    .from("users")
    .select("id, first_name, last_name")
    .in("id", ids);
  if (error) {
    return rows.map((r) => ({ ...r, client_name: "Client" }));
  }
  const nameById = new Map<string, string>();
  for (const u of (users || []) as {
    id: string;
    first_name: string | null;
    last_name: string | null;
  }[]) {
    const n = `${u.first_name || ""} ${u.last_name || ""}`.trim();
    nameById.set(u.id, n || "Client");
  }
  return rows.map((r) => ({
    ...r,
    client_name: nameById.get(r.client_id) ?? "Client",
  }));
}

export async function fetchProjectsForTherapistUser(
  userId: string,
): Promise<{ data: ProjectRowWithClient[]; error: Error | null }> {
  try {
    const { data: tp, error: tpErr } =
      await fetchTherapistProfileRowByUserId(userId);
    if (tpErr) throw tpErr;
    if (!tp?.id) return { data: [], error: null };

    const { data, error } = await supabase
      .from("projects")
      .select(
        "id, client_id, therapist_id, project_name, project_description, project_type, project_status, start_date, end_date, created_at, updated_at",
      )
      .eq("therapist_id", tp.id)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    const rows = (data || []) as ProjectRow[];
    const enriched = await enrichProjectsWithClientNames(rows);
    return { data: enriched, error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function fetchProjectById(
  projectId: string,
  therapistUserId: string,
): Promise<{ data: ProjectRowWithClient | null; error: Error | null }> {
  try {
    const { data: tp, error: tpErr } =
      await fetchTherapistProfileRowByUserId(therapistUserId);
    if (tpErr) throw tpErr;
    if (!tp?.id) return { data: null, error: null };

    const { data, error } = await supabase
      .from("projects")
      .select(
        "id, client_id, therapist_id, project_name, project_description, project_type, project_status, start_date, end_date, created_at, updated_at",
      )
      .eq("id", projectId)
      .eq("therapist_id", tp.id)
      .maybeSingle();
    if (error) throw error;
    const row = data as ProjectRow | null;
    if (!row) return { data: null, error: null };
    const [enriched] = await enrichProjectsWithClientNames([row]);
    return { data: enriched, error: null };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function updatePractitionerProject(
  projectId: string,
  therapistUserId: string,
  patch: PractitionerProjectUpdate,
): Promise<{ data: ProjectRowWithClient | null; error: Error | null }> {
  try {
    const { data: tp, error: tpErr } =
      await fetchTherapistProfileRowByUserId(therapistUserId);
    if (tpErr) throw tpErr;
    if (!tp?.id) {
      return { data: null, error: new Error("No therapist profile") };
    }

    const { error } = await supabase
      .from("projects")
      .update({
        project_name: patch.project_name.trim(),
        project_description: patch.project_description?.trim() || null,
        project_type: patch.project_type.trim(),
        project_status: patch.project_status,
        start_date: patch.start_date?.trim() || null,
        end_date: patch.end_date?.trim() || null,
      })
      .eq("id", projectId)
      .eq("therapist_id", tp.id);
    if (error) throw error;
    return fetchProjectById(projectId, therapistUserId);
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function fetchProjectPhasesForProject(
  projectId: string,
): Promise<{ data: ProjectPhaseRow[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("project_phases")
      .select(
        "id, project_id, phase_name, phase_description, phase_order, phase_status, start_date, end_date",
      )
      .eq("project_id", projectId)
      .order("phase_order", { ascending: true });
    if (error) throw error;
    return { data: (data || []) as ProjectPhaseRow[], error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export type PractitionerProjectPhaseCreate = {
  phase_name: string;
  phase_description: string | null;
  phase_order: number;
  phase_status: string;
  start_date: string | null;
  end_date: string | null;
};

export type PractitionerProjectPhaseUpdate = {
  phase_name: string;
  phase_description: string | null;
  phase_order: number;
  phase_status: string;
  start_date: string | null;
  end_date: string | null;
};

export async function createProjectPhase(
  projectId: string,
  patch: PractitionerProjectPhaseCreate,
): Promise<{ data: ProjectPhaseRow | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("project_phases")
      .insert({
        project_id: projectId,
        phase_name: patch.phase_name.trim(),
        phase_description: patch.phase_description?.trim() || null,
        phase_order: patch.phase_order,
        phase_status: patch.phase_status,
        start_date: patch.start_date?.trim() || null,
        end_date: patch.end_date?.trim() || null,
      })
      .select(
        "id, project_id, phase_name, phase_description, phase_order, phase_status, start_date, end_date",
      )
      .single();
    if (error) throw error;
    return { data: (data || null) as ProjectPhaseRow | null, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function updateProjectPhase(
  phaseId: string,
  patch: PractitionerProjectPhaseUpdate,
): Promise<{ data: ProjectPhaseRow | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("project_phases")
      .update({
        phase_name: patch.phase_name.trim(),
        phase_description: patch.phase_description?.trim() || null,
        phase_order: patch.phase_order,
        phase_status: patch.phase_status,
        start_date: patch.start_date?.trim() || null,
        end_date: patch.end_date?.trim() || null,
      })
      .eq("id", phaseId)
      .select(
        "id, project_id, phase_name, phase_description, phase_order, phase_status, start_date, end_date",
      )
      .single();
    if (error) throw error;
    return { data: (data || null) as ProjectPhaseRow | null, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function deleteProjectPhase(
  phaseId: string,
): Promise<{ ok: true; error: null } | { ok: false; error: Error }> {
  try {
    const { error } = await supabase.from("project_phases").delete().eq("id", phaseId);
    if (error) throw error;
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e : new Error(String(e)) };
  }
}
