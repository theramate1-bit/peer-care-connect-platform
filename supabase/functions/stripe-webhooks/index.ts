import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { getBookingEmailLocationData } from "../_shared/booking-email-data.ts";

// CORS headers - restrict to allowed origins in production
const getAllowedOrigin = (): string => {
  const origin = Deno.env.get("ALLOWED_ORIGINS") || "";
  const allowedOrigins = origin
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  // In production, use specific origins; in development, allow localhost
  if (allowedOrigins.length > 0) {
    return allowedOrigins[0];
  }

  // Default: allow all in development, restrict in production
  return Deno.env.get("ENVIRONMENT") === "production" ? "" : "*";
};

const corsHeaders = (origin?: string | null): Record<string, string> => {
  const allowedOrigin = getAllowedOrigin();
  const requestOrigin = origin || "*";

  // In production, validate origin; in development, allow all
  const corsOrigin =
    allowedOrigin === "*" || Deno.env.get("ENVIRONMENT") !== "production"
      ? "*"
      : allowedOrigin.includes(requestOrigin)
        ? requestOrigin
        : "";

  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // Validate request body size (Stripe webhooks can be large, but limit to 1MB for safety)
    const bodyText = await req.text();
    if (bodyText.length > 1024 * 1024) {
      // 1MB limit for webhooks
      return new Response(
        JSON.stringify({ error: "Request body is too large (max 1MB)" }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    const signature = req.headers.get("stripe-signature");

    // Validate Stripe signature header
    if (!signature || typeof signature !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing Stripe signature header" }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Validate signature format (Stripe signatures start with timestamp)
    if (!signature.includes("t=") || !signature.includes(",")) {
      return new Response(
        JSON.stringify({ error: "Invalid Stripe signature format" }),
        {
          status: 400,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Verify webhook signature
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    // Validate webhook secret is configured
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
    if (!webhookSecret) {
      return new Response(
        JSON.stringify({ error: "Stripe webhook secret not configured" }),
        {
          status: 500,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        bodyText,
        signature,
        webhookSecret,
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    // Log webhook event
    const { data: webhookEvent, error: webhookError } = await supabase
      .from("webhook_events")
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        event_data: event.data,
      })
      .select()
      .single();

    if (webhookError) {
      console.error("Failed to log webhook event:", webhookError);
    }

    // Handle different event types
    let processingError = null;
    try {
      switch (event.type) {
        case "payment_intent.succeeded":
          await handlePaymentIntentSucceeded(event.data.object, supabase);
          break;

        case "payment_intent.payment_failed":
          await handlePaymentIntentFailed(event.data.object, supabase);
          break;

        case "charge.succeeded":
          await handleChargeSucceeded(event.data.object, supabase);
          break;
        case "charge.refunded":
          await handleChargeRefunded(event.data.object, supabase);
          break;

        case "charge.dispute.created":
          await handleDisputeCreated(event.data.object, supabase);
          break;

        case "transfer.created":
          await handleTransferCreated(event.data.object, supabase);
          break;

        case "payout.paid":
          await handlePayoutPaid(event.data.object, supabase);
          break;

        case "payout.failed":
          await handlePayoutFailed(event.data.object, supabase);
          break;

        case "account.updated":
          await handleAccountUpdated(event.data.object, supabase);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`Error processing ${event.type}:`, error);
      processingError = error.message;
    }

    // Update webhook event processing status
    if (webhookEvent) {
      await supabase
        .from("webhook_events")
        .update({
          processed: true,
          processing_error: processingError,
        })
        .eq("id", webhookEvent.id);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
});

async function handlePaymentIntentSucceeded(paymentIntent: any, supabase: any) {
  console.log("Processing payment_intent.succeeded:", paymentIntent.id);

  try {
    // Update payment status in database
    const metadata = paymentIntent.metadata || {};
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        payment_status: "completed",
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        session_id: metadata.session_id ?? null,
      })
      .eq("stripe_payment_intent_id", paymentIntent.id);

    if (updateError) {
      console.error("Failed to update payment status:", updateError);
      throw updateError;
    }

    // Mirror minimal status to client_sessions if we have session_id; set guest_view_token for "View Booking Details" link in email
    if (metadata.session_id) {
      const guestViewToken = Array.from(
        crypto.getRandomValues(new Uint8Array(32)),
      )
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      await supabase
        .from("client_sessions")
        .update({
          payment_status: "completed",
          payment_date: new Date().toISOString(),
          guest_view_token: guestViewToken,
        })
        .eq("id", metadata.session_id);

      // Send booking confirmation emails (client + practitioner) with session location when available
      await sendBookingConfirmationEmails(metadata.session_id, supabase);
      console.log("Booking emails invoked for session", metadata.session_id);
    }
    console.log(`Payment ${paymentIntent.id} marked as completed`);
  } catch (error) {
    console.error("Error handling payment_intent.succeeded:", error);
    throw error;
  }
}

/**
 * Fetch session + practitioner, then invoke send-email for booking_confirmation_client and booking_confirmation_practitioner.
 * Location/directions from central getBookingEmailLocationData (booking record first: appointment_type, visit_address).
 */
async function sendBookingConfirmationEmails(
  sessionId: string,
  supabase: any,
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      "sendBookingConfirmationEmails: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing, skipping emails",
    );
    return;
  }

  const { data: session, error: sessionError } = await supabase
    .from("client_sessions")
    .select(
      "id, client_email, client_name, therapist_id, session_date, start_time, duration_minutes, session_type, price, platform_fee_amount, practitioner_amount, guest_view_token, appointment_type, visit_address, status, payment_status, requires_approval",
    )
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    console.warn(
      "sendBookingConfirmationEmails: could not load session",
      sessionId,
      sessionError?.message,
    );
    return;
  }

  if (!session.therapist_id) {
    console.warn(
      "sendBookingConfirmationEmails: session has no therapist_id",
      sessionId,
    );
    return;
  }

  const { data: practitioner, error: practitionerError } = await supabase
    .from("users")
    .select("id, email, first_name, last_name, location, clinic_address")
    .eq("id", session.therapist_id)
    .single();

  if (practitionerError || !practitioner) {
    console.warn(
      "sendBookingConfirmationEmails: could not load practitioner",
      session.therapist_id,
      practitionerError?.message,
    );
    return;
  }

  const practitionerName =
    [practitioner.first_name, practitioner.last_name]
      .filter(Boolean)
      .join(" ") || "Practitioner";
  const locationData = getBookingEmailLocationData(
    {
      appointment_type: session.appointment_type,
      visit_address: session.visit_address,
    },
    {
      location: practitioner.location,
      clinic_address: practitioner.clinic_address,
    },
  );
  const siteUrl = Deno.env.get("SITE_URL") || "https://theramate.co.uk";
  const bookingUrl =
    session.guest_view_token && session.client_email
      ? `${siteUrl}/booking/view/${session.id}?token=${encodeURIComponent(session.guest_view_token)}`
      : undefined;

  const baseData = {
    sessionId: session.id,
    sessionType: session.session_type ?? undefined,
    sessionDate: session.session_date,
    sessionTime: session.start_time,
    sessionDuration: session.duration_minutes,
    sessionPrice: session.price ?? undefined,
    sessionLocation: locationData.sessionLocation || undefined,
    directionsUrl: locationData.directionsUrlForClient,
    bookingUrl,
    clientName: session.client_name ?? undefined,
    clientEmail: session.client_email ?? undefined,
    practitionerName,
    practitionerEmail: practitioner.email,
    paymentAmount: session.price ?? undefined,
    platformFee: session.platform_fee_amount ?? undefined,
    practitionerAmount: session.practitioner_amount ?? undefined,
    paymentStatus: session.payment_status ?? undefined,
    sessionStatus: session.status ?? undefined,
    requiresApproval: session.requires_approval ?? undefined,
    locationKind: locationData.locationKind,
    visitAddress: locationData.visitAddress,
  };

  const invokeSendEmail = async (body: {
    emailType: string;
    recipientEmail: string;
    recipientName?: string;
    data: Record<string, unknown>;
  }) => {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn("send-email failed", body.emailType, res.status, text);
    }
  };

  if (session.client_email) {
    await invokeSendEmail({
      emailType: "booking_confirmation_client",
      recipientEmail: session.client_email,
      recipientName: session.client_name ?? undefined,
      data: baseData,
    });
  }

  await invokeSendEmail({
    emailType: "booking_confirmation_practitioner",
    recipientEmail: practitioner.email,
    recipientName: practitionerName,
    data: {
      ...baseData,
      clientName: session.client_name,
      clientEmail: session.client_email ?? undefined,
      sessionLocation: locationData.sessionLocation || undefined,
      directionsUrl: locationData.directionsUrlForPractitioner,
      visitAddress: locationData.visitAddress,
    },
  });
}

async function handlePaymentIntentFailed(paymentIntent: any, supabase: any) {
  console.log("Processing payment_intent.payment_failed:", paymentIntent.id);

  try {
    // Update payment status in database
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        payment_status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_payment_intent_id", paymentIntent.id);

    if (updateError) {
      console.error("Failed to update payment status:", updateError);
      throw updateError;
    }

    console.log(`Payment ${paymentIntent.id} marked as failed`);
  } catch (error) {
    console.error("Error handling payment_intent.payment_failed:", error);
    throw error;
  }
}

async function handleChargeSucceeded(charge: any, supabase: any) {
  console.log("Processing charge.succeeded:", charge.id);

  try {
    // Update payment with charge ID if not already set
    const metadata = charge.metadata || {};
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        stripe_charge_id: charge.id,
        updated_at: new Date().toISOString(),
        session_id: metadata.session_id ?? null,
      })
      .eq("stripe_payment_intent_id", charge.payment_intent);

    if (updateError) {
      console.error("Failed to update payment with charge ID:", updateError);
    }

    console.log(
      `Charge ${charge.id} processed for payment intent ${charge.payment_intent}`,
    );
  } catch (error) {
    console.error("Error handling charge.succeeded:", error);
    throw error;
  }
}

