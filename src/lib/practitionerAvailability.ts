/**
 * Weekly working hours (`practitioner_availability.working_hours`) — same JSON shape as web.
 */

import { supabase } from "@/integrations/supabase/client";

export type DaySchedule = {
  enabled: boolean;
  start: string;
  end: string;
};

export type WorkingHoursState = Record<string, DaySchedule>;

/** Same fields as web `AvailabilitySettings` preferences / `practitioner_availability` columns. */
export type SessionDefaults = {
  default_session_time: string;
  default_duration_minutes: number;
  default_session_type: string;
};

export const DEFAULT_SESSION_DEFAULTS: SessionDefaults = {
  default_session_time: "10:00",
  default_duration_minutes: 60,
  default_session_type: "Treatment Session",
};

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export const DEFAULT_WORKING_HOURS: WorkingHoursState = {
  monday: { enabled: true, start: "09:00", end: "17:00" },
  tuesday: { enabled: true, start: "09:00", end: "17:00" },
  wednesday: { enabled: true, start: "09:00", end: "17:00" },
  thursday: { enabled: true, start: "09:00", end: "17:00" },
  friday: { enabled: true, start: "09:00", end: "17:00" },
  saturday: { enabled: false, start: "10:00", end: "15:00" },
  sunday: { enabled: false, start: "10:00", end: "15:00" },
};

function normalizeWorkingHours(raw: unknown): WorkingHoursState {
  const base = { ...DEFAULT_WORKING_HOURS };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  for (const d of DAYS) {
    const day = o[d];
    if (day && typeof day === "object") {
      const dd = day as Record<string, unknown>;
      const enabled = dd.enabled !== false && dd.enabled !== "false";
      const start = typeof dd.start === "string" ? dd.start : base[d].start;
      const end = typeof dd.end === "string" ? dd.end : base[d].end;
      base[d] = { enabled, start, end };
    }
  }
  return base;
}

function normalizeSessionDefaults(row: {
  default_session_time?: string | null;
  default_duration_minutes?: number | null;
  default_session_type?: string | null;
}): SessionDefaults {
  return {
    default_session_time:
      row.default_session_time?.trim() ||
      DEFAULT_SESSION_DEFAULTS.default_session_time,
    default_duration_minutes:
      typeof row.default_duration_minutes === "number" &&
      Number.isFinite(row.default_duration_minutes)
        ? row.default_duration_minutes
        : DEFAULT_SESSION_DEFAULTS.default_duration_minutes,
    default_session_type:
      row.default_session_type?.trim() ||
      DEFAULT_SESSION_DEFAULTS.default_session_type,
  };
}

export async function fetchPractitionerAvailability(userId: string): Promise<{
  data:
    | ({
        working_hours: WorkingHoursState;
        timezone: string | null;
      } & SessionDefaults)
    | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from("practitioner_availability")
      .select(
        "working_hours, timezone, default_session_time, default_duration_minutes, default_session_type",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return {
        data: {
          working_hours: { ...DEFAULT_WORKING_HOURS },
          timezone: "Europe/London",
          ...DEFAULT_SESSION_DEFAULTS,
        },
        error: null,
      };
    }
    const row = data as {
      working_hours?: unknown;
      timezone?: string | null;
      default_session_time?: string | null;
      default_duration_minutes?: number | null;
      default_session_type?: string | null;
    };
    return {
      data: {
        working_hours: normalizeWorkingHours(row.working_hours),
        timezone: row.timezone ?? null,
        ...normalizeSessionDefaults(row),
      },
      error: null,
    };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function savePractitionerAvailability(params: {
  userId: string;
  workingHours: WorkingHoursState;
  timezone?: string | null;
  sessionDefaults: SessionDefaults;
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const sd = params.sessionDefaults;
    const row = {
      user_id: params.userId,
      working_hours: params.workingHours,
      timezone: params.timezone ?? "Europe/London",
      default_session_time: sd.default_session_time,
      default_duration_minutes: sd.default_duration_minutes,
      default_session_type: sd.default_session_type,
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: findErr } = await supabase
      .from("practitioner_availability")
      .select("id")
      .eq("user_id", params.userId)
      .maybeSingle();
    if (findErr) throw findErr;

    if (existing) {
      const { error } = await supabase
        .from("practitioner_availability")
        .update({
          working_hours: params.workingHours,
          timezone: params.timezone ?? "Europe/London",
          default_session_time: sd.default_session_time,
          default_duration_minutes: sd.default_duration_minutes,
          default_session_type: sd.default_session_type,
          updated_at: row.updated_at,
        })
        .eq("user_id", params.userId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("practitioner_availability")
        .insert(row);
      if (error) throw error;
    }
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function savePractitionerTimezone(params: {
  userId: string;
  timezone: string;
}): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const { data: existing } = await supabase
      .from("practitioner_availability")
      .select("id")
      .eq("user_id", params.userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("practitioner_availability")
        .update({
          timezone: params.timezone,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", params.userId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("practitioner_availability")
        .insert({
          user_id: params.userId,
          working_hours: DEFAULT_WORKING_HOURS,
          timezone: params.timezone,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    }
    return { ok: true, error: null };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}
