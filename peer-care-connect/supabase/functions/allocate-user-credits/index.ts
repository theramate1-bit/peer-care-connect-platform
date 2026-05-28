import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Helper function to determine monthly credits from plan
function getMonthlyCredits(plan: string): number {
  if (plan === 'pro') return 120;
  if (plan === 'practitioner') return 60;
  return 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user from request
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
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
      return new Response(JSON.stringify({ error: "Unauthorized", details: authError?.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    console.log("✅ Authenticated user:", user.id);

    // Get user's active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, user_id, plan, monthly_credits, current_period_start, current_period_end, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error("❌ Error fetching subscription:", subError);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Database error",
        details: subError.message
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!subscription) {
      return new Response(JSON.stringify({ 
        success: false,
        message: "No active subscription found",
        details: "Please subscribe to a plan to receive monthly credits"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Determine correct monthly_credits if not set
    const correctCredits = subscription.monthly_credits || getMonthlyCredits(subscription.plan || 'practitioner');
    
    // Update monthly_credits if missing or incorrect
    if (!subscription.monthly_credits || subscription.monthly_credits !== correctCredits) {
      console.log(`📝 Updating monthly_credits from ${subscription.monthly_credits} to ${correctCredits} for plan ${subscription.plan}`);
      await supabase
        .from('subscriptions')
        .update({ monthly_credits: correctCredits })
        .eq('id', subscription.id);
    }

    // Check if credits have been allocated for current period
    const { data: existingAllocation } = await supabase
      .from('credit_allocations')
      .select('allocated_at')
      .eq('subscription_id', subscription.id)
      .gte('allocated_at', subscription.current_period_start)
      .lte('allocated_at', subscription.current_period_end || new Date().toISOString())
      .order('allocated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingAllocation) {
      return new Response(JSON.stringify({ 
        success: true,
        message: "Credits already allocated for this period",
        last_allocation: existingAllocation.allocated_at,
        monthly_credits: correctCredits
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Allocate credits if none exist for current period
    console.log(`💰 Allocating ${correctCredits} credits for user ${user.id} (${subscription.plan} plan)`);
    
    const { error: allocError } = await supabase.rpc('allocate_monthly_credits', {
      p_user_id: user.id,
      p_subscription_id: subscription.id,
      p_amount: correctCredits,
      p_allocation_type: 'initial',
      p_period_start: subscription.current_period_start || new Date().toISOString(),
      p_period_end: subscription.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    if (allocError) {
      console.error("❌ Error allocating credits:", allocError);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Failed to allocate credits",
        details: allocError.message
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log(`✅ Credits allocated successfully: ${correctCredits} credits`);
    return new Response(JSON.stringify({ 
      success: true,
      message: `Successfully allocated ${correctCredits} credits`,
      monthly_credits: correctCredits,
      plan: subscription.plan
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("❌ Error in allocate-user-credits:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

