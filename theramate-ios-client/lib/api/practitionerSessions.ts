/**
 * Practitioner session list — therapist-scoped `client_sessions` with client names.
 */

import { supabase } from "@/lib/supabase";

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

export type SessionWithClient = {
  id: string;
  client_id: string | null;
  therapist_id: string | null;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string | null;
  price: number | null;
  status: string | null;
  payment_status: string | null;
  appointment_type: string | null;
  visit_address: string | null;
  client_name: string;
};

export function getSessionStartDate(s: SessionWithClient): Date {
  return combineDateTime(s.session_date, s.start_time);
}

export function isSessionUpcoming(s: SessionWithClient): boolean {
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

/** Web practice diary hides these so the calendar is not cluttered with invalid holds. */
export function isDiarySessionVisible(s: SessionWithClient): boolean {
  const st = (s.status || "").toLowerCase();
  const excluded = new Set([
    "pending_payment",
    "expired",
    "cancelled",
    "no_show",
    "declined",
  ]);
  return !excluded.has(st);
}

const PRACTITIONER_SESSION_SELECT =
  "id, client_id, therapist_id, client_name, session_date, start_time, duration_minutes, session_type, price, status, payment_status, appointment_type, visit_address, is_peer_booking";

type PractitionerSessionRow = {
  id: string;
  client_id: string | null;
  therapist_id: string | null;
  client_name: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string | null;
  price: number | null;
  status: string | null;
  payment_status: string | null;
  appointment_type: string | null;
  visit_address: string | null;
  is_peer_booking: boolean | null;
};

function sortSessionsByDateTimeDesc(rows: PractitionerSessionRow[]): void {
  rows.sort((a, b) => {
    const ta = `${a.session_date}T${a.start_time.includes(":") ? a.start_time : `${a.start_time}:00`}`;
    const tb = `${b.session_date}T${b.start_time.includes(":") ? b.start_time : `${b.start_time}:00`}`;
    return tb.localeCompare(ta);
  });
}

export async function fetchPractitionerSessions(therapistId: string): Promise<{
  data: SessionWithClient[];
  error: Error | null;
}> {
  try {
    /** Two queries avoid fragile PostgREST `or(and(...))` strings that can 400 or hang on some SDK versions. */
    const [asTherapist, asPeerClient] = await Promise.all([
      supabase
        .from("client_sessions")
        .select(PRACTITIONER_SESSION_SELECT)
        .eq("therapist_id", therapistId),
      supabase
        .from("client_sessions")
        .select(PRACTITIONER_SESSION_SELECT)
        .eq("client_id", therapistId)
        .eq("is_peer_booking", true),
    ]);

    if (asTherapist.error) throw asTherapist.error;
    if (asPeerClient.error) throw asPeerClient.error;

    const byId = new Map<string, PractitionerSessionRow>();
    for (const r of (asTherapist.data || []) as PractitionerSessionRow[]) {
      byId.set(r.id, r);
    }
    for (const r of (asPeerClient.data || []) as PractitionerSessionRow[]) {
      byId.set(r.id, r);
    }
    const sessionRows = [...byId.values()];
    sortSessionsByDateTimeDesc(sessionRows);

    const sessions: SessionWithClient[] = sessionRows.map((row) => ({
      id: row.id,
      client_id: row.client_id,
      therapist_id: row.therapist_id,
      session_date: row.session_date,
      start_time: row.start_time,
      duration_minutes: row.duration_minutes,
      session_type: row.session_type,
      price: row.price,
      status: row.status,
      payment_status: row.payment_status,
      appointment_type: row.appointment_type,
      visit_address: row.visit_address,
      client_name: row.client_name?.trim() || "Client",
    }));

    return { data: sessions, error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: [], error: err };
  }
}

export async function fetchPractitionerSessionById(params: {
  therapistId: string;
  sessionId: string;
}): Promise<{ data: SessionWithClient | null; error: Error | null }> {
  try {
    const { data: row, error } = await supabase
      .from("client_sessions")
      .select(PRACTITIONER_SESSION_SELECT)
      .eq("id", params.sessionId)
      .maybeSingle();

    if (error) throw error;
    if (!row) return { data: null, error: null };

    const r = row as PractitionerSessionRow;
    const allowed =
      r.therapist_id === params.therapistId ||
      (r.client_id === params.therapistId && r.is_peer_booking === true);
    if (!allowed) return { data: null, error: null };

    const clientName = r.client_name?.trim() || "Client";

    return {
      data: {
        id: r.id,
        client_id: r.client_id,
        therapist_id: r.therapist_id,
        session_date: r.session_date,
        start_time: r.start_time,
        duration_minutes: r.duration_minutes,
        session_type: r.session_type,
        price: r.price,
        status: r.status,
        payment_status: r.payment_status,
        appointment_type: r.appointment_type,
        visit_address: r.visit_address,
        client_name: clientName,
      },
      error: null,
    };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: null, error: err };
  }
}
