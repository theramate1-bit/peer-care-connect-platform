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
  /** Incoming: who asked you. */
  requester_name?: string;
  /** Outgoing: who you asked. */
  recipient_name?: string;
};

/** Single request for detail screen (requester or recipient only). */
export type ExchangeRequestDetail = ExchangeRequestRow & {
  updated_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  reciprocal_booking_deadline: string | null;
  requester_name: string;
  recipient_name: string;
  viewerRole: "requester" | "recipient";
};

export async function fetchExchangeRequestByIdForParticipant(params: {
  requestId: string;
  userId: string;
}): Promise<{ data: ExchangeRequestDetail | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("treatment_exchange_requests")
      .select(
        "id, requester_id, recipient_id, status, created_at, updated_at, requested_session_date, requested_start_time, requested_end_time, duration_minutes, session_type, requester_notes, recipient_notes, accepted_at, declined_at, reciprocal_booking_deadline",
      )
      .eq("id", params.requestId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { data: null, error: null };

    const row = data as Record<string, unknown>;
    const requesterId = String(row.requester_id);
    const recipientId = String(row.recipient_id);
    if (requesterId !== params.userId && recipientId !== params.userId) {
      return { data: null, error: new Error("Not found") };
    }
    const viewerRole: "requester" | "recipient" =
      requesterId === params.userId ? "requester" : "recipient";

    const { data: users, error: uErr } = await supabase
      .from("users")
      .select("id, first_name, last_name")
      .in("id", [requesterId, recipientId]);
    if (uErr) throw uErr;

    const nameFor = (uid: string): string => {
      const u = (users || []).find((x: { id: string }) => x.id === uid) as
        | { first_name: string | null; last_name: string | null }
        | undefined;
      if (!u) return "Practitioner";
      const n = `${u.first_name || ""} ${u.last_name || ""}`.trim();
      return n || "Practitioner";
    };

    const base: ExchangeRequestRow = {
      id: String(row.id),
      requester_id: requesterId,
      recipient_id: recipientId,
      status: row.status != null ? String(row.status) : null,
      created_at: row.created_at != null ? String(row.created_at) : null,
      requested_session_date:
        row.requested_session_date != null
          ? String(row.requested_session_date).slice(0, 10)
          : null,
      requested_start_time:
        row.requested_start_time != null
          ? String(row.requested_start_time)
          : null,
      requested_end_time:
        row.requested_end_time != null ? String(row.requested_end_time) : null,
      duration_minutes:
        typeof row.duration_minutes === "number"
          ? row.duration_minutes
          : row.duration_minutes != null
            ? Number(row.duration_minutes)
            : null,
      session_type: row.session_type != null ? String(row.session_type) : null,
      requester_notes:
        row.requester_notes != null ? String(row.requester_notes) : null,
      recipient_notes:
        row.recipient_notes != null ? String(row.recipient_notes) : null,
    };

    const detail: ExchangeRequestDetail = {
      ...base,
      requester_name: nameFor(requesterId),
      recipient_name: nameFor(recipientId),
      viewerRole,
      updated_at: row.updated_at != null ? String(row.updated_at) : null,
      accepted_at: row.accepted_at != null ? String(row.accepted_at) : null,
      declined_at: row.declined_at != null ? String(row.declined_at) : null,
      reciprocal_booking_deadline:
        row.reciprocal_booking_deadline != null
          ? String(row.reciprocal_booking_deadline)
          : null,
    };
    return { data: detail, error: null };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

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

/** Pending requests you sent (waiting on the other practitioner). */
export async function fetchPendingExchangeRequestsSentByRequester(
  requesterId: string,
): Promise<{ data: ExchangeRequestRow[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("treatment_exchange_requests")
      .select(
        "id, requester_id, recipient_id, status, created_at, requested_session_date, requested_start_time, requested_end_time, duration_minutes, session_type, requester_notes, recipient_notes",
      )
      .eq("requester_id", requesterId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (data || []) as ExchangeRequestRow[];
    const ids = [...new Set(rows.map((r) => r.recipient_id))];
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
      recipient_name: nameById.get(r.recipient_id) ?? "Practitioner",
    }));
    return { data: enriched, error: null };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function cancelExchangeRequestByRequester(params: {
  requestId: string;
  requesterId: string;
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const { error } = await supabase.rpc(
      "cancel_exchange_request_by_requester",
      {
        p_request_id: params.requestId,
        p_requester_id: params.requesterId,
      },
    );
    if (error) throw error;
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
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
    const { data, error } = await supabase.rpc(
      "book_exchange_reciprocal_session",
      {
        p_request_id: params.requestId,
        p_recipient_id: params.recipientId,
        p_session_date: params.sessionDate,
        p_start_time: params.startTime,
        p_duration_minutes: params.durationMinutes ?? 60,
      },
    );
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
      const row = u as {
        id: string;
        first_name: string | null;
        last_name: string | null;
      };
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
    const from = params.fromDate ?? new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase.rpc(
      "get_exchange_reciprocal_available_slots",
      {
        p_request_id: params.requestId,
        p_recipient_id: params.recipientId,
        p_from_date: from,
        p_day_count: params.dayCount ?? 14,
      },
    );
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
