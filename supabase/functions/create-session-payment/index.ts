import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-SESSION-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { sessionId, practitionerId, amount, duration } = await req.json();
    logStep("Request data", { sessionId, practitionerId, amount, duration });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2023-10-16" 
    });

    // Get practitioner details and their Stripe account
    const { data: practitioner, error: practitionerError } = await supabaseClient
      .from('therapist_profiles')
      .select('stripe_account_id, user_id, first_name, last_name')
      .eq('user_id', practitionerId)
      .single();

    if (practitionerError || !practitioner) {
      throw new Error("Practitioner not found");
    }

    logStep("Found practitioner", { practitionerId: practitioner.user_id });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    // Platform commission (5%)
    const platformFee = Math.round(amount * 0.05);
    const practitionerAmount = amount - platformFee;

    // Create payment session for marketplace transaction
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: { 
              name: `Therapy Session - ${practitioner.first_name} ${practitioner.last_name}`,
              description: `${duration}-minute session`,
            },
            unit_amount: amount * 100, // Convert to pence
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/marketplace`,
      metadata: {
        type: "session_payment",
        session_id: sessionId,
        practitioner_id: practitionerId,
        client_id: user.id,
        platform_fee: platformFee.toString(),
        practitioner_amount: practitionerAmount.toString()
      },
      payment_intent_data: practitioner.stripe_account_id ? {
        application_fee_amount: platformFee * 100, // Platform commission in pence
        transfer_data: {
          destination: practitioner.stripe_account_id,
        },
      } : undefined,
    });

    logStep("Payment session created", { sessionId: session.id, url: session.url });

    // Update the session payment status
    const { error: updateError } = await supabaseClient
      .from('client_sessions')
      .update({ 
        stripe_session_id: session.id,
        payment_status: 'processing'
      })
      .eq('id', sessionId);

    if (updateError) {
      logStep("Warning: Failed to update session", { error: updateError.message });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-session-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
