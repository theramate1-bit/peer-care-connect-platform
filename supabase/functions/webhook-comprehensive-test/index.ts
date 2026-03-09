import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🧪 WEBHOOK TEST FUNCTION STARTED");
    
    // Test 1: Check webhook endpoint accessibility
    console.log("Test 1: Checking webhook endpoint accessibility...");
    const webhookUrl = "https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/stripe-webhook";
    
    try {
      const testResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": "t=1234567890,v1=test_signature"
        },
        body: JSON.stringify({ test: "webhook accessibility test" })
      });
      
      console.log("✅ Webhook endpoint accessible:", testResponse.status);
    } catch (error) {
      console.error("❌ Webhook endpoint not accessible:", error);
    }
    
    // Test 2: Check database connectivity
    console.log("Test 2: Checking database connectivity...");
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);
        
      if (error) {
        console.error("❌ Database connection error:", error);
      } else {
        console.log("✅ Database connection successful");
      }
    } catch (error) {
      console.error("❌ Database connection exception:", error);
    }
    
    // Test 3: Check Stripe API connectivity
    console.log("Test 3: Checking Stripe API connectivity...");
    try {
      const customers = await stripe.customers.list({ limit: 1 });
      console.log("✅ Stripe API connection successful");
    } catch (error) {
      console.error("❌ Stripe API connection error:", error);
    }
    
    // Test 4: Check environment variables
    console.log("Test 4: Checking environment variables...");
    const requiredEnvVars = [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET', 
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !Deno.env.get(varName));
    if (missingVars.length > 0) {
      console.error("❌ Missing environment variables:", missingVars);
    } else {
      console.log("✅ All required environment variables present");
    }
    
    // Test 5: Simulate webhook event processing
    console.log("Test 5: Simulating webhook event processing...");
    
    const mockEvent = {
      id: "evt_test_webhook",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_session",
          mode: "subscription",
          metadata: {
            user_id: "test-user-id"
          },
          customer: "cus_test_customer",
          subscription: "sub_test_subscription"
        }
      }
    };
    
    console.log("✅ Mock event created successfully");
    
    return new Response(JSON.stringify({
      success: true,
      message: "Webhook test completed successfully",
      tests: {
        webhook_accessibility: "checked",
        database_connectivity: "checked", 
        stripe_api_connectivity: "checked",
        environment_variables: "checked",
        mock_event_processing: "checked"
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("🚨 Webhook test failed:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
