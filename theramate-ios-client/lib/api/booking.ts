/**
 * Practitioner products + booking RPC.
 * Slot list: 15-minute grid from `practitioner_availability` (or defaults / legacy rows),
 * then removes overlaps with `client_sessions`, active `slot_holds`, and `calendar_events`
 * (`block` / `unavailable`, `status = confirmed`). UI refetches periodically on the date step.
 */

import { unknownToError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import {
  clinicBookingIdempotencyKey,
  isMobilePaymentAlreadyComplete,
  mobileCheckoutIdempotencyKey,
  resolveClinicSessionIdFromRpc,
} from "@/lib/bookingPaymentIdempotency";
import { createSessionCheckout } from "@/lib/api/payment";
import { BOOKING_CONFIG } from "@/constants/config";

export type PractitionerProductRow = {
  id: string;
  practitioner_id: string | null;
  name: string;
  description: string | null;
  service_type: string | null;
  price_amount: number;
  duration_minutes: number | null;
  is_active: boolean | null;
  currency: string | null;
};

export async function fetchPractitionerProducts(
  practitionerId: string,
): Promise<{
  data: PractitionerProductRow[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("practitioner_products")
      .select(
        "id, practitioner_id, name, description, service_type, price_amount, duration_minutes, is_active, currency",
      )
      .eq("practitioner_id", practitionerId)
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    return { data: (data || []) as PractitionerProductRow[], error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: [], error: err };
  }
}

type AvailabilitySlotRow = {
  start_time: string;
  end_time: string;
  duration_minutes: number | null;
};

/** JS getDay() 0–6 → JSON keys in `practitioner_availability.working_hours`. */
const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const DEFAULT_PRACTITIONER_TIMEZONE = "Europe/London";

const SHORT_WEEKDAY_TO_DOW: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function normalizePractitionerTz(tz: string | null | undefined): string {
  const s = (tz || "").trim();
  return s || DEFAULT_PRACTITIONER_TIMEZONE;
}

function zonedDateTimeToUtcMs(
  dateStr: string,
  timeHHMM: string,
  timeZone: string,
): number | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!dm) return null;
  const y = Number(dm[1]);
  const mo = Number(dm[2]);
  const da = Number(dm[3]);
  const norm =
    timeHHMM.trim().length >= 5 ? timeHHMM.trim().slice(0, 5) : timeHHMM.trim();
  const tm = /^(\d{1,2}):(\d{2})$/.exec(norm);
  if (!tm) return null;
  const hh = Number(tm[1]);
  const mm = Number(tm[2]);
  if (![y, mo, da, hh, mm].every((n) => Number.isFinite(n))) return null;

  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const matchesMinute = (t: number): boolean => {
    const parts = Object.fromEntries(
      fmt
        .formatToParts(new Date(t))
        .filter((p) => p.type !== "literal")
        .map((p) => [p.type, p.value]),
    ) as Record<string, string>;
    const py = Number(parts.year);
    const pm = Number(parts.month);
    const pd = Number(parts.day);
    const ph = Number(parts.hour);
    const pmi = Number(parts.minute);
    return py === y && pm === mo && pd === da && ph === hh && pmi === mm;
  };

  const lo = Date.UTC(y, mo - 1, da - 1, 0, 0, 0);
  const hi = Date.UTC(y, mo - 1, da + 2, 0, 0, 0);
  for (let t = lo; t <= hi; t += 60 * 1000) {
    if (matchesMinute(t)) return t;
  }
  return null;
}

function addDaysToYmd(dateStr: string, days: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return dateStr;
  const u = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days);
  return new Date(u).toISOString().slice(0, 10);
}

function weekdayInPractitionerZone(dateStr: string, timeZone: string): number {
  const ms = zonedDateTimeToUtcMs(dateStr, "12:00", timeZone);
  if (ms == null) return localDayOfWeekFromDateString(dateStr);
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(new Date(ms));
  const key = short.slice(0, 3);
  return SHORT_WEEKDAY_TO_DOW[key] ?? localDayOfWeekFromDateString(dateStr);
}

function dayBoundsInPractitionerZone(
  dateStr: string,
  timeZone: string,
): { start: Date; end: Date } | null {
  const startMs = zonedDateTimeToUtcMs(dateStr, "00:00", timeZone);
  const nextYmd = addDaysToYmd(dateStr, 1);
  const endMs = zonedDateTimeToUtcMs(nextYmd, "00:00", timeZone);
  if (startMs == null || endMs == null) return null;
  return { start: new Date(startMs), end: new Date(endMs) };
}

