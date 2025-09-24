import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Check environment variables first
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey) {
      logStep("ERROR: STRIPE_SECRET_KEY environment variable is not set");
      return new Response(JSON.stringify({ 
        error: "STRIPE_SECRET_KEY environment variable is not set. Please configure this in your Supabase project settings." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!supabaseUrl) {
      logStep("ERROR: SUPABASE_URL environment variable is not set");
      return new Response(JSON.stringify({ 
        error: "SUPABASE_URL environment variable is not set. Please configure this in your Supabase project settings." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!supabaseAnonKey) {
      logStep("ERROR: SUPABASE_ANON_KEY environment variable is not set");
      return new Response(JSON.stringify({ 
        error: "SUPABASE_ANON_KEY environment variable is not set. Please configure this in your Supabase project settings." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!supabaseServiceKey) {
      logStep("ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
      return new Response(JSON.stringify({ 
        error: "SUPABASE_SERVICE_ROLE_KEY environment variable is not set. Please configure this in your Supabase project settings." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    logStep("Environment variables verified");

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header provided");
      return new Response(JSON.stringify({ error: "No authorization header provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) {
      logStep("ERROR: User not authenticated or email not available");
      return new Response(JSON.stringify({ error: "User not authenticated or email not available" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { plan, billing } = await req.json();
    logStep("Request data", { plan, billing });

    const stripe = new Stripe(stripeKey, { 
      apiVersion: "2023-10-16" 
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    // Define plan pricing (in pence)
    const planPricing = {
      starter: { monthly: 0, yearly: 0 }, // Free plan
      practitioner: { monthly: 7999, yearly: 7199 }, // £79.99/month, £71.99/month yearly
      clinic: { monthly: 19999, yearly: 17999 }, // £199.99/month, £179.99/month yearly
    };

    const priceAmount = planPricing[plan as keyof typeof planPricing]?.[billing as 'monthly' | 'yearly'];
    if (priceAmount === undefined) {
      logStep("ERROR: Invalid plan or billing cycle", { plan, billing });
      return new Response(JSON.stringify({ error: "Invalid plan or billing cycle" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    // Handle free starter plan
    if (priceAmount === 0) {
      // Upsert into subscriptions table for free plan
      const supabaseService = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

      const { error } = await supabaseService
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          plan: plan,
          billing_cycle: 'monthly',
          status: 'active',
          stripe_subscription_id: null,
          current_period_start: new Date().toISOString(),
          current_period_end: null
        }, { onConflict: 'user_id' });

      if (error) {
        logStep("ERROR: Failed to update subscription in database", { error: error.message });
        return new Response(JSON.stringify({ error: `Database error: ${error.message}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      logStep("Free plan subscription created successfully");
      return new Response(JSON.stringify({ 
        url: `${req.headers.get("origin")}/dashboard?plan=starter&status=success`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: { 
              name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
              description: `Therapist platform subscription - ${billing} billing`
            },
            unit_amount: priceAmount,
            recurring: { interval: billing === 'yearly' ? 'year' : 'month' },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/pricing`,
      metadata: {
        plan: plan,
        billing: billing,
        user_id: user.id
      }
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});