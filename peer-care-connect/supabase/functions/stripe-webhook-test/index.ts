import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("🔍 TEST WEBHOOK: Received request");
    console.log("🔍 TEST WEBHOOK: Method:", req.method);
    console.log("🔍 TEST WEBHOOK: Headers:", Object.fromEntries(req.headers.entries()));
    
    const body = await req.text();
    console.log("🔍 TEST WEBHOOK: Body length:", body.length);
    console.log("🔍 TEST WEBHOOK: Body preview:", body.substring(0, 200));
    
    const signature = req.headers.get("stripe-signature");
    console.log("🔍 TEST WEBHOOK: Signature:", signature);
    
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    console.log("🔍 TEST WEBHOOK: Webhook secret exists:", !!webhookSecret);
    console.log("🔍 TEST WEBHOOK: Webhook secret length:", webhookSecret?.length);
    
    return new Response(JSON.stringify({ 
      received: true, 
      method: req.method,
      bodyLength: body.length,
      signatureExists: !!signature,
      webhookSecretExists: !!webhookSecret
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error("🔍 TEST WEBHOOK ERROR:", error);
    return new Response(JSON.stringify({ 
      error: "Test webhook failed",
      message: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