/**
 * When a practitioner has products but never saved `practitioner_availability`
 * (common) — match calendar migration defaults so slots still appear.
 */
const DEFAULT_WORKING_HOURS: Record<
  string,
  { enabled: boolean; start: string; end: string }
> = {
  monday: { enabled: true, start: "09:00", end: "17:00" },
  tuesday: { enabled: true, start: "09:00", end: "17:00" },
  wednesday: { enabled: true, start: "09:00", end: "17:00" },
  thursday: { enabled: true, start: "09:00", end: "17:00" },
  friday: { enabled: true, start: "09:00", end: "17:00" },
  saturday: { enabled: false, start: "10:00", end: "15:00" },
  sunday: { enabled: false, start: "10:00", end: "15:00" },
};

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map((x) => Number.parseInt(x, 10) || 0);
  return h * 60 + m;
}

function toTimeString(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Parse `yyyy-MM-dd` as a local calendar date (no UTC day shift). */
function localDayOfWeekFromDateString(dateStr: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) return new Date().getDay();
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  return new Date(y, mo - 1, da, 12, 0, 0).getDay();
}

type DayWindow = { start: string; end: string };

function dayEnabled(o: Record<string, unknown>): boolean {
  const e = o.enabled;
  if (e === false || e === "false" || e === 0) return false;
  return true;
}

type BlockingInterval = { startMin: number; endMin: number };

function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Local calendar day [00:00, next 00:00) for `yyyy-MM-dd` (device timezone). */
function dayBoundsLocal(dateStr: string): { start: Date; end: Date } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!m) {
    const s = new Date();
    s.setHours(0, 0, 0, 0);
    const e = new Date(s);
    e.setDate(e.getDate() + 1);
    return { start: s, end: e };
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  return {
    start: new Date(y, mo - 1, da, 0, 0, 0),
    end: new Date(y, mo - 1, da + 1, 0, 0, 0),
  };
}

function slotOverlapsCalendarEvent(
  date: string,
  hhmm: string,
  durationMin: number,
  evStartIso: string,
  evEndIso: string,
  practitionerTimeZone: string,
): boolean {
  const slotStartMs = zonedDateTimeToUtcMs(date, hhmm, practitionerTimeZone);
  if (slotStartMs == null) {
    const slotStartMsLocal = new Date(`${date}T${hhmm}:00`).getTime();
    const slotEndMsLocal = slotStartMsLocal + durationMin * 60 * 1000;
    const es = new Date(evStartIso).getTime();
    const ee = new Date(evEndIso).getTime();
    return slotStartMsLocal < ee && es < slotEndMsLocal;
  }
  const slotEndMs = slotStartMs + durationMin * 60 * 1000;
  const es = new Date(evStartIso).getTime();
  const ee = new Date(evEndIso).getTime();
  return slotStartMs < ee && es < slotEndMs;
}

