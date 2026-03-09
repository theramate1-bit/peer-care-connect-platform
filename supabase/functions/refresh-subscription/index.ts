import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

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
    console.log("🔄 refresh-subscription: Starting");

    // Verify environment variables
    if (!Deno.env.get("STRIPE_SECRET_KEY")) {
      console.error("❌ Missing STRIPE_SECRET_KEY");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Get authenticated user from request
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("❌ No authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // Create anon client for auth verification
    const anonSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    // Verify the token and get user
    const { data: { user }, error: authError } = await anonSupabase.auth.getUser(token);

    if (authError || !user) {
      console.error("❌ Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    console.log("✅ Authenticated user:", user.id);

    // Get user's subscription from database
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("id, stripe_subscription_id, user_id")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing", "incomplete", "past_due"])
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error("❌ Error fetching subscription:", subError);
      return new Response(JSON.stringify({ error: "Failed to fetch subscription" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!subscription || !subscription.stripe_subscription_id) {
      console.log("ℹ️ No subscription found for user");
      return new Response(JSON.stringify({ 
        success: false,
        message: "No active subscription found"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log("🔍 Fetching subscription from Stripe:", subscription.stripe_subscription_id);

    // Retrieve subscription from Stripe
    let stripeSubscription: Stripe.Subscription;
    try {
      stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
      console.log("✅ Retrieved subscription from Stripe:", {
        id: stripeSubscription.id,
        status: stripeSubscription.status,
        current_period_start: stripeSubscription.current_period_start,
        current_period_end: stripeSubscription.current_period_end,
      });
    } catch (stripeError: any) {
      console.error("❌ Error retrieving subscription from Stripe:", stripeError);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Failed to retrieve subscription from Stripe",
        message: stripeError.message
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Map Stripe status to database-compatible status
    // Database CHECK constraint only allows: 'active', 'cancelled', 'past_due', 'unpaid'
    // Stripe can return: 'active', 'past_due', 'canceled', 'unpaid', 'trialing', 'incomplete', 'incomplete_expired', 'paused'
    let dbStatus = stripeSubscription.status;
    if (dbStatus === 'trialing' || dbStatus === 'incomplete') {
      // Map trialing/incomplete to 'active' for database compatibility
      dbStatus = 'active';
    } else if (dbStatus === 'canceled' || dbStatus === 'cancelled') {
      dbStatus = 'cancelled'; // Normalize to database format
    } else if (dbStatus === 'incomplete_expired' || dbStatus === 'paused') {
      dbStatus = 'unpaid'; // Treat as unpaid
    } else if (!['active', 'cancelled', 'past_due', 'unpaid'].includes(dbStatus)) {
      console.warn(`⚠️ Unexpected Stripe status: ${dbStatus}, defaulting to 'active'`);
      dbStatus = 'active'; // Default fallback
    }

    // Convert Unix timestamps (seconds) to ISO strings
    const updateData: any = {
      status: dbStatus,
      cancel_at_period_end: stripeSubscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    };

    if (stripeSubscription.current_period_start) {
      updateData.current_period_start = new Date(stripeSubscription.current_period_start * 1000).toISOString();
    }

    if (stripeSubscription.current_period_end) {
      updateData.current_period_end = new Date(stripeSubscription.current_period_end * 1000).toISOString();
    }

    if (stripeSubscription.ended_at) {
      updateData.ended_at = new Date(stripeSubscription.ended_at * 1000).toISOString();
    }

    // Update subscription in database
    const { data: updatedSubscription, error: updateError } = await supabase
      .from("subscriptions")
      .update(updateData)
      .eq("id", subscription.id)
      .select("*")
      .single();

    if (updateError) {
      console.error("❌ Error updating subscription:", updateError);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Failed to update subscription",
        message: updateError.message
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log("✅ Subscription updated successfully:", updatedSubscription.id);

    return new Response(JSON.stringify({ 
      success: true,
      subscription: updatedSubscription
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("❌ Unexpected error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: "Internal server error",
      message: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

