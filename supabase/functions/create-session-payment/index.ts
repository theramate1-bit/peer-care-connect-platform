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

    // Retrieve or create Stripe customer
    // CRITICAL: Check customers table first (source of truth) to prevent duplicates
    logStep("Checking for existing customer in database", { userId: user.id, email: user.email });
    let customerId: string;
    
    const { data: existingCustomer } = await supabaseClient
      .from("customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (existingCustomer?.stripe_customer_id) {
      // Customer exists in database - use it
      customerId = existingCustomer.stripe_customer_id;
      logStep("Found existing customer in database", { customerId });
      
      // Ensure customer metadata has user_id (in case it was missing)
      await stripe.customers.update(customerId, {
        metadata: { 
          supabase_user_id: user.id,
          user_id: user.id  // Add both for compatibility
        }
      });
    } else {
      // Customer not in database - check Stripe for existing customer by email
      logStep("Customer not in database, checking Stripe", { email: user.email });
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      
      if (customers.data.length > 0) {
        // Found in Stripe but not in DB - save it to prevent duplicates
        customerId = customers.data[0].id;
        logStep("Found existing customer in Stripe, saving to database", { customerId });
        
        // Save to database to prevent future duplicates
        await supabaseClient.from("customers").insert({
          user_id: user.id,
          stripe_customer_id: customerId,
          email: user.email,
        });
        
        // Ensure customer metadata has user_id
        await stripe.customers.update(customerId, {
          metadata: { 
            supabase_user_id: user.id,
            user_id: user.id
          }
        });
      } else {
        // No customer found anywhere - create new one
        logStep("Creating new Stripe customer", { email: user.email });
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { 
            supabase_user_id: user.id,
            user_id: user.id  // Add both for compatibility
          },
        });
        customerId = customer.id;
        logStep("Created new customer", { customerId });
        
        // Save to database to prevent duplicates
        await supabaseClient.from("customers").insert({
          user_id: user.id,
          stripe_customer_id: customer.id,
          email: user.email,
        });
      }
    }

    // Platform commission (0.5%)
    const platformFee = Math.round(amount * 0.005);
    const practitionerAmount = amount - platformFee;

    // Create payment session for marketplace transaction
    // CRITICAL: Always use customer parameter (never customer_email) to prevent auto-creation
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
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