/** Exclude starts where [start, start+duration) overlaps sessions, holds, or calendar blocks. */
async function filterCandidatesByBlocks(
  candidates: string[],
  practitionerId: string,
  date: string,
  durationMin: number,
  practitionerTimeZone: string,
): Promise<string[]> {
  if (candidates.length === 0) return [];

  const blocks: BlockingInterval[] = [];

  const { data: sessions, error: sErr } = await supabase
    .from("client_sessions")
    .select("start_time, duration_minutes, status, expires_at")
    .eq("therapist_id", practitionerId)
    .eq("session_date", date);

  if (sErr) throw sErr;

  const now = Date.now();
  const terminalStatuses = new Set([
    "cancelled",
    "completed",
    "no_show",
    "declined",
    "expired",
  ]);

  for (const s of sessions || []) {
    const st = String(s.status ?? "").toLowerCase();
    if (terminalStatuses.has(st)) continue;
    if (st === "pending_payment") {
      const exp = s.expires_at;
      if (!exp || new Date(exp).getTime() <= now) continue;
    }

    const startRaw = s.start_time;
    const startStr =
      typeof startRaw === "string"
        ? startRaw
        : startRaw != null
          ? String(startRaw)
          : "";
    if (!startStr) continue;

    const startMin = toMinutes(startStr);
    const dur = Math.max(1, Number(s.duration_minutes) || 60);
    blocks.push({ startMin, endMin: startMin + dur });
  }

  const { data: holds, error: hErr } = await supabase
    .from("slot_holds")
    .select("start_time, duration_minutes")
    .eq("practitioner_id", practitionerId)
    .eq("session_date", date)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());

  if (hErr) throw hErr;

  for (const h of holds || []) {
    const startRaw = h.start_time;
    const startStr =
      typeof startRaw === "string"
        ? startRaw
        : startRaw != null
          ? String(startRaw)
          : "";
    if (!startStr) continue;
    const startMin = toMinutes(startStr);
    const dur = Math.max(1, Number(h.duration_minutes) || 60);
    blocks.push({ startMin, endMin: startMin + dur });
  }

  const afterSessions = candidates.filter((t) => {
    const slotStart = toMinutes(t);
    const slotEnd = slotStart + durationMin;
    for (const b of blocks) {
      if (intervalsOverlap(slotStart, slotEnd, b.startMin, b.endMin)) {
        return false;
      }
    }
    return true;
  });

  const bounds =
    dayBoundsInPractitionerZone(date, practitionerTimeZone) ??
    dayBoundsLocal(date);
  const { data: calendarBlocks, error: cErr } = await supabase
    .from("calendar_events")
    .select("start_time, end_time")
    .eq("user_id", practitionerId)
    .in("event_type", ["block", "unavailable"])
    .eq("status", "confirmed")
    .lt("start_time", bounds.end.toISOString())
    .gt("end_time", bounds.start.toISOString());

  if (cErr) throw cErr;

  if (!calendarBlocks?.length) return afterSessions;

  return afterSessions.filter((t) => {
    for (const ev of calendarBlocks) {
      const s = ev.start_time;
      const e = ev.end_time;
      if (typeof s !== "string" || typeof e !== "string") continue;
      if (
        slotOverlapsCalendarEvent(
          date,
          t,
          durationMin,
          s,
          e,
          practitionerTimeZone,
        )
      ) {
        return false;
      }
    }
    return true;
  });
}

function windowsFromWorkingHoursDay(day: unknown): DayWindow[] {
  if (!day || typeof day !== "object") return [];
  const o = day as Record<string, unknown>;
  if (!dayEnabled(o)) return [];

  const fromHours: DayWindow[] = [];
  if (Array.isArray(o.hours) && o.hours.length > 0) {
    for (const h of o.hours) {
      if (!h || typeof h !== "object") continue;
      const hh = h as Record<string, unknown>;
      if (typeof hh.start === "string" && typeof hh.end === "string") {
        fromHours.push({ start: hh.start, end: hh.end });
      }
    }
  }
  if (fromHours.length > 0) return fromHours;

  if (typeof o.start === "string" && typeof o.end === "string") {
    return [{ start: o.start, end: o.end }];
  }
  return [];
}

/**
 * Generate selectable start times for a date.
 * Primary source: `practitioner_availability.working_hours` (same as web).
 * Fallback: legacy `availability_slots` rows (often empty).
 */
