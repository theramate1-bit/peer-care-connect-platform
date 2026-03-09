// Stripe Webhook Handler for Credit Allocation
// Allocates monthly credits to practitioners when they subscribe or renew

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📥 Received Stripe webhook for credit allocation");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the Stripe event from request body
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    // In production, verify the signature using Stripe's webhook secret
    // For now, we'll trust the request (you should add verification)
    const event = JSON.parse(body);

    console.log("🔄 Processing event:", event.type);

    // Handle subscription events
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      
      // Check if this is a subscription creation
      if (session.mode === "subscription" && session.subscription) {
        const subscriptionId = session.subscription;
        
        // Get subscription details from database
        const { data: subscription, error: subError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("stripe_subscription_id", subscriptionId)
          .single();

        if (subError || !subscription) {
          console.error("❌ Subscription not found:", subError);
          return new Response(
            JSON.stringify({ success: false, error: "Subscription not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Allocate initial credits
        console.log(`💰 Allocating initial credits to user ${subscription.user_id}`);
        
        const { data: allocationId, error: allocError } = await supabase
          .rpc("allocate_monthly_credits", {
            p_user_id: subscription.user_id,
            p_subscription_id: subscription.id,
            p_amount: subscription.monthly_credits || 0,
            p_allocation_type: "initial",
            p_period_start: subscription.current_period_start,
            p_period_end: subscription.current_period_end
          });

        if (allocError) {
          console.error("❌ Error allocating credits:", allocError);
          return new Response(
            JSON.stringify({ success: false, error: allocError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("✅ Initial credits allocated:", allocationId);
        return new Response(
          JSON.stringify({ success: true, allocationId }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Handle recurring subscription payments
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      
      if (invoice.subscription) {
        const subscriptionId = invoice.subscription;
        
        // Get subscription details from database
        const { data: subscription, error: subError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        if (subError || !subscription) {
          console.error("❌ Subscription not found:", subError);
          return new Response(
            JSON.stringify({ success: false, error: "Subscription not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if credits should be allocated (renewal)
        const now = new Date();
        const lastAllocation = subscription.last_credit_allocation 
          ? new Date(subscription.last_credit_allocation) 
          : null;
        
        // Only allocate if more than 30 days have passed since last allocation
        const shouldAllocate = !lastAllocation || 
          (now.getTime() - lastAllocation.getTime()) > 30 * 24 * 60 * 60 * 1000;

        if (shouldAllocate && subscription.monthly_credits > 0) {
          console.log(`💰 Allocating monthly credits to user ${subscription.user_id}`);
          
          const { data: allocationId, error: allocError } = await supabase
            .rpc("allocate_monthly_credits", {
              p_user_id: subscription.user_id,
              p_subscription_id: subscription.id,
              p_amount: subscription.monthly_credits,
              p_allocation_type: "monthly",
              p_period_start: subscription.current_period_start,
              p_period_end: subscription.current_period_end
            });

          if (allocError) {
            console.error("❌ Error allocating monthly credits:", allocError);
            return new Response(
              JSON.stringify({ success: false, error: allocError.message }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          console.log("✅ Monthly credits allocated:", allocationId);
          return new Response(
            JSON.stringify({ success: true, allocationId }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Return success for unhandled events
    return new Response(
      JSON.stringify({ success: true, message: "Event handled" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
