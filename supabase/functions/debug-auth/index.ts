import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔍 DEBUG: Request headers:", Object.fromEntries(req.headers.entries()));
    
    const authHeader = req.headers.get("authorization");
    console.log("🔍 DEBUG: Auth header:", authHeader);
    
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        error: "No authorization header",
        headers: Object.fromEntries(req.headers.entries())
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log("🔍 DEBUG: User:", user);
    console.log("🔍 DEBUG: User error:", userError);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ 
        error: "Unauthorized",
        userError: userError?.message,
        user: user
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      user: {
        id: user.id,
        email: user.email
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("🔍 DEBUG: Error:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

