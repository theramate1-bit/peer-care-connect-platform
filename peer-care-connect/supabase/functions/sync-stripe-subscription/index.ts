import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use a stable Stripe API version or default to key's version
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  // Set to a currently supported API version; omit to use the account default
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const toSafeEpochSeconds = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return Math.floor(value);
};

const addBillingInterval = (startEpochSeconds: number, interval: string | null, intervalCount: number): number => {
  const safeCount = Number.isFinite(intervalCount) && intervalCount > 0 ? Math.floor(intervalCount) : 1;
  const startDate = new Date(startEpochSeconds * 1000);

  if (interval === "year") {
    startDate.setUTCFullYear(startDate.getUTCFullYear() + safeCount);
    return Math.floor(startDate.getTime() / 1000);
  }
  if (interval === "month") {
    startDate.setUTCMonth(startDate.getUTCMonth() + safeCount);
    return Math.floor(startDate.getTime() / 1000);
  }
  if (interval === "week") {
    return startEpochSeconds + (7 * 24 * 60 * 60 * safeCount);
  }
  if (interval === "day") {
    return startEpochSeconds + (24 * 60 * 60 * safeCount);
  }

  // Default to one month if Stripe interval is missing/unsupported.
  startDate.setUTCMonth(startDate.getUTCMonth() + 1);
  return Math.floor(startDate.getTime() / 1000);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔄 sync-stripe-subscription: Starting");
    
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
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      console.error("❌ Auth error:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized", details: authError?.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    console.log("✅ Authenticated user:", user.id);

    // Wrap database queries in try-catch to handle all errors gracefully
    let userProfile: any = null;
    let customer: any = null;

    try {
      // Check user role - clients don't need subscriptions
      const profileResult = await supabase
        .from("users")
        .select("user_role")
        .eq("id", user.id)
        .maybeSingle();
      
      if (profileResult.error) {
        const errorMessage = profileResult.error.message || '';
        console.log("ℹ️ User profile query error (continuing without role check):", errorMessage);
      } else {
        userProfile = profileResult.data;
      }
    } catch (profileErr: any) {
      console.log("ℹ️ User profile query exception (continuing without role check):", profileErr?.message);
    }

    // If user is a client, return early - clients don't need subscriptions
    if (userProfile?.user_role === 'client') {
      console.log("ℹ️ User is a client - subscriptions not required");
      return new Response(JSON.stringify({ 
        success: false,
        message: "Clients do not require subscriptions",
        user_role: 'client'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    try {
      // Get Stripe customer ID from database
      console.log("🔍 Looking up Stripe customer for user:", user.id);
      const customerResult = await supabase
        .from("customers")
        .select("stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (customerResult.error) {
        const errorMessage = customerResult.error.message || '';
        console.log("ℹ️ Customer query error (treating as no customer):", errorMessage);
        customer = null;
      } else {
        customer = customerResult.data;
      }
    } catch (customerErr: any) {
      console.log("ℹ️ Customer query exception (treating as no customer):", customerErr?.message);
      customer = null;
    }

    // Handle case where customer doesn't exist
    if (!customer || !customer.stripe_customer_id) {
      console.log("ℹ️ No Stripe customer found for user");
      return new Response(JSON.stringify({ 
        success: false,
        message: "No Stripe customer found",
        details: "Please complete a payment to create a Stripe customer first"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Return 200 with message, not 404 or 500
      });
    }
    
    console.log("✅ Found Stripe customer:", customer.stripe_customer_id);

    // Query Stripe for active subscriptions
    console.log("🔍 Querying Stripe for subscriptions...");
    let subscriptions;
    try {
      subscriptions = await stripe.subscriptions.list({
        customer: customer.stripe_customer_id,
        status: "all", // Get all subscriptions (active, past_due, canceled, etc.)
        limit: 100,
      });
      console.log(`✅ Found ${subscriptions.data.length} subscriptions in Stripe`);
    } catch (stripeError: any) {
      console.error("❌ Stripe API error:", stripeError.message);
      // Don't include "error" field - use "message" instead to avoid client treating it as error
      return new Response(JSON.stringify({ 
        success: false,
        message: "Stripe API error",
        details: stripeError.message
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (subscriptions.data.length === 0) {
      console.log("ℹ️ No subscriptions found in Stripe");
      return new Response(JSON.stringify({ 
        success: false,
        message: "No subscriptions found in Stripe",
        customer_id: customer.stripe_customer_id
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Find active subscription
    // Include all statuses that could be considered "active" for our purposes
    const activeSubscription = subscriptions.data.find(
      sub => ['active', 'trialing', 'incomplete', 'past_due', 'incomplete_expired'].includes(sub.status)
    );

    if (!activeSubscription) {
      return new Response(JSON.stringify({ 
        success: false,
        message: "No active subscription found in Stripe",
        subscriptions: subscriptions.data.map(s => ({ id: s.id, status: s.status }))
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Determine plan and billing cycle from price_id
    const priceId = activeSubscription.items.data[0]?.price.id;
    let plan = 'practitioner'; // default
    let billingCycle = 'monthly'; // default
    
    if (priceId) {
      // Practitioner plans
      if (priceId.includes('SGfP1Fk77knaVvan6m5IRRS') || priceId.includes('SL6QFFk77knaVvaRMyinzWv')) {
        plan = 'practitioner';
        billingCycle = priceId.includes('SL6') ? 'yearly' : 'monthly';
      } 
      // Pro plans
      else if (priceId.includes('SGfPIFk77knaVvaeBxPlhJ9') || priceId.includes('SL6QFFk77knaVvarSHwZKou')) {
        plan = 'pro';
        billingCycle = priceId.includes('SL6') ? 'yearly' : 'monthly';
      }
      // Clinic plans (from config/payments.ts)
      else if (priceId.includes('1S6BTTFk77knaVvadG0HDJAI') || priceId.includes('1S6BTWFk77knaVvagCKZZh3H')) {
        plan = 'clinic';
        billingCycle = priceId.includes('1S6BTW') ? 'yearly' : 'monthly';
      }
      // Try to determine from Stripe price recurring interval
      else if (activeSubscription.items.data[0]?.price.recurring?.interval) {
        const stripeInterval = activeSubscription.items.data[0].price.recurring.interval;
        // Stripe uses 'month' and 'year', database uses 'monthly' and 'yearly'
        if (stripeInterval === 'month') {
          billingCycle = 'monthly';
        } else if (stripeInterval === 'year') {
          billingCycle = 'yearly';
        } else {
          // For other intervals (day, week), default to monthly
          console.warn(`⚠️ Unsupported Stripe interval: ${stripeInterval}, defaulting to 'monthly'`);
          billingCycle = 'monthly';
        }
      }
    }
    
    // Also check subscription metadata for plan
    if (activeSubscription.metadata?.plan) {
      plan = activeSubscription.metadata.plan;
    }
    if (activeSubscription.metadata?.billing_cycle || activeSubscription.metadata?.billing) {
      billingCycle = activeSubscription.metadata.billing_cycle || activeSubscription.metadata.billing;
    }

    // Map Stripe status to database-compatible status
    // Database CHECK constraint only allows: 'active', 'cancelled', 'past_due', 'unpaid'
    // Stripe can return: 'active', 'past_due', 'canceled', 'unpaid', 'trialing', 'incomplete', 'incomplete_expired', 'paused'
    let dbStatus = activeSubscription.status;
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

    // Validate billing_cycle matches CHECK constraint ('monthly' or 'yearly')
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      console.warn(`⚠️ Invalid billing_cycle: ${billingCycle}, defaulting to 'monthly'`);
      billingCycle = 'monthly'; // Default fallback
    }

    // Resolve billing period boundaries from Stripe with resilient fallbacks.
    const nowEpochSeconds = Math.floor(Date.now() / 1000);
    const stripeInterval = activeSubscription.items.data[0]?.price?.recurring?.interval ?? null;
    const stripeIntervalCount = activeSubscription.items.data[0]?.price?.recurring?.interval_count ?? 1;
    const inferredStartEpochSeconds = [
      toSafeEpochSeconds(activeSubscription.current_period_start),
      toSafeEpochSeconds(activeSubscription.items.data[0]?.current_period_start),
      toSafeEpochSeconds(activeSubscription.billing_cycle_anchor),
      toSafeEpochSeconds(activeSubscription.start_date),
      nowEpochSeconds,
    ].find((value): value is number => typeof value === "number") ?? nowEpochSeconds;

    const inferredEndEpochSeconds = [
      toSafeEpochSeconds(activeSubscription.current_period_end),
      toSafeEpochSeconds(activeSubscription.items.data[0]?.current_period_end),
      toSafeEpochSeconds(activeSubscription.cancel_at),
      addBillingInterval(inferredStartEpochSeconds, stripeInterval, stripeIntervalCount),
    ].find((value): value is number => typeof value === "number" && value > inferredStartEpochSeconds)
      ?? addBillingInterval(inferredStartEpochSeconds, stripeInterval, stripeIntervalCount);

    // Prepare subscription data (all required fields)
    const subscriptionData = {
      user_id: user.id,
      stripe_subscription_id: activeSubscription.id,
      stripe_customer_id: activeSubscription.customer as string,
      status: dbStatus, // Use mapped status that matches CHECK constraint
      plan: plan, // REQUIRED
      billing_cycle: billingCycle, // REQUIRED - must be 'monthly' or 'yearly'
      price_id: priceId,
      quantity: activeSubscription.items.data[0]?.quantity || 1,
      cancel_at_period_end: activeSubscription.cancel_at_period_end || false,
      current_period_start: new Date(inferredStartEpochSeconds * 1000).toISOString(),
      current_period_end: new Date(inferredEndEpochSeconds * 1000).toISOString(),
      subscription_end: new Date(inferredEndEpochSeconds * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    console.log("📦 Prepared subscription data:", {
      plan,
      billing_cycle: billingCycle,
      status: subscriptionData.status,
      price_id: subscriptionData.price_id,
      current_period_start: subscriptionData.current_period_start,
      current_period_end: subscriptionData.current_period_end,
      stripe_raw_period_start: activeSubscription.current_period_start ?? null,
      stripe_raw_period_end: activeSubscription.current_period_end ?? null,
    });

    // Prevent duplicate active subscriptions: check and deactivate existing ones
    if (subscriptionData.status === 'active') {
      const { data: existingActive, error: checkError } = await supabase
        .from('subscriptions')
        .select('id, stripe_subscription_id, plan')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .neq('stripe_subscription_id', subscriptionData.stripe_subscription_id);
      
      if (!checkError && existingActive && existingActive.length > 0) {
        console.log(`⚠️ Found ${existingActive.length} existing active subscription(s) for user ${user.id}. Deactivating before activating new subscription.`);
        
        // Deactivate existing active subscriptions
        const { error: deactivateError } = await supabase
          .from('subscriptions')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('status', 'active')
          .neq('stripe_subscription_id', subscriptionData.stripe_subscription_id);
        
        if (deactivateError) {
          console.error(`❌ Error deactivating existing subscriptions:`, deactivateError);
          // Continue anyway - the database trigger will handle it
        } else {
          console.log(`✅ Deactivated ${existingActive.length} existing active subscription(s)`);
        }
      }
    }

    // Upsert subscription
    console.log("💾 Upserting subscription to database:", subscriptionData.stripe_subscription_id);
    const { error: upsertError } = await supabase
      .from("subscriptions")
      .upsert(subscriptionData, { 
        onConflict: 'stripe_subscription_id',
        ignoreDuplicates: false 
      });

    if (upsertError) {
      console.error("❌ Error upserting subscription:", upsertError);
      console.error("❌ Error code:", upsertError.code);
      console.error("❌ Error message:", upsertError.message);
      console.error("❌ Error hint:", upsertError.hint);
      console.error("❌ Subscription data:", JSON.stringify(subscriptionData, null, 2));
      
      // Check if it's a CHECK constraint violation
      if (upsertError.code === '23514' || upsertError.message?.includes('check constraint')) {
        console.error("❌ CHECK constraint violation - status or billing_cycle invalid");
        console.error("❌ Attempted status:", subscriptionData.status);
        console.error("❌ Attempted billing_cycle:", subscriptionData.billing_cycle);
      }
      
      // Don't include "error" field - use "message" instead to avoid client treating it as error
      return new Response(JSON.stringify({ 
        success: false,
        message: "Failed to sync subscription",
        details: upsertError.message,
        code: upsertError.code,
        hint: upsertError.hint,
        attempted_data: {
          status: subscriptionData.status,
          billing_cycle: subscriptionData.billing_cycle,
          plan: subscriptionData.plan
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    console.log("✅ Subscription synced successfully:", activeSubscription.id);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Subscription synced successfully",
      subscription_id: activeSubscription.id,
      status: activeSubscription.status,
      synced_data: subscriptionData
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Error in sync-stripe-subscription:", error);
    // Return 200 instead of 500 so frontend can proceed even on unexpected errors
    // Don't include "error" field - use "message" instead to avoid client treating it as error
    return new Response(JSON.stringify({ 
      success: false,
      message: "Internal server error",
      details: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});