export async function fetchAvailableStartTimes(params: {
  practitionerId: string;
  date: string;
  durationMinutes: number;
}): Promise<{ data: string[]; error: Error | null }> {
  try {
    const requestedDuration = Math.max(15, params.durationMinutes);
    const slotStep = 15;

    const { data: pa, error: paErr } = await supabase
      .from("practitioner_availability")
      .select("working_hours, timezone")
      .eq("user_id", params.practitionerId)
      .maybeSingle();

    if (paErr) throw paErr;

    const practitionerTz = normalizePractitionerTz(
      pa?.timezone as string | undefined,
    );
    const dayOfWeek = weekdayInPractitionerZone(params.date, practitionerTz);
    const dayKey = WEEKDAY_KEYS[dayOfWeek];

    const rawWh = pa?.working_hours as Record<string, unknown> | undefined;
    const hasSavedSchedule =
      !!rawWh && typeof rawWh === "object" && Object.keys(rawWh).length > 0;

    const wh = hasSavedSchedule ? rawWh! : DEFAULT_WORKING_HOURS;

    const dayCfg = wh[dayKey];
    if (dayCfg === undefined || dayCfg === null) {
      return { data: [], error: null };
    }
    const windows = windowsFromWorkingHoursDay(dayCfg);
    if (windows.length === 0) {
      return { data: [], error: null };
    }
    const times = new Set<string>();
    for (const w of windows) {
      const startM = toMinutes(w.start);
      const endM = toMinutes(w.end);
      if (endM <= startM) continue;
      for (let t = startM; t + requestedDuration <= endM; t += slotStep) {
        times.add(toTimeString(t));
      }
    }
    let candidates: string[] = times.size > 0 ? [...times].sort() : [];

    if (candidates.length === 0 && !hasSavedSchedule) {
      const { data, error } = await supabase
        .from("availability_slots")
        .select("start_time, end_time, duration_minutes")
        .eq("therapist_id", params.practitionerId)
        .eq("day_of_week", dayOfWeek)
        .eq("is_available", true)
        .order("start_time", { ascending: true });

      if (error) throw error;
      const rows = (data || []) as AvailabilitySlotRow[];
      const legacyTimes = new Set<string>();
      for (const row of rows) {
        const step = Math.max(15, row.duration_minutes ?? 30);
        const startM = toMinutes(row.start_time);
        const endM = toMinutes(row.end_time);
        if (endM <= startM) continue;

        for (let t = startM; t + requestedDuration <= endM; t += step) {
          legacyTimes.add(toTimeString(t));
        }
      }
      candidates = [...legacyTimes].sort();
    }

    if (candidates.length === 0) {
      return { data: [], error: null };
    }

    const filtered = await filterCandidatesByBlocks(
      candidates,
      params.practitionerId,
      params.date,
      requestedDuration,
      practitionerTz,
    );

    const cutoff =
      Date.now() + BOOKING_CONFIG.MIN_BOOKING_BUFFER_HOURS * 3600 * 1000;
    const withBuffer = filtered.filter((slot) => {
      const ms = zonedDateTimeToUtcMs(params.date, slot, practitionerTz);
      if (ms == null) return false;
      return ms >= cutoff;
    });

    return { data: withBuffer.sort(), error: null };
  } catch (e) {
    return { data: [], error: unknownToError(e) };
  }
}

type BookingRpcResult = {
  success?: boolean;
  session_id?: string;
  error_code?: string;
  error_message?: string;
};

export type BookAndPayParams = {
  therapistId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  sessionDate: string;
  startTime: string;
  product: PractitionerProductRow;
  notes?: string | null;
  paymentCollection?: "online" | "in_person";
  isGuestBooking?: boolean;
};

export type BookAndPayResult =
  | {
      ok: true;
      sessionId: string;
      paymentCollection: "online" | "in_person";
      checkoutUrl?: string;
      checkoutSessionId?: string;
      paymentIntentClientSecret?: string;
      customerId?: string;
      customerEphemeralKeySecret?: string;
    }
  | { ok: false; error: string; conflict?: boolean };

export type CreateMobileRequestParams = {
  practitionerId: string;
  clientId: string;
  clientEmail: string;
  product: PractitionerProductRow;
  requestedDate: string;
  requestedStartTime: string;
  clientAddress: string;
  clientLatitude: number;
  clientLongitude: number;
  clientNotes?: string | null;
};

export type CreateMobileRequestResult =
  | {
      ok: true;
      requestId: string;
      checkoutUrl: string;
      checkoutSessionId?: string;
    }
  | { ok: false; error: string; conflict?: boolean };

/**
 * Creates a pending_payment session and returns a Stripe Checkout URL (open in browser / SFSafari).
 */
