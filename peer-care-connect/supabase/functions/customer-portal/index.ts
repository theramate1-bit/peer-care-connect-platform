import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: {
        ...corsHeaders,
        "Access-Control-Max-Age": "86400",
      }
    });
  }

  try {
    logStep("Function started");

    // Check environment variables first
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
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

    // Initialize Supabase client with the service role key
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header provided");
      return new Response(JSON.stringify({ error: "No authorization header provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      logStep("ERROR: Authentication failed", { error: userError.message });
      return new Response(JSON.stringify({ error: `Authentication error: ${userError.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const user = userData.user;
    if (!user?.email) {
      logStep("ERROR: User not authenticated or email not available");
      return new Response(JSON.stringify({ error: "User not authenticated or email not available" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    // Get customer ID - try multiple methods
    let customerId: string | null = null;
    
    // Method 1: Get from subscription's Stripe subscription object (most reliable)
    try {
      const { data: subscription } = await supabaseClient
        .from("subscriptions")
        .select("stripe_subscription_id, stripe_customer_id")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing", "incomplete", "past_due"])
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (subscription?.stripe_subscription_id) {
        // Retrieve subscription from Stripe to get customer ID
        try {
          const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
          customerId = typeof stripeSubscription.customer === 'string' 
            ? stripeSubscription.customer 
            : stripeSubscription.customer?.id || null;
          
          if (customerId) {
            logStep("Found Stripe customer from subscription object", { customerId, subscriptionId: subscription.stripe_subscription_id });
          }
        } catch (stripeError) {
          logStep("Could not retrieve subscription from Stripe", { error: stripeError instanceof Error ? stripeError.message : String(stripeError) });
        }
      }
      
      // Method 2: Check database column if available
      if (!customerId && subscription?.stripe_customer_id) {
        customerId = subscription.stripe_customer_id;
        logStep("Found Stripe customer from subscription column", { customerId });
      }
    } catch (dbError) {
      logStep("Error querying subscriptions table", { error: dbError instanceof Error ? dbError.message : String(dbError) });
    }
    
    // Method 3: Try customers table
    if (!customerId) {
      try {
        const { data: customer } = await supabaseClient
          .from("customers")
          .select("stripe_customer_id")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (customer?.stripe_customer_id) {
          customerId = customer.stripe_customer_id;
          logStep("Found Stripe customer from customers table", { customerId });
        }
      } catch (dbError) {
        logStep("Error querying customers table", { error: dbError instanceof Error ? dbError.message : String(dbError) });
      }
    }
    
    // Method 4: Fallback - search Stripe by email
    if (!customerId) {
      try {
        logStep("Searching Stripe for customer by email", { email: user.email });
        const customers = await stripe.customers.list({ email: user.email, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          logStep("Found Stripe customer by email search", { customerId });
        }
      } catch (stripeError) {
        logStep("Error searching Stripe by email", { error: stripeError instanceof Error ? stripeError.message : String(stripeError) });
      }
    }
    
    if (!customerId) {
      logStep("ERROR: Could not determine Stripe customer ID");
      return new Response(JSON.stringify({ error: "No Stripe customer found for this user. Please contact support." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Get return URL from request origin or use default
    const origin = req.headers.get("origin") || req.headers.get("referer")?.split("/").slice(0, 3).join("/") || "https://theramate.co.uk";
    const returnUrl = `${origin}/settings/subscription`;
    
    logStep("Creating portal session", { customerId, returnUrl });
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    logStep("Customer portal session created", { sessionId: portalSession.id, url: portalSession.url });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in customer-portal", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});