async function handleChargeRefunded(charge: any, supabase: any) {
  console.log("Processing charge.refunded:", charge.id);
  try {
    const refunded = charge.amount_refunded ?? 0;
    // Update payment to refunded
    await supabase
      .from("payments")
      .update({
        payment_status: "refunded",
        refund_amount: refunded,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_charge_id", charge.id);

    // Mirror optional
    const metadata = charge.metadata || {};
    if (metadata.session_id) {
      await supabase
        .from("client_sessions")
        .update({ payment_status: "refunded" })
        .eq("id", metadata.session_id);
    }
    console.log(`Charge ${charge.id} marked refunded`);
  } catch (error) {
    console.error("Error handling charge.refunded:", error);
    throw error;
  }
}

async function handleDisputeCreated(dispute: any, supabase: any) {
  console.log("Processing charge.dispute.created:", dispute.id);

  try {
    // Find the payment associated with this dispute
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id")
      .eq("stripe_charge_id", dispute.charge)
      .single();

    if (paymentError || !payment) {
      console.error("Payment not found for dispute:", dispute.charge);
      return;
    }

    // Create dispute record
    const { error: disputeError } = await supabase
      .from("payment_disputes")
      .insert({
        payment_id: payment.id,
        stripe_dispute_id: dispute.id,
        amount: dispute.amount,
        currency: dispute.currency,
        reason: dispute.reason,
        status: dispute.status,
      });

    if (disputeError) {
      console.error("Failed to create dispute record:", disputeError);
      throw disputeError;
    }

    console.log(`Dispute ${dispute.id} recorded for payment ${payment.id}`);
  } catch (error) {
    console.error("Error handling charge.dispute.created:", error);
    throw error;
  }
}

async function handleTransferCreated(transfer: any, supabase: any) {
  console.log("Processing transfer.created:", transfer.id);

  try {
    // Find the payment associated with this transfer
    const metadata = transfer.metadata;
    if (metadata && metadata.payment_id) {
      // Update payment to mark transfer as completed
      const { error: updateError } = await supabase
        .from("payments")
        .update({
          payment_status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", metadata.payment_id);

      if (updateError) {
        console.error(
          "Failed to update payment status after transfer:",
          updateError,
        );
      }
    }

    console.log(`Transfer ${transfer.id} processed`);
  } catch (error) {
    console.error("Error handling transfer.created:", error);
    throw error;
  }
}

async function handlePayoutPaid(payout: any, supabase: any) {
  console.log("Processing payout.paid:", payout.id);

  try {
    // Update payout status in database
    const { error: updateError } = await supabase
      .from("payouts")
      .update({
        status: "paid",
        arrival_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_payout_id", payout.id);

    if (updateError) {
      console.error("Failed to update payout status:", updateError);
      throw updateError;
    }

    console.log(`Payout ${payout.id} marked as paid`);
  } catch (error) {
    console.error("Error handling payout.paid:", error);
    throw error;
  }
}

async function handlePayoutFailed(payout: any, supabase: any) {
  console.log("Processing payout.failed:", payout.id);

  try {
    // Update payout status in database
    const { error: updateError } = await supabase
      .from("payouts")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_payout_id", payout.id);

    if (updateError) {
      console.error("Failed to update payout status:", updateError);
      throw updateError;
    }

    console.log(`Payout ${payout.id} marked as failed`);
  } catch (error) {
    console.error("Error handling payout.failed:", error);
    throw error;
  }
}

async function handleAccountUpdated(account: any, supabase: any) {
  console.log("Processing account.updated:", account.id);

  try {
    // Update Connect account status in database
    const { error: updateError } = await supabase
      .from("connect_accounts")
      .update({
        account_status: account.charges_enabled ? "active" : "pending",
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements,
        capabilities: account.capabilities,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_account_id", account.id);

    if (updateError) {
      console.error("Failed to update Connect account status:", updateError);
      throw updateError;
    }

    console.log(`Connect account ${account.id} status updated`);
  } catch (error) {
    console.error("Error handling account.updated:", error);
    throw error;
  }
}
