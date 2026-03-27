import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatName(
  first?: string | null,
  last?: string | null,
  fallback = "there",
) {
  const full = [first, last].filter(Boolean).join(" ").trim();
  return full || fallback;
}

async function proxyToStripePayment(body: any) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey)
    return json(500, { error: "Missing Supabase env for proxy" });

  const res = await fetch(`${supabaseUrl}/functions/v1/stripe-payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendPractitionerMobileRequestEmail(
  supabase: any,
  requestRow: any,
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) return;

    const { data: practitioner } = await supabase
      .from("users")
      .select("email, first_name, last_name")
      .eq("id", requestRow.practitioner_id)
      .maybeSingle();
    if (!practitioner?.email) return;

    const existingBase = supabase
      .from("email_logs")
      .select("id")
      .eq("email_type", "booking_request_practitioner")
      .eq("recipient_email", practitioner.email)
      .in("status", ["pending", "sent"])
      .limit(1);

    const { data: existingByMetadata } = await existingBase
      .contains("metadata", { template_data: { requestId: requestRow.id } })
      .maybeSingle();
    if (existingByMetadata?.id) return;

    const { data: existingByEmailData } = await supabase
      .from("email_logs")
      .select("id")
      .eq("email_type", "booking_request_practitioner")
      .eq("recipient_email", practitioner.email)
      .in("status", ["pending", "sent"])
      .contains("email_data", { requestId: requestRow.id })
      .limit(1)
      .maybeSingle();
    if (existingByEmailData?.id) return;

    let clientName = "Client";
    if (requestRow.client_id) {
      const { data: client } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", requestRow.client_id)
        .maybeSingle();
      clientName = formatName(client?.first_name, client?.last_name, "Client");
    }

    const siteUrl = (
      Deno.env.get("SITE_URL") ||
      Deno.env.get("APP_URL") ||
      "https://theramate.co.uk"
    ).replace(/\/$/, "");
    const requestedTime =
      typeof requestRow.requested_start_time === "string"
        ? requestRow.requested_start_time.slice(0, 5)
        : requestRow.requested_start_time;

    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        emailType: "booking_request_practitioner",
        recipientEmail: practitioner.email,
        recipientName: formatName(
          practitioner.first_name,
          practitioner.last_name,
        ),
        data: {
          requestId: requestRow.id,
          clientName,
          serviceType: requestRow.service_type || undefined,
          requestedDate: requestRow.requested_date,
          requestedTime,
          clientAddress: requestRow.client_address || undefined,
          price: requestRow.total_price_pence ?? undefined,
          requestUrl: `${siteUrl}/practice/mobile-requests${requestRow.id ? `?requestId=${requestRow.id}` : ""}`,
        },
      }),
    });
  } catch {
    // Non-blocking: email errors should not break payment confirmation.
  }
}

async function handleConfirmMobileCheckoutSession(body: any, supabase: any) {
  const { request_id, checkout_session_id } = body || {};
  if (!request_id || !checkout_session_id) {
    return json(400, {
      error: "Missing required fields",
      details: {
        request_id: !!request_id,
        checkout_session_id: !!checkout_session_id,
      },
    });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
  });
  const checkoutSession = await stripe.checkout.sessions.retrieve(
    checkout_session_id,
    { expand: ["payment_intent"] },
  );

  if (
    checkoutSession.metadata?.request_id &&
    checkoutSession.metadata.request_id !== request_id
  ) {
    return json(400, { error: "Checkout session does not belong to request" });
  }

  let paymentIntent: any = checkoutSession.payment_intent;
  if (typeof paymentIntent === "string") {
    paymentIntent = await stripe.paymentIntents.retrieve(paymentIntent);
  }

  const intentStatus = paymentIntent.status;
  const isAuthorizedOrCaptured =
    intentStatus === "requires_capture" || intentStatus === "succeeded";
  if (checkoutSession.payment_status !== "paid" && !isAuthorizedOrCaptured) {
    return json(409, {
      error: "Checkout session payment is not ready yet",
      retryable: true,
      details: {
        payment_status: checkoutSession.payment_status,
        payment_intent_status: intentStatus,
      },
    });
  }

  const normalizedPaymentStatus =
    intentStatus === "requires_capture"
      ? "held"
      : intentStatus === "succeeded"
        ? "captured"
        : "pending";

  const { data: updatedRequest, error: updateError } = await supabase
    .from("mobile_booking_requests")
    .update({
      stripe_payment_intent_id: paymentIntent.id,
      payment_status: normalizedPaymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", request_id)
    .eq("status", "pending")
    .neq("payment_status", normalizedPaymentStatus)
    .select(
      "id, client_id, practitioner_id, service_type, requested_date, requested_start_time, client_address, total_price_pence",
    )
    .maybeSingle();

  if (updateError) throw updateError;

  if (
    updatedRequest &&
    (normalizedPaymentStatus === "held" ||
      normalizedPaymentStatus === "captured")
  ) {
    await sendPractitionerMobileRequestEmail(supabase, updatedRequest);
  }

  return json(200, {
    success: true,
    request_id,
    payment_intent_id: paymentIntent.id,
    payment_status: normalizedPaymentStatus,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders, "Content-Length": "0" },
    });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    if (!Deno.env.get("STRIPE_SECRET_KEY")) {
      return json(500, {
        error: "Server configuration error: Missing Stripe key",
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
        Deno.env.get("SUPABASE_ANON_KEY") ??
        "",
    );

    if (action === "confirm-mobile-checkout-session") {
      return await handleConfirmMobileCheckoutSession(body, supabase);
    }
    if (
      action === "create-mobile-checkout-session" ||
      action === "capture-mobile-payment" ||
      action === "release-mobile-payment"
    ) {
      return await proxyToStripePayment(body);
    }
    return json(400, { error: `Unknown action: ${action}` });
  } catch (error: any) {
    return json(500, {
      error: "Internal server error",
      details: error?.message || String(error),
    });
  }
});
