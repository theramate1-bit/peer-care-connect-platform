import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Allow unauthenticated access for testing
  const apikey = req.headers.get('apikey');
  if (!apikey) {
    return new Response(JSON.stringify({ error: 'Missing apikey header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Test environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const appUrl = Deno.env.get('APP_URL');

    const envStatus = {
      SUPABASE_URL: supabaseUrl ? 'OK' : 'MISSING',
      SUPABASE_ANON_KEY: supabaseAnonKey ? `OK (${supabaseAnonKey.substring(0, 10)}...)` : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? `OK (${supabaseServiceKey.substring(0, 10)}...)` : 'MISSING',
      STRIPE_SECRET_KEY: stripeKey ? `OK (${stripeKey.substring(0, 10)}...)` : 'MISSING',
      APP_URL: appUrl || 'MISSING'
    };

    // Try to create Supabase client
    let clientTest = 'Not attempted';
    try {
      const testClient = createClient(
        supabaseUrl ?? '',
        supabaseServiceKey ?? supabaseAnonKey ?? ''
      );
      clientTest = 'Client created successfully';
    } catch (err) {
      clientTest = `Error: ${err.message}`;
    }

    return new Response(
      JSON.stringify({
        status: 'success',
        environment: envStatus,
        client_test: clientTest
      }, null, 2),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
