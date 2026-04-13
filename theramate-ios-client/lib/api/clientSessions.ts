/**
 * Client sessions list — mirrors web `MySessions.loadSessions` (simplified).
 */

import { supabase } from "@/lib/supabase";

export type SessionWithTherapist = {
  id: string;
  therapist_id: string | null;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string | null;
  price: number | null;
  status: string | null;
  payment_status: string | null;
  therapist_name: string;
};

function combineDateTime(sessionDate: string, startTime: string): Date {
  const t = startTime.includes(":") ? startTime : `${startTime}:00`;
  return new Date(`${sessionDate}T${t}`);
}

function parseDateParts(sessionDate: string): {
  year: number;
  month: number;
  day: number;
} | null {
  const [y, m, d] = sessionDate.split("-").map((n) => Number(n));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return null;
  }
  return { year: y, month: m, day: d };
}

function parseStartMinutes(startTime: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(startTime);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

/** Start datetime for sorting and display */
export function getSessionStartDate(s: SessionWithTherapist): Date {
  return combineDateTime(s.session_date, s.start_time);
}

/** Treat as upcoming if datetime is in the future and not in a terminal state */
export function isSessionUpcoming(s: SessionWithTherapist): boolean {
  const terminal = new Set([
    "completed",
    "cancelled",
    "no_show",
    "declined",
    "expired",
  ]);
  const st = (s.status || "").toLowerCase();
  if (terminal.has(st)) return false;
  // Compare local calendar day + time to avoid timezone parsing quirks for date + time columns.
  const parts = parseDateParts(s.session_date);
  const startMinutes = parseStartMinutes(s.start_time);
  if (parts && startMinutes != null) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = new Date(parts.year, parts.month - 1, parts.day);
    if (day > today) return true;
    if (day < today) return false;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return startMinutes >= nowMinutes;
  }
  return combineDateTime(s.session_date, s.start_time) >= new Date();
}

export async function fetchClientSessions(clientId: string): Promise<{
  data: SessionWithTherapist[];
  error: Error | null;
}> {
  try {
    /** Embed therapist via FK so one round-trip; avoids a separate `users` query that RLS can block for clients. */
    const { data: rows, error } = await supabase
      .from("client_sessions")
      .select(
        `
        id,
        therapist_id,
        session_date,
        start_time,
        duration_minutes,
        session_type,
        price,
        status,
        payment_status,
        therapist:therapist_id (
          first_name,
          last_name
        )
      `,
      )
      .eq("client_id", clientId)
      .order("session_date", { ascending: false });

    if (error) throw error;

    type SessionRow = {
      id: string;
      therapist_id: string | null;
      session_date: string;
      start_time: string;
      duration_minutes: number;
      session_type: string | null;
      price: number | null;
      status: string | null;
      payment_status: string | null;
      /** Supabase may return one object or a single-element array for FK embeds. */
      therapist:
        | { first_name: string | null; last_name: string | null }
        | { first_name: string | null; last_name: string | null }[]
        | null;
    };

    const sessionRows = (rows || []) as SessionRow[];

    const sessions: SessionWithTherapist[] = sessionRows.map((row) => {
      const therapistId = row.therapist_id as string | null;
      const raw = row.therapist;
      const t = Array.isArray(raw) ? raw[0] : raw;
      const therapist_name = t
        ? `${t.first_name || ""} ${t.last_name || ""}`.trim() || "Therapist"
        : "Therapist";
      return {
        id: row.id as string,
        therapist_id: therapistId,
        session_date: row.session_date as string,
        start_time: row.start_time as string,
        duration_minutes: row.duration_minutes as number,
        session_type: row.session_type as string | null,
        price: row.price as number | null,
        status: row.status as string | null,
        payment_status: row.payment_status as string | null,
        therapist_name,
      };
    });

    return { data: sessions, error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: [], error: err };
  }
}

export async function fetchClientSessionById(params: {
  clientId: string;
  sessionId: string;
}): Promise<{ data: SessionWithTherapist | null; error: Error | null }> {
  try {
    const { data: row, error } = await supabase
      .from("client_sessions")
      .select(
        `
        id,
        therapist_id,
        session_date,
        start_time,
        duration_minutes,
        session_type,
        price,
        status,
        payment_status,
        therapist:therapist_id (
          first_name,
          last_name
        )
      `,
      )
      .eq("id", params.sessionId)
      .eq("client_id", params.clientId)
      .maybeSingle();

    if (error) throw error;
    if (!row) return { data: null, error: null };

    const r = row as {
      id: string;
      therapist_id: string | null;
      session_date: string;
      start_time: string;
      duration_minutes: number;
      session_type: string | null;
      price: number | null;
      status: string | null;
      payment_status: string | null;
      therapist:
        | { first_name: string | null; last_name: string | null }
        | { first_name: string | null; last_name: string | null }[]
        | null;
    };

    const rawT = r.therapist;
    const t = Array.isArray(rawT) ? rawT[0] : rawT;
    const therapistName = t
      ? `${t.first_name || ""} ${t.last_name || ""}`.trim() || "Therapist"
      : "Therapist";

    return {
      data: {
        id: r.id,
        therapist_id: r.therapist_id,
        session_date: r.session_date,
        start_time: r.start_time,
        duration_minutes: r.duration_minutes,
        session_type: r.session_type,
        price: r.price,
        status: r.status,
        payment_status: r.payment_status,
        therapist_name: therapistName,
      },
      error: null,
    };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: null, error: err };
  }
}

export async function cancelClientSession(params: {
  clientId: string;
  sessionId: string;
  reason?: string;
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const updates: Record<string, unknown> = {
      status: "cancelled",
      cancellation_reason: params.reason || "Cancelled by client",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("client_sessions")
      .update(updates)
      .eq("id", params.sessionId)
      .eq("client_id", params.clientId)
      .in("status", [
        "scheduled",
        "confirmed",
        "pending_payment",
        "pending_approval",
      ]);

    if (error) throw error;
    return { ok: true, error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { ok: false, error: err };
  }
}