export async function bookSessionAndOpenCheckout(
  p: BookAndPayParams,
): Promise<BookAndPayResult> {
  const paymentCollection = p.paymentCollection ?? "online";
  const isInPerson = paymentCollection === "in_person";
  const priceMinor = p.product.price_amount;
  const price = Math.round(priceMinor) / 100;
  const duration = p.product.duration_minutes ?? 60;
  const sessionType = p.product.name;
  const notes = p.notes || null;
  const idempotencyKey = clinicBookingIdempotencyKey({
    clientId: p.clientId,
    therapistId: p.therapistId,
    sessionDate: p.sessionDate,
    startTime: p.startTime,
  });
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { data: bookingResult, error: rpcError } = await supabase.rpc(
    "create_booking_with_validation",
    {
      p_therapist_id: p.therapistId,
      p_client_id: p.clientId,
      p_client_name: p.clientName,
      p_client_email: p.clientEmail,
      p_session_date: p.sessionDate,
      p_start_time: p.startTime,
      p_duration_minutes: duration,
      p_session_type: sessionType,
      p_price: price,
      p_client_phone: p.clientPhone,
      p_notes: notes,
      p_payment_status: isInPerson ? "awaiting_in_person" : "pending",
      p_status: isInPerson ? "scheduled" : "pending_payment",
      p_expires_at: isInPerson ? null : expiresAt,
      p_idempotency_key: idempotencyKey,
      p_is_guest_booking: p.isGuestBooking === true,
      p_payment_collection: paymentCollection,
      p_appointment_type: "clinic",
      p_visit_address: null,
    } as Record<string, unknown>,
  );

  if (rpcError) {
    return { ok: false, error: rpcError.message };
  }

  const resolved = resolveClinicSessionIdFromRpc(
    bookingResult as BookingRpcResult,
  );
  if (!resolved.ok) {
    return {
      ok: false,
      error: resolved.error,
      conflict: resolved.conflict,
    };
  }

  const sessionId = resolved.sessionId;
  if (isInPerson) {
    return {
      ok: true,
      sessionId,
      paymentCollection: "in_person",
    };
  }

  const payment = await createSessionCheckout({
    sessionId,
    practitionerId: p.therapistId,
    clientId: p.clientId,
    clientEmail: p.clientEmail,
    clientName: p.clientName,
    practitionerName: "Practitioner",
    sessionDate: p.sessionDate,
    sessionTime: p.startTime,
    sessionType,
    idempotencyKey,
  });

  if (!payment.success || !payment.checkoutUrl) {
    return { ok: false, error: payment.error || "Payment setup failed" };
  }

  const { data: sessionRow } = await supabase
    .from("client_sessions")
    .select("status, requires_approval")
    .eq("id", sessionId)
    .single();

  const sr = sessionRow as {
    status?: string;
    requires_approval?: boolean;
  } | null;
  const isSameDayBooking =
    sr?.requires_approval && sr?.status === "pending_approval";

  await supabase
    .from("client_sessions")
    .update({
      stripe_session_id: payment.checkoutSessionId ?? null,
      stripe_payment_intent_id: payment.paymentIntentId ?? null,
      payment_status: isSameDayBooking ? "held" : "pending",
    } as Record<string, unknown>)
    .eq("id", sessionId);

  return {
    ok: true,
    paymentCollection: "online",
    checkoutUrl: payment.checkoutUrl,
    sessionId,
    checkoutSessionId: payment.checkoutSessionId,
    paymentIntentClientSecret: payment.paymentIntentClientSecret,
    customerId: payment.customerId,
    customerEphemeralKeySecret: payment.customerEphemeralKeySecret,
  };
}

