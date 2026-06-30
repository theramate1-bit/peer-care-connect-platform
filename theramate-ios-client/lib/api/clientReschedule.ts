import { supabase } from "@/lib/supabase";
import { fetchAvailableStartTimes } from "@/lib/api/booking";

export type RescheduleEligibility = {
  canReschedule: boolean;
  reason?: string;
};

export async function canRescheduleClientSession(
  sessionId: string,
): Promise<RescheduleEligibility> {
  try {
    const { data: session, error } = await supabase
      .from("client_sessions")
      .select("id, session_date, start_time, status, appointment_type")
      .eq("id", sessionId)
      .single();

    if (error || !session) {
      return { canReschedule: false, reason: "Session not found" };
    }

    const status = String(session.status ?? "").toLowerCase();
    if (!["scheduled", "confirmed"].includes(status)) {
      return {
        canReschedule: false,
        reason: `Cannot reschedule a ${status || "unknown"} session`,
      };
    }

    if (String(session.appointment_type ?? "").toLowerCase() === "mobile") {
      return {
        canReschedule: false,
        reason:
          "Mobile visits cannot be rescheduled here. Message your practitioner or contact support.",
      };
    }

    const timeRaw = String(session.start_time ?? "").slice(0, 5);
    const sessionDateTime = new Date(`${session.session_date}T${timeRaw}:00`);
    if (Number.isNaN(sessionDateTime.getTime())) {
      return { canReschedule: false, reason: "Invalid session time" };
    }

    if (sessionDateTime.getTime() < Date.now()) {
      return {
        canReschedule: false,
        reason: "Cannot reschedule past sessions",
      };
    }

    const hoursUntil =
      (sessionDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 24) {
      return {
        canReschedule: false,
        reason:
          "Rescheduling requires at least 24 hours notice. Message your practitioner for a late change.",
      };
    }

    return { canReschedule: true };
  } catch {
    return {
      canReschedule: false,
      reason: "Unable to verify reschedule eligibility",
    };
  }
}

export async function fetchRescheduleAvailableTimes(params: {
  therapistId: string;
  date: string;
  durationMinutes: number;
  excludeSessionId: string;
}): Promise<{ data: string[]; error: Error | null }> {
  return fetchAvailableStartTimes({
    practitionerId: params.therapistId,
    date: params.date,
    durationMinutes: params.durationMinutes,
    excludeSessionId: params.excludeSessionId,
  });
}

export async function rescheduleClientSession(params: {
  sessionId: string;
  clientId: string;
  newDate: string;
  newTime: string;
  reason?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const eligibility = await canRescheduleClientSession(params.sessionId);
  if (!eligibility.canReschedule) {
    return { ok: false, error: eligibility.reason ?? "Cannot reschedule" };
  }

  const { data: session, error: sessionError } = await supabase
    .from("client_sessions")
    .select(
      "id, client_id, therapist_id, session_date, start_time, duration_minutes, client_email, client_name, session_type, payment_collection",
    )
    .eq("id", params.sessionId)
    .eq("client_id", params.clientId)
    .single();

  if (sessionError || !session) {
    return { ok: false, error: "Session not found" };
  }

  const existingTime = String(session.start_time ?? "").slice(0, 5);
  if (
    params.newDate === session.session_date &&
    params.newTime === existingTime
  ) {
    return { ok: false, error: "Pick a different date or time." };
  }

  const duration = Math.max(15, Number(session.duration_minutes) || 60);
  const { data: slots, error: slotsError } =
    await fetchRescheduleAvailableTimes({
      therapistId: session.therapist_id,
      date: params.newDate,
      durationMinutes: duration,
      excludeSessionId: params.sessionId,
    });
  if (slotsError) {
    return { ok: false, error: slotsError.message };
  }
  const normalizedNew = params.newTime.slice(0, 5);
  if (!slots.includes(normalizedNew)) {
    return {
      ok: false,
      error: "That time is no longer available. Choose another slot.",
    };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("client_sessions")
    .update({
      session_date: params.newDate,
      start_time: normalizedNew,
      rescheduled_at: now,
      reschedule_reason: params.reason?.trim() || null,
      updated_at: now,
    })
    .eq("id", params.sessionId)
    .eq("client_id", params.clientId);

  if (updateError) {
    const raw = updateError.message || "";
    if (/overlap|conflict|blocked/i.test(raw)) {
      return {
        ok: false,
        error:
          "That slot clashes with another booking or blocked time. Pick another time.",
      };
    }
    return { ok: false, error: raw || "Could not reschedule session" };
  }

  try {
    await supabase.functions.invoke("send-booking-notification", {
      body: {
        emailType: "rescheduling",
        sessionId: params.sessionId,
        originalDate: session.session_date,
        originalTime: existingTime,
        newDate: params.newDate,
        newTime: normalizedNew,
        rescheduledBy: "client",
      },
    });
  } catch {
    // Non-blocking
  }

  return { ok: true };
}
