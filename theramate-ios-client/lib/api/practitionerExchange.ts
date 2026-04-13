/**
 * Treatment exchange requests — pending inbox for practitioners.
 */

import { supabase } from "@/lib/supabase";

export type ExchangeRequestRow = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: string | null;
  created_at: string | null;
  requested_session_date: string | null;
  requested_start_time: string | null;
  requested_end_time: string | null;
  duration_minutes: number | null;
  session_type: string | null;
  requester_notes: string | null;
  recipient_notes: string | null;
  /** Present when using `fetchPendingExchangeRequestsWithDetails`. */
  requester_name?: string;
};

export async function fetchPendingExchangeRequestsForRecipient(
  recipientId: string,
): Promise<{ data: ExchangeRequestRow[]; error: Error | null }> {
  return fetchPendingExchangeRequestsWithDetails(recipientId);
}

/** Pending exchanges for inbox, with requester display name. */
export async function fetchPendingExchangeRequestsWithDetails(
  recipientId: string,
): Promise<{ data: ExchangeRequestRow[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("treatment_exchange_requests")
      .select(
        "id, requester_id, recipient_id, status, created_at, requested_session_date, requested_start_time, requested_end_time, duration_minutes, session_type, requester_notes, recipient_notes",
      )
      .eq("recipient_id", recipientId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (data || []) as ExchangeRequestRow[];
    const ids = [...new Set(rows.map((r) => r.requester_id))];
    if (ids.length === 0) return { data: [], error: null };

    const { data: users, error: uErr } = await supabase
      .from("users")
      .select("id, first_name, last_name")
      .in("id", ids);
    if (uErr) throw uErr;
    const nameById = new Map<string, string>();
    for (const u of (users || []) as {
      id: string;
      first_name: string | null;
      last_name: string | null;
    }[]) {
      const n = `${u.first_name || ""} ${u.last_name || ""}`.trim();
      nameById.set(u.id, n || "Practitioner");
    }

    const enriched: ExchangeRequestRow[] = rows.map((r) => ({
      ...r,
      requester_name: nameById.get(r.requester_id) ?? "Practitioner",
    }));
    return { data: enriched, error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function declineExchangeRequest(params: {
  requestId: string;
  recipientId: string;
  reason?: string;
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const { error } = await supabase.rpc("decline_exchange_request", {
      p_request_id: params.requestId,
      p_recipient_id: params.recipientId,
      p_reason: params.reason ?? null,
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

export async function acceptExchangeRequest(params: {
  requestId: string;
  recipientId: string;
}): Promise<{ ok: boolean; error: Error | null; mutualSessionId?: string }> {
  try {
    const { data, error } = await supabase.rpc("accept_exchange_request", {
      p_request_id: params.requestId,
      p_recipient_id: params.recipientId,
    });
    if (error) throw error;
    return {
      ok: true,
      error: null,
      mutualSessionId: typeof data === "string" ? data : undefined,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function bookExchangeReciprocalSession(params: {
  requestId: string;
  recipientId: string;
  sessionDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM or HH:MM:SS
  durationMinutes?: number;
}): Promise<{ ok: boolean; error: Error | null; sessionId?: string }> {
  try {
    const { data, error } = await supabase.rpc("book_exchange_reciprocal_session", {
      p_request_id: params.requestId,
      p_recipient_id: params.recipientId,
      p_session_date: params.sessionDate,
      p_start_time: params.startTime,
      p_duration_minutes: params.durationMinutes ?? 60,
    });
    if (error) throw error;
    return {
      ok: true,
      error: null,
      sessionId: typeof data === "string" ? data : undefined,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

/** Accepted exchange where you still owe the reciprocal session (recipient = current user). */
export type ExchangeNeedingReciprocalRow = {
  mutual_session_id: string;
  exchange_request_id: string;
  requester_id: string;
  requester_name: string;
  reciprocal_booking_deadline: string | null;
  duration_minutes: number | null;
  session_type: string | null;
  requester_notes: string | null;
  /** Requester's session with you (already agreed). */
  their_session_date: string | null;
  their_start_time: string | null;
};

export async function fetchAcceptedExchangesNeedingReciprocal(
  recipientId: string,
): Promise<{ data: ExchangeNeedingReciprocalRow[]; error: Error | null }> {
  try {
    const { data: mes, error: e1 } = await supabase
      .from("mutual_exchange_sessions")
      .select(
        "id, exchange_request_id, practitioner_a_id, session_date, start_time, duration_minutes",
      )
      .eq("practitioner_b_id", recipientId)
      .eq("practitioner_b_booked", false)
      .eq("status", "active");
    if (e1) throw e1;
    if (!mes?.length) return { data: [], error: null };

    const reqIds = [...new Set(mes.map((m) => m.exchange_request_id))];
    const { data: reqs, error: e2 } = await supabase
      .from("treatment_exchange_requests")
      .select(
        "id, status, reciprocal_booking_deadline, duration_minutes, session_type, requester_notes, requester_id",
      )
      .in("id", reqIds)
      .eq("status", "accepted");
    if (e2) throw e2;
    const reqList = reqs ?? [];
    type ReqRow = (typeof reqList)[number];
    const reqById = new Map<string, ReqRow>(reqList.map((r) => [r.id, r]));

    const requesterIds = [...new Set((reqs || []).map((r) => r.requester_id))];
    const { data: users, error: e3 } = await supabase
      .from("users")
      .select("id, first_name, last_name")
      .in("id", requesterIds);
    if (e3) throw e3;
    const nameById = new Map<string, string>();
    for (const u of users || []) {
      const row = u as { id: string; first_name: string | null; last_name: string | null };
      const n = `${row.first_name || ""} ${row.last_name || ""}`.trim();
      nameById.set(row.id, n || "Practitioner");
    }

    const out: ExchangeNeedingReciprocalRow[] = [];
    for (const m of mes) {
      const r = reqById.get(m.exchange_request_id);
      if (!r) continue;
      out.push({
        mutual_session_id: m.id,
        exchange_request_id: m.exchange_request_id,
        requester_id: r.requester_id,
        requester_name: nameById.get(r.requester_id) ?? "Practitioner",
        reciprocal_booking_deadline: r.reciprocal_booking_deadline ?? null,
        duration_minutes: r.duration_minutes ?? m.duration_minutes ?? null,
        session_type: r.session_type ?? null,
        requester_notes: r.requester_notes ?? null,
        their_session_date: m.session_date ?? null,
        their_start_time: m.start_time ?? null,
      });
    }
    return { data: out, error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export type ReciprocalSlotRow = {
  session_date: string;
  start_time: string;
};

/** Server-side slots from requester's working hours minus conflicts (see migration). */
export async function fetchExchangeReciprocalAvailableSlots(params: {
  requestId: string;
  recipientId: string;
  fromDate?: string;
  dayCount?: number;
}): Promise<{ data: ReciprocalSlotRow[]; error: Error | null }> {
  try {
    const from =
      params.fromDate ?? new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase.rpc("get_exchange_reciprocal_available_slots", {
      p_request_id: params.requestId,
      p_recipient_id: params.recipientId,
      p_from_date: from,
      p_day_count: params.dayCount ?? 14,
    });
    if (error) throw error;
    const rows = (data || []) as { session_date: string; start_time: string }[];
    const normalized: ReciprocalSlotRow[] = rows.map((row) => ({
      session_date:
        typeof row.session_date === "string"
          ? row.session_date.slice(0, 10)
          : String(row.session_date).slice(0, 10),
      start_time: formatSlotTime(row.start_time),
    }));
    return { data: normalized, error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

function formatSlotTime(t: string | unknown): string {
  const s = typeof t === "string" ? t : String(t);
  const parts = s.split(":");
  if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
  return s;
}
