/**
 * Session checkout via Supabase Edge Function `stripe-payment` (same as web PaymentIntegration).
 */

import { supabase } from "@/lib/supabase";

export type CreateSessionPaymentParams = {
  sessionId: string;
  practitionerId: string;
  clientId: string;
  clientEmail?: string;
  clientName?: string;
  practitionerName?: string;
  sessionDate?: string;
  sessionTime?: string;
  sessionType?: string;
  idempotencyKey?: string;
};

export type CreateSessionPaymentResult = {
  success: boolean;
  checkoutUrl?: string;
  checkoutSessionId?: string;
  paymentIntentId?: string;
  paymentIntentClientSecret?: string;
  customerId?: string;
  customerEphemeralKeySecret?: string;
  error?: string;
};

function randomUUID(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function createSessionCheckout(
  request: CreateSessionPaymentParams,
): Promise<CreateSessionPaymentResult> {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!request.clientId || !uuidRegex.test(request.clientId)) {
    return {
      success: false,
      error: "Client ID is required for payment processing",
    };
  }

  const idempotencyKey =
    request.idempotencyKey || `${request.sessionId}-${request.clientId}`;

  const { data: session, error: sessionError } = await supabase
    .from("client_sessions")
    .select("*")
    .eq("id", request.sessionId)
    .in("status", ["scheduled", "pending_payment", "pending_approval"])
    .single();

  if (sessionError || !session) {
    return {
      success: false,
      error: "Session not found or not available for payment",
    };
  }

  const row = session as Record<string, unknown>;
  const price = (row.product_price ?? row.price) as number | null | undefined;
  const currency = (row.currency as string | null | undefined) ?? "GBP";

  if (price == null || Number(price) <= 0) {
    return { success: false, error: "Invalid session price for payment" };
  }

  const paymentIntentId = randomUUID();

  const { error: intentInsertError } = await supabase
    .from("payment_intents")
    .insert({
      id: paymentIntentId,
      session_id: request.sessionId,
      client_id: request.clientId,
      practitioner_id: request.practitionerId,
      amount: price,
      currency,
      status: "initiated",
      idempotency_key: idempotencyKey,
    } as Record<string, unknown>);

  if (intentInsertError) {
    return {
      success: false,
      error: `Failed to create payment intent record: ${intentInsertError.message}`,
    };
  }

  const { data, error } = await supabase.functions.invoke("stripe-payment", {
    body: {
      action: "create-payment-intent",
      idempotency_key: idempotencyKey,
      session_id: request.sessionId,
      client_id: request.clientId,
      practitioner_id: request.practitionerId,
      payment_intent_id: paymentIntentId,
      amount: Math.round(Number(price) * 100),
      currency,
      payment_type: "session_payment",
      metadata: {
        practitioner_name: request.practitionerName || "Practitioner",
        client_user_id: request.clientId,
        client_email: request.clientEmail || "",
        client_name: request.clientName || "",
        session_date: request.sessionDate || "",
        session_time: request.sessionTime || "",
        session_type: request.sessionType || "Session",
      },
    },
  });

  if (error) {
    return {
      success: false,
      error: error.message || "Failed to create checkout session",
    };
  }

  const payload = data as Record<string, unknown> | null;
  if (payload?.error) {
    return { success: false, error: String(payload.error) };
  }

  const checkoutUrl = payload?.checkout_url as string | undefined;
  if (!checkoutUrl) {
    return {
      success: false,
      error: "Invalid response from payment system: missing checkout_url",
    };
  }

  return {
    success: true,
    checkoutUrl,
    checkoutSessionId: payload?.checkout_session_id as string | undefined,
    paymentIntentId: (payload?.payment_id as string) || paymentIntentId,
    paymentIntentClientSecret:
      (payload?.payment_intent_client_secret as string | undefined) ||
      (payload?.client_secret as string | undefined),
    customerId: payload?.customer_id as string | undefined,
    customerEphemeralKeySecret:
      (payload?.customer_ephemeral_key_secret as string | undefined) ||
      (payload?.ephemeral_key as string | undefined),
  };
}
