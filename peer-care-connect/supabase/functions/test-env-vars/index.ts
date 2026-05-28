import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const envVars = {
      STRIPE_SECRET_KEY: Deno.env.get("STRIPE_SECRET_KEY") ? "SET" : "NOT SET",
      SUPABASE_URL: Deno.env.get("SUPABASE_URL") ? "SET" : "NOT SET",
      SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY") ? "SET" : "NOT SET",
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ? "SET" : "NOT SET",
    };

    return new Response(JSON.stringify({ 
      message: "Environment variables status",
      envVars 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error) 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
