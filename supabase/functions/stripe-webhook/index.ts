import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2023-10-16" 
    });

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("Webhook secret not configured");
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      logStep("Webhook signature verification failed", { error: err.message });
      return new Response(JSON.stringify({ error: "Webhook signature verification failed" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    logStep("Processing event", { type: event.type, id: event.id });

    // Log webhook event to database
    const { error: webhookError } = await supabaseClient
      .from('webhook_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        event_data: event.data
      });

    if (webhookError) {
      logStep("Failed to log webhook event", { error: webhookError.message });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { sessionId: session.id });

        if (session.metadata?.type === 'session_payment') {
          // Handle marketplace session payment
          await handleSessionPayment(session, supabaseClient);
        } else {
          // Handle subscription payment (existing logic)
          await handleSubscriptionPayment(session, supabaseClient);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Payment intent succeeded", { paymentIntentId: paymentIntent.id });
        await handlePaymentIntentSucceeded(paymentIntent, supabaseClient);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Payment intent failed", { paymentIntentId: paymentIntent.id });
        await handlePaymentIntentFailed(paymentIntent, supabaseClient);
        break;
      }

      case 'charge.succeeded': {
        const charge = event.data.object as Stripe.Charge;
        logStep("Charge succeeded", { chargeId: charge.id });
        await handleChargeSucceeded(charge, supabaseClient);
        break;
      }

      case 'charge.failed': {
        const charge = event.data.object as Stripe.Charge;
        logStep("Charge failed", { chargeId: charge.id });
        await handleChargeFailed(charge, supabaseClient);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment succeeded", { invoiceId: invoice.id });
        await handleInvoicePayment(invoice, supabaseClient);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { subscriptionId: subscription.id });
        await handleSubscriptionUpdate(subscription, supabaseClient);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription cancelled", { subscriptionId: subscription.id });
        await handleSubscriptionCancellation(subscription, supabaseClient);
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handleSessionPayment(session: Stripe.Checkout.Session, supabase: any) {
  const sessionId = session.metadata?.session_id;
  const practitionerId = session.metadata?.practitioner_id;
  const clientId = session.metadata?.client_id;
  const platformFee = parseInt(session.metadata?.platform_fee || "0");
  const practitionerAmount = parseInt(session.metadata?.practitioner_amount || "0");

  if (!sessionId) {
    logStep("No session ID in metadata");
    return;
  }

  try {
    // Update session payment status
    const { error: updateError } = await supabase
      .from('client_sessions')
      .update({ 
        payment_status: 'completed',
        stripe_payment_intent_id: session.payment_intent,
        platform_fee_amount: platformFee,
        practitioner_amount: practitionerAmount
      })
      .eq('id', sessionId);

    if (updateError) {
      throw updateError;
    }

    // Record platform revenue
    const { error: revenueError } = await supabase
      .from('platform_revenue')
      .insert({
        session_id: sessionId,
        practitioner_id: practitionerId,
        client_id: clientId,
        total_amount: session.amount_total / 100, // Convert from pence
        platform_fee: platformFee,
        practitioner_amount: practitionerAmount,
        stripe_session_id: session.id,
        payment_date: new Date().toISOString()
      });

    if (revenueError) {
      logStep("Failed to record platform revenue", { error: revenueError.message });
    }

    logStep("Session payment processed successfully", { sessionId });
  } catch (error) {
    logStep("Error processing session payment", { error: error.message, sessionId });
  }
}

async function handleSubscriptionPayment(session: Stripe.Checkout.Session, supabase: any) {
  // Existing subscription handling logic
  const plan = session.metadata?.plan;
  const billing = session.metadata?.billing;
  const userId = session.metadata?.user_id;

  if (!userId || !plan) {
    logStep("Missing subscription metadata");
    return;
  }

  try {
    const subscriptionEndDate = billing === 'yearly' 
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan: plan,
        billing_cycle: billing,
        status: 'active',
        stripe_subscription_id: session.subscription,
        subscription_end: subscriptionEndDate.toISOString()
      });

    if (error) {
      throw error;
    }

    logStep("Subscription updated successfully", { userId, plan });
  } catch (error) {
    logStep("Error updating subscription", { error: error.message, userId });
  }
}

async function handleInvoicePayment(invoice: Stripe.Invoice, supabase: any) {
  // Handle recurring subscription payments
  if (invoice.subscription) {
    logStep("Processing recurring subscription payment", { invoiceId: invoice.id });
    // Update subscription status and extend end date
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  try {
    const { error } = await supabase
      .from('payments')
      .insert({
        user_id: paymentIntent.metadata?.user_id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency,
        status: 'succeeded',
        payment_method: paymentIntent.payment_method?.type,
        description: paymentIntent.description,
        metadata: paymentIntent.metadata
      });

    if (error) {
      throw error;
    }

    logStep("Payment intent processed successfully", { paymentIntentId: paymentIntent.id });
  } catch (error) {
    logStep("Error processing payment intent", { error: error.message, paymentIntentId: paymentIntent.id });
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  try {
    const { error } = await supabase
      .from('payments')
      .insert({
        user_id: paymentIntent.metadata?.user_id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: 'failed',
        payment_method: paymentIntent.payment_method?.type,
        description: paymentIntent.description,
        metadata: paymentIntent.metadata
      });

    if (error) {
      throw error;
    }

    logStep("Payment intent failure recorded", { paymentIntentId: paymentIntent.id });
  } catch (error) {
    logStep("Error recording payment failure", { error: error.message, paymentIntentId: paymentIntent.id });
  }
}

async function handleChargeSucceeded(charge: Stripe.Charge, supabase: any) {
  try {
    // Update payment status if it exists
    const { error } = await supabase
      .from('payments')
      .update({ status: 'succeeded' })
      .eq('stripe_payment_intent_id', charge.payment_intent);

    if (error) {
      logStep("Error updating payment status", { error: error.message });
    }

    logStep("Charge processed successfully", { chargeId: charge.id });
  } catch (error) {
    logStep("Error processing charge", { error: error.message, chargeId: charge.id });
  }
}

async function handleChargeFailed(charge: Stripe.Charge, supabase: any) {
  try {
    // Update payment status if it exists
    const { error } = await supabase
      .from('payments')
      .update({ status: 'failed' })
      .eq('stripe_payment_intent_id', charge.payment_intent);

    if (error) {
      logStep("Error updating payment status", { error: error.message });
    }

    logStep("Charge failure recorded", { chargeId: charge.id });
  } catch (error) {
    logStep("Error recording charge failure", { error: error.message, chargeId: charge.id });
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription, supabase: any) {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: subscription.metadata?.user_id,
        stripe_subscription_id: subscription.id,
        plan: subscription.metadata?.plan || 'basic',
        billing_cycle: subscription.metadata?.billing_cycle || 'monthly',
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
      });

    if (error) {
      throw error;
    }

    logStep("Subscription updated successfully", { subscriptionId: subscription.id });
  } catch (error) {
    logStep("Error updating subscription", { error: error.message, subscriptionId: subscription.id });
  }
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription, supabase: any) {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      throw error;
    }

    logStep("Subscription cancelled successfully", { subscriptionId: subscription.id });
  } catch (error) {
    logStep("Error cancelling subscription", { error: error.message });
  }
}
