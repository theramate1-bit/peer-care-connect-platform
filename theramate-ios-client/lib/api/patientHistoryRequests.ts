/**
 * Patient history transfer requests — same tables as web `PatientHistoryRequestService`.
 */

import { supabase } from "@/lib/supabase";

export type PreviousPractitioner = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  session_count: number;
  last_session_date?: string;
};

export async function getPreviousPractitionersForClient(params: {
  clientId: string;
  excludePractitionerId: string;
}): Promise<{ data: PreviousPractitioner[]; error: Error | null }> {
  try {
    const { data: sessions, error: sessionsError } = await supabase
      .from("client_sessions")
      .select("therapist_id, session_date")
      .eq("client_id", params.clientId)
      .order("session_date", { ascending: false });

    if (sessionsError) throw sessionsError;

    const practitionerMap = new Map<
      string,
      { session_count: number; last_session_date?: string }
    >();

    for (const session of sessions || []) {
      const tid = session.therapist_id as string;
      if (!tid || tid === params.excludePractitionerId) continue;
      const existing = practitionerMap.get(tid);
      if (existing) {
        existing.session_count++;
        if (
          !existing.last_session_date ||
          new Date(session.session_date as string) >
            new Date(existing.last_session_date)
        ) {
          existing.last_session_date = session.session_date as string;
        }
      } else {
        practitionerMap.set(tid, {
          session_count: 1,
          last_session_date: session.session_date as string,
        });
      }
    }

    const practitionerIds = [...practitionerMap.keys()];
    if (practitionerIds.length === 0) return { data: [], error: null };

    const { data: practitioners, error: practitionersError } = await supabase
      .from("users")
      .select("id, first_name, last_name, email")
      .in("id", practitionerIds);

    if (practitionersError) throw practitionersError;

    const rows: PreviousPractitioner[] = (practitioners || []).map((p) => {
      const stats = practitionerMap.get(p.id)!;
      return {
        id: p.id,
        first_name: p.first_name || "",
        last_name: p.last_name || "",
        email: p.email || "",
        session_count: stats.session_count,
        last_session_date: stats.last_session_date,
      };
    });

    rows.sort((a, b) => {
      if (a.last_session_date && b.last_session_date) {
        return (
          new Date(b.last_session_date).getTime() -
          new Date(a.last_session_date).getTime()
        );
      }
      return b.session_count - a.session_count;
    });

    return { data: rows, error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function createPatientHistoryRequest(params: {
  clientId: string;
  requestingPractitionerId: string;
  previousPractitionerId: string;
  requestNotes?: string;
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const { data: existing } = await supabase
      .from("patient_history_requests")
      .select("id")
      .eq("client_id", params.clientId)
      .eq("requesting_practitioner_id", params.requestingPractitionerId)
      .eq("previous_practitioner_id", params.previousPractitionerId)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return {
        ok: false,
        error: new Error(
          "You already have a pending request for this patient and practitioner.",
        ),
      };
    }

    const { error } = await supabase.from("patient_history_requests").insert({
      requesting_practitioner_id: params.requestingPractitionerId,
      previous_practitioner_id: params.previousPractitionerId,
      client_id: params.clientId,
      request_notes: params.requestNotes?.trim() || null,
      status: "pending",
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

export type PatientHistoryRequestListItem = {
  id: string;
  client_id: string;
  previous_practitioner_id: string;
  status: string;
  requested_at: string;
  request_notes: string | null;
  previous_practitioner_name: string;
  client_name?: string;
};

async function mapPreviousPractitionerNames(
  rows: {
    id: string;
    client_id: string;
    previous_practitioner_id: string;
    status: string;
    requested_at: string;
    request_notes: string | null;
  }[],
  includeClientNames: boolean,
): Promise<PatientHistoryRequestListItem[]> {
  if (rows.length === 0) return [];

  const prevIds = [...new Set(rows.map((r) => r.previous_practitioner_id))];
  const clientIds = includeClientNames
    ? [...new Set(rows.map((r) => r.client_id))]
    : [];

  const [{ data: prevUsers }, { data: clientUsers }] = await Promise.all([
    prevIds.length
      ? supabase
          .from("users")
          .select("id, first_name, last_name")
          .in("id", prevIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            first_name: string | null;
            last_name: string | null;
          }[],
        }),
    clientIds.length
      ? supabase
          .from("users")
          .select("id, first_name, last_name")
          .in("id", clientIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            first_name: string | null;
            last_name: string | null;
          }[],
        }),
  ]);

  const prevMap = new Map<string, string>();
  for (const u of prevUsers || []) {
    const n =
      `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Practitioner";
    prevMap.set(u.id, n);
  }
  const clientMap = new Map<string, string>();
  for (const u of clientUsers || []) {
    const n = `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Client";
    clientMap.set(u.id, n);
  }

  return rows.map((r) => ({
    ...r,
    previous_practitioner_name:
      prevMap.get(r.previous_practitioner_id) || "Previous practitioner",
    client_name: includeClientNames ? clientMap.get(r.client_id) : undefined,
  }));
}

/** Outgoing requests from this practitioner for one client (client hub History tab). */
export async function fetchMyHistoryRequestsForClient(params: {
  practitionerId: string;
  clientId: string;
}): Promise<{ data: PatientHistoryRequestListItem[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("patient_history_requests")
      .select(
        "id, client_id, previous_practitioner_id, status, requested_at, request_notes",
      )
      .eq("requesting_practitioner_id", params.practitionerId)
      .eq("client_id", params.clientId)
      .order("requested_at", { ascending: false });

    if (error) throw error;
    const rows = (data || []) as {
      id: string;
      client_id: string;
      previous_practitioner_id: string;
      status: string;
      requested_at: string;
      request_notes: string | null;
    }[];

    const mapped = await mapPreviousPractitionerNames(rows, false);
    return { data: mapped, error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

/** All outgoing history requests (global list). */
export async function fetchAllMyHistoryRequests(
  practitionerId: string,
): Promise<{
  data: PatientHistoryRequestListItem[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("patient_history_requests")
      .select(
        "id, client_id, previous_practitioner_id, status, requested_at, request_notes",
      )
      .eq("requesting_practitioner_id", practitionerId)
      .order("requested_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    const rows = (data || []) as {
      id: string;
      client_id: string;
      previous_practitioner_id: string;
      status: string;
      requested_at: string;
      request_notes: string | null;
    }[];

    const mapped = await mapPreviousPractitionerNames(rows, true);
    return { data: mapped, error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function cancelPatientHistoryRequest(params: {
  requestId: string;
  requestingPractitionerId: string;
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from("patient_history_requests")
      .update({
        status: "cancelled",
        responded_at: new Date().toISOString(),
      })
      .eq("id", params.requestId)
      .eq("requesting_practitioner_id", params.requestingPractitionerId)
      .eq("status", "pending");

    if (error) throw error;
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}