export async function createMobileRequestAndOpenCheckout(
  p: CreateMobileRequestParams,
): Promise<CreateMobileRequestResult> {
  try {
    const duration = p.product.duration_minutes ?? 60;
    const notes = p.clientNotes || null;
    const preAssessmentPayload = {};
    const { data: created, error: createError } = await supabase.rpc(
      "create_mobile_booking_request",
      {
        p_client_id: p.clientId,
        p_practitioner_id: p.practitionerId,
        p_product_id: p.product.id,
        p_requested_date: p.requestedDate,
        p_requested_start_time: p.requestedStartTime,
        p_duration_minutes: duration,
        p_client_address: p.clientAddress,
        p_client_latitude: p.clientLatitude,
        p_client_longitude: p.clientLongitude,
        p_client_notes: notes,
        p_pre_assessment_payload: preAssessmentPayload,
      },
    );
    if (createError) return { ok: false, error: createError.message };

    const payload = (created || {}) as {
      success?: boolean;
      request_id?: string;
      error?: string;
    };
    if (!payload.success || !payload.request_id) {
      return {
        ok: false,
        error: payload.error || "Could not create mobile request.",
      };
    }

    const requestId = payload.request_id;
    const { data: reqRow, error: reqErr } = await supabase
      .from("mobile_booking_requests")
      .select("total_price_pence, practitioner_id")
      .eq("id", requestId)
      .single();
    if (reqErr || !reqRow) {
      return {
        ok: false,
        error: reqErr?.message || "Request created but payment setup failed.",
      };
    }

    const total = Number(
      (reqRow as { total_price_pence?: number }).total_price_pence || 0,
    );
    if (!total || total <= 0)
      return { ok: false, error: "Invalid request total for checkout." };

    const { data: checkoutData, error: checkoutError } =
      await supabase.functions.invoke("stripe-payment", {
        body: {
          action: "create-mobile-checkout-session",
          request_id: requestId,
          idempotency_key: mobileCheckoutIdempotencyKey(requestId),
          amount: total,
          currency: (p.product.currency || "gbp").toUpperCase(),
          client_email: p.clientEmail,
          practitioner_id: p.practitionerId,
          metadata: {
            service_name: p.product.name,
            client_user_id: p.clientId,
          },
        },
      });
    if (checkoutError) return { ok: false, error: checkoutError.message };

    const checkoutPayload = (checkoutData || {}) as {
      success?: boolean;
      already_paid?: boolean;
      checkout_url?: string;
      checkout_session_id?: string;
      error?: string;
    };
    if (checkoutPayload.already_paid) {
      return {
        ok: false,
        error: "Payment is already complete for this request.",
      };
    }
    if (!checkoutPayload.success || !checkoutPayload.checkout_url) {
      return {
        ok: false,
        error: checkoutPayload.error || "Could not start mobile checkout.",
      };
    }

    return {
      ok: true,
      requestId,
      checkoutUrl: checkoutPayload.checkout_url,
      checkoutSessionId: checkoutPayload.checkout_session_id,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** New checkout session for an existing pending mobile request (payment retry). */
export async function resumeMobileRequestCheckout(params: {
  requestId: string;
  clientId: string;
  clientEmail?: string;
}): Promise<CreateMobileRequestResult> {
  try {
    const { data: reqRow, error: reqErr } = await supabase
      .from("mobile_booking_requests")
      .select(
        "id, client_id, practitioner_id, product_id, status, payment_status, total_price_pence",
      )
      .eq("id", params.requestId)
      .eq("client_id", params.clientId)
      .maybeSingle();
    if (reqErr || !reqRow) {
      return { ok: false, error: reqErr?.message || "Request not found." };
    }

    const row = reqRow as {
      status?: string | null;
      payment_status?: string | null;
      total_price_pence?: number | null;
      practitioner_id?: string | null;
      product_id?: string | null;
    };

    if ((row.status || "").toLowerCase() !== "pending") {
      return {
        ok: false,
        error: "This request is no longer awaiting payment.",
      };
    }

    if (isMobilePaymentAlreadyComplete(row.payment_status)) {
      return {
        ok: false,
        error: "Payment is already complete for this request.",
      };
    }

    const total = Number(row.total_price_pence || 0);
    if (!total || total <= 0) {
      return { ok: false, error: "Invalid request total for checkout." };
    }

    if (!row.practitioner_id) {
      return { ok: false, error: "Practitioner missing on this request." };
    }

    let serviceName = "Mobile Session";
    if (row.product_id) {
      const { data: product } = await supabase
        .from("practitioner_products")
        .select("name, currency")
        .eq("id", row.product_id)
        .maybeSingle();
      if (product?.name) serviceName = String(product.name);
    }

    const { data: checkoutData, error: checkoutError } =
      await supabase.functions.invoke("stripe-payment", {
        body: {
          action: "create-mobile-checkout-session",
          request_id: params.requestId,
          idempotency_key: mobileCheckoutIdempotencyKey(params.requestId),
          amount: total,
          currency: "GBP",
          client_email: params.clientEmail,
          practitioner_id: row.practitioner_id,
          metadata: {
            service_name: serviceName,
            client_user_id: params.clientId,
          },
        },
      });
    if (checkoutError) return { ok: false, error: checkoutError.message };

    const checkoutPayload = (checkoutData || {}) as {
      success?: boolean;
      already_paid?: boolean;
      checkout_url?: string;
      checkout_session_id?: string;
      error?: string;
    };
    if (checkoutPayload.already_paid) {
      return {
        ok: false,
        error: "Payment is already complete for this request.",
      };
    }
    if (!checkoutPayload.success || !checkoutPayload.checkout_url) {
      return {
        ok: false,
        error: checkoutPayload.error || "Could not start mobile checkout.",
      };
    }

    return {
      ok: true,
      requestId: params.requestId,
      checkoutUrl: checkoutPayload.checkout_url,
      checkoutSessionId: checkoutPayload.checkout_session_id,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
