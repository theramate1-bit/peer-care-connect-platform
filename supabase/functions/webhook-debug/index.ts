import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== WEBHOOK DEBUG ===");
    console.log("Method:", req.method);
    console.log("Headers:", Object.fromEntries(req.headers.entries()));
    
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    console.log("Signature exists:", !!signature);
    console.log("Webhook secret exists:", !!webhookSecret);
    console.log("Signature value:", signature);
    console.log("Webhook secret (first 10 chars):", webhookSecret?.substring(0, 10));
    
    // Get the raw body
    const rawBody = await req.text();
    console.log("Body length:", rawBody.length);
    console.log("Body preview:", rawBody.substring(0, 200) + "...");
    
    if (!signature || !webhookSecret) {
      return new Response(JSON.stringify({ 
        error: "Missing signature or webhook secret",
        signature_exists: !!signature,
        webhook_secret_exists: !!webhookSecret
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Try to verify the signature
    try {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
        apiVersion: "2024-12-18.acacia",
      });
      
      const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      console.log("✅ Signature verification successful");
      console.log("Event type:", event.type);
      console.log("Event ID:", event.id);
      
      return new Response(JSON.stringify({ 
        success: true,
        event_type: event.type,
        event_id: event.id,
        message: "Webhook signature verified successfully"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
      
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err);
      console.error("Error details:", err.message);
      
      return new Response(JSON.stringify({ 
        error: "Invalid signature",
        details: err.message,
        signature_header: signature,
        webhook_secret_preview: webhookSecret.substring(0, 10),
        body_length: rawBody.length
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

  } catch (error) {
    console.error("Webhook debug error:", error);
    return new Response(JSON.stringify({ 
      error: "Webhook debug failed",
      details: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});