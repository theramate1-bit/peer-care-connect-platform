/**
 * Practitioner products + booking RPC (aligned with web BookingFlow).
 */

import { supabase } from "@/lib/supabase";
import { createSessionCheckout } from "@/lib/api/payment";

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

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map((x) => Number.parseInt(x, 10) || 0);
  return h * 60 + m;
}

function toTimeString(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Generate selectable start times for a date from practitioner weekly availability.
 */
export async function fetchAvailableStartTimes(params: {
  practitionerId: string;
  date: string;
  durationMinutes: number;
}): Promise<{ data: string[]; error: Error | null }> {
  try {
    const d = new Date(`${params.date}T12:00:00`);
    const dayOfWeek = d.getDay();
    const requestedDuration = Math.max(15, params.durationMinutes);

    const { data, error } = await supabase
      .from("availability_slots")
      .select("start_time, end_time, duration_minutes")
      .eq("therapist_id", params.practitionerId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_available", true)
      .order("start_time", { ascending: true });

    if (error) throw error;
    const rows = (data || []) as AvailabilitySlotRow[];
    if (rows.length === 0) {
      return { data: [], error: null };
    }

    const times = new Set<string>();
    for (const row of rows) {
      const slotStep = Math.max(15, row.duration_minutes ?? 30);
      const startM = toMinutes(row.start_time);
      const endM = toMinutes(row.end_time);
      if (endM <= startM) continue;

      for (let t = startM; t + requestedDuration <= endM; t += slotStep) {
        times.add(toTimeString(t));
      }
    }

    return { data: [...times].sort(), error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: [], error: err };
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
};

export type BookAndPayResult =
  | {
      ok: true;
      checkoutUrl: string;
      sessionId: string;
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
  const priceMinor = p.product.price_amount;
  const price = Math.round(priceMinor) / 100;
  const duration = p.product.duration_minutes ?? 60;
  const sessionType = p.product.name;
  const notes = p.notes || null;
  const idempotencyKey = `${p.clientId}-${p.therapistId}-${p.sessionDate}-${p.startTime}`;
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
      p_payment_status: "pending",
      p_status: "pending_payment",
      p_expires_at: expiresAt,
      p_idempotency_key: idempotencyKey,
      p_is_guest_booking: false,
      p_appointment_type: "clinic",
      p_visit_address: null,
    } as Record<string, unknown>,
  );

  if (rpcError) {
    return { ok: false, error: rpcError.message };
  }

  const result = bookingResult as BookingRpcResult;
  if (!result?.success || !result.session_id) {
    const code = result?.error_code || "";
    const msg = result?.error_message || "Failed to create booking";
    if (code === "CONFLICT_BOOKING" || code === "CONFLICT_BLOCKED") {
      return { ok: false, error: msg, conflict: true };
    }
    return { ok: false, error: msg };
  }

  const sessionId = result.session_id;

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
      checkout_url?: string;
      checkout_session_id?: string;
      error?: string;
    };
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
