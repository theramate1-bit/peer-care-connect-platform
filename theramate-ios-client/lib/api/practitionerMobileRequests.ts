/**
 * Practitioner mobile booking requests — RPCs match Supabase migrations.
 * Accept: capture Stripe PI first, then accept RPC (see MOBILE_REQUEST_BOOKING_SUPABASE_AUDIT).
 */

import { supabase } from "@/lib/supabase";

export type PractitionerMobileRequestRow = {
  id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  product_id: string;
  product_name: string;
  service_type: string | null;
  requested_date: string;
  requested_start_time: string;
  duration_minutes: number | null;
  client_address: string | null;
  client_latitude: number | null;
  client_longitude: number | null;
  distance_from_base_km: number | null;
  total_price_pence: number | null;
  stripe_payment_intent_id: string | null;
  payment_status: string | null;
  status: string | null;
  session_id: string | null;
  client_notes: string | null;
  created_at: string | null;
};

type StripePaymentPayload = {
  success?: boolean;
  error?: string;
  details?: string;
  status?: string;
  transfer_warning?: string;
};

async function invokeStripePayment(body: Record<string, unknown>): Promise<{
  ok: boolean;
  error: string | null;
  data: StripePaymentPayload | null;
}> {
  const { data, error } = await supabase.functions.invoke("stripe-payment", {
    body,
  });
  if (error) {
    return { ok: false, error: error.message, data: null };
  }
  const payload = (data || {}) as StripePaymentPayload;
  if (payload.success === false || payload.error) {
    return {
      ok: false,
      error: payload.error || payload.details || "Payment action failed",
      data: payload,
    };
  }
  return { ok: true, error: null, data: payload };
}

export async function fetchPractitionerMobileRequests(
  practitionerId: string,
  status: string | null = "pending",
): Promise<{ data: PractitionerMobileRequestRow[]; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc(
      "get_practitioner_mobile_requests",
      {
        p_practitioner_id: practitionerId,
        p_status: status,
      },
    );
    if (error) throw error;
    return {
      data: (data || []) as PractitionerMobileRequestRow[],
      error: null,
    };
  } catch (e) {
    return {
      data: [],
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

export async function acceptMobileBookingRequest(params: {
  requestId: string;
  stripePaymentIntentId: string;
}): Promise<{
  ok: boolean;
  error: string | null;
  sessionId?: string | null;
  transferWarning?: string | null;
}> {
  try {
    const payStatus = await invokeStripePayment({
      action: "capture-mobile-payment",
      payment_intent_id: params.stripePaymentIntentId,
    });
    if (!payStatus.ok) {
      return {
        ok: false,
        error: payStatus.error || "Could not capture payment",
      };
    }

    const { data, error } = await supabase.rpc(
      "accept_mobile_booking_request",
      {
        p_request_id: params.requestId,
        p_stripe_payment_intent_id: params.stripePaymentIntentId,
      },
    );
    if (error) throw error;
    const row = data as {
      success?: boolean;
      error?: string;
      session_id?: string;
    } | null;
    if (row && row.success === false) {
      return { ok: false, error: row.error || "Accept failed" };
    }
    return {
      ok: true,
      error: null,
      sessionId: row?.session_id ?? null,
      transferWarning: payStatus.data?.transfer_warning ?? null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

export async function declineMobileBookingRequest(params: {
  requestId: string;
  stripePaymentIntentId?: string | null;
  declineReason?: string;
}): Promise<{ ok: boolean; error: string | null }> {
  try {
    const pi = params.stripePaymentIntentId?.trim();
    if (pi) {
      const release = await invokeStripePayment({
        action: "release-mobile-payment",
        payment_intent_id: pi,
      });
      if (!release.ok) {
        return {
          ok: false,
          error: release.error || "Could not release payment hold",
        };
      }
    }

    const { data, error } = await supabase.rpc(
      "decline_mobile_booking_request",
      {
        p_request_id: params.requestId,
        p_decline_reason: params.declineReason ?? null,
        p_alternate_date: null,
        p_alternate_start_time: null,
        p_alternate_suggestions: null,
        p_practitioner_notes: null,
      },
    );
    if (error) throw error;
    const row = data as { success?: boolean; error?: string } | null;
    if (row && row.success === false) {
      return { ok: false, error: row.error || "Decline failed" };
    }
    return { ok: true, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
