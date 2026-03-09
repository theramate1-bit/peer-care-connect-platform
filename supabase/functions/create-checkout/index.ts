import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// CORS headers - restrict to allowed origins in production
const getAllowedOrigin = (): string => {
  const origin = Deno.env.get('ALLOWED_ORIGINS') || '';
  const allowedOrigins = origin.split(',').map(o => o.trim()).filter(Boolean);
  
  if (allowedOrigins.length > 0) {
    return allowedOrigins[0];
  }
  
  return Deno.env.get('ENVIRONMENT') === 'production' ? '' : '*';
};

const corsHeaders = (origin?: string | null): Record<string, string> => {
  const allowedOrigin = getAllowedOrigin();
  const requestOrigin = origin || '*';
  
  const corsOrigin = allowedOrigin === '*' || Deno.env.get('ENVIRONMENT') !== 'production'
    ? '*'
    : (allowedOrigin.includes(requestOrigin) ? requestOrigin : '');
  
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
}

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

serve(async (req) => {
  const origin = req.headers.get('origin');
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  try {
    // Get authenticated user from request headers
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Initialize Supabase client with anon key for user validation
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    // Verify user with Supabase Auth using official method
    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      return new Response(JSON.stringify({
        error: "Unauthorized",
        details: userError?.message || "No user found"
      }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Initialize Supabase client with service role key for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate Content-Type
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: "Content-Type must be application/json" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Parse and validate request body
    let body;
    try {
      const bodyText = await req.text();
      
      // Limit body size to prevent DoS (10MB limit)
      if (bodyText.length > 10 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: "Request body is too large (max 10MB)" }), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          status: 400,
        });
      }
      
      if (!bodyText || bodyText.trim().length === 0) {
        return new Response(JSON.stringify({ error: "Request body is empty" }), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          status: 400,
        });
      }
      
      body = JSON.parse(bodyText);
    } catch (error) {
      console.error('[CREATE-CHECKOUT] Failed to parse request body:', error);
      return new Response(JSON.stringify({ error: "Invalid JSON in request body", details: error.message }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Validate priceId
    const { priceId } = body;
    
    if (!priceId || typeof priceId !== 'string') {
      return new Response(JSON.stringify({ error: "Price ID is required and must be a string" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    // Validate priceId format (Stripe price IDs start with price_)
    if (!priceId.startsWith('price_') || priceId.length < 7) {
      return new Response(JSON.stringify({ error: "Invalid Price ID format" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    // Validate priceId length (Stripe IDs are typically 27-50 characters)
    if (priceId.length > 100) {
      return new Response(JSON.stringify({ error: "Price ID is too long" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    console.log('[CREATE-CHECKOUT] Received validated priceId:', priceId);

    // Retrieve or create Stripe customer
    console.log('[CREATE-CHECKOUT] Processing for user:', user.id);
    let customerId: string;
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.stripe_customer_id;
      
      // Ensure customer metadata has user_id (in case it was missing)
      console.log("🔧 Updating existing customer metadata with user_id");
      await stripe.customers.update(customerId, {
        metadata: { 
          supabase_user_id: user.id,
          user_id: user.id  // Add both for compatibility
        }
      });
    } else {
      console.log("🆕 Creating new customer with user_id metadata");
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { 
          supabase_user_id: user.id,
          user_id: user.id  // Add both for compatibility
        },
      });
      customerId = customer.id;
      await supabase.from("customers").insert({
        user_id: user.id,
        stripe_customer_id: customer.id,
      });
    }

    // Create Stripe checkout session
    const sessionConfig: any = {
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/pricing`,
      allow_promotion_codes: true, // Enable discount code input on Stripe checkout page
      metadata: {
        user_id: user.id,
        supabase_user_id: user.id,  // Add both for compatibility
        price_id: priceId,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          supabase_user_id: user.id,  // Add both for compatibility
          price_id: priceId,
        }
      },
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in create-checkout:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      status: 500,
    });
  }
});