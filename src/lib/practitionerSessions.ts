/**
 * Practitioner session list — therapist-scoped `client_sessions` with client names.
 */

import { supabase } from "@/integrations/supabase/client";

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

/** Matches web `BookingCalendar` therapist session status filter. */
export const DIARY_SESSION_STATUSES = [
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
] as const;

export type DiarySessionCategory = "client" | "peer" | "guest";

/** Same classification as web `BookingCalendar` (peer / guest / client). */
export function getSessionDiaryCategory(
  s: SessionWithClient,
): DiarySessionCategory {
  if (s.is_peer_booking === true) return "peer";
  if (s.is_guest_booking === true) return "guest";
  return "client";
}

export type SessionWithClient = {
  id: string;
  client_id: string | null;
  /** Present when stored on `client_sessions` (guest + registered). */
  client_email: string | null;
  therapist_id: string | null;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string | null;
  price: number | null;
  status: string | null;
  payment_status: string | null;
  payment_collection: string | null;
  appointment_type: string | null;
  visit_address: string | null;
  client_name: string;
  is_peer_booking: boolean | null;
  is_guest_booking: boolean | null;
  /** Booking notes / session summary on `client_sessions` (web “Session” column). */
  notes: string | null;
  session_number: number | null;
  created_at: string | null;
  pre_assessment_required: boolean | null;
  pre_assessment_completed: boolean | null;
  pre_assessment_form_id: string | null;
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
  "id, client_id, client_email, therapist_id, client_name, session_date, start_time, duration_minutes, session_type, price, status, payment_status, payment_collection, appointment_type, visit_address, is_peer_booking, is_guest_booking, notes, session_number, created_at, pre_assessment_required, pre_assessment_completed, pre_assessment_form_id";

type PractitionerSessionRow = {
  id: string;
  client_id: string | null;
  client_email: string | null;
  therapist_id: string | null;
  client_name: string;
  session_date: string;
  start_time: string;
  duration_minutes: number;
  session_type: string | null;
  price: number | null;
  status: string | null;
  payment_status: string | null;
  payment_collection: string | null;
  appointment_type: string | null;
  visit_address: string | null;
  is_peer_booking: boolean | null;
  is_guest_booking: boolean | null;
  notes: string | null;
  session_number: number | null;
  created_at: string | null;
  pre_assessment_required: boolean | null;
  pre_assessment_completed: boolean | null;
  pre_assessment_form_id: string | null;
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
    const statusList = [...DIARY_SESSION_STATUSES];
    const [asTherapist, asPeerClient] = await Promise.all([
      supabase
        .from("client_sessions")
        .select(PRACTITIONER_SESSION_SELECT)
        .eq("therapist_id", therapistId)
        .in("status", statusList),
      supabase
        .from("client_sessions")
        .select(PRACTITIONER_SESSION_SELECT)
        .eq("client_id", therapistId)
        .eq("is_peer_booking", true)
        .in("status", statusList),
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
      client_email: row.client_email ?? null,
      therapist_id: row.therapist_id,
      session_date: row.session_date,
      start_time: row.start_time,
      duration_minutes: row.duration_minutes,
      session_type: row.session_type,
      price: row.price,
      status: row.status,
      payment_status: row.payment_status,
      payment_collection: row.payment_collection,
      appointment_type: row.appointment_type,
      visit_address: row.visit_address,
      client_name: row.client_name?.trim() || "Client",
      is_peer_booking: row.is_peer_booking,
      is_guest_booking: row.is_guest_booking,
      notes: row.notes ?? null,
      session_number: row.session_number ?? null,
      created_at: row.created_at ?? null,
      pre_assessment_required: row.pre_assessment_required ?? null,
      pre_assessment_completed: row.pre_assessment_completed ?? null,
      pre_assessment_form_id: row.pre_assessment_form_id ?? null,
    }));

    return { data: sessions, error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: [], error: err };
  }
}

/** Practitioner marks an in_person (pay-at-clinic) session as paid. */
export async function markSessionPaidInPerson(params: {
  sessionId: string;
  method?: string;
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc("mark_session_paid_in_person", {
      p_session_id: params.sessionId,
      p_method: (params.method || "cash").trim(),
    });
    if (error) throw error;
    const result = (data || {}) as { success?: boolean; error?: string };
    if (!result.success) {
      throw new Error(result.error || "Could not mark session as paid");
    }
    return { ok: true, error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { ok: false, error: err };
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
        client_email: r.client_email ?? null,
        therapist_id: r.therapist_id,
        session_date: r.session_date,
        start_time: r.start_time,
        duration_minutes: r.duration_minutes,
        session_type: r.session_type,
        price: r.price,
        status: r.status,
        payment_status: r.payment_status,
        payment_collection: r.payment_collection,
        appointment_type: r.appointment_type,
        visit_address: r.visit_address,
        client_name: clientName,
        is_peer_booking: r.is_peer_booking,
        is_guest_booking: r.is_guest_booking,
        notes: r.notes ?? null,
        session_number: r.session_number ?? null,
        created_at: r.created_at ?? null,
        pre_assessment_required: r.pre_assessment_required ?? null,
        pre_assessment_completed: r.pre_assessment_completed ?? null,
        pre_assessment_form_id: r.pre_assessment_form_id ?? null,
      },
      error: null,
    };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: null, error: err };
  }
}

/**
 * Session # for a client (matches web `calculateSessionNumber` in PracticeClientManagement).
 */
export function calculatePractitionerClientSessionNumber(
  session: SessionWithClient,
  allPractitionerSessions: SessionWithClient[],
): number {
  if (session.session_number != null && session.session_number > 0) {
    return session.session_number;
  }

  const clientSessions = allPractitionerSessions
    .filter((s) => {
      if (session.client_id) return s.client_id === session.client_id;
      const a = session.client_email
        ? normalizeClientEmail(session.client_email)
        : "";
      const b = s.client_email ? normalizeClientEmail(s.client_email) : "";
      return a && b && a === b;
    })
    .sort((a, b) => {
      const dateA = new Date(a.session_date).getTime();
      const dateB = new Date(b.session_date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      const createdA = new Date(a.created_at || a.session_date).getTime();
      const createdB = new Date(b.created_at || b.session_date).getTime();
      return createdA - createdB;
    });

  const index = clientSessions.findIndex((s) => s.id === session.id);
  return index >= 0 ? index + 1 : 0;
}

function normalizeClientEmail(email: string): string {
  return email.trim().toLowerCase().replace("@googlemail.com", "@gmail.com");
}
