import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Check what email configuration is actually being used
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    return new Response(
      JSON.stringify({
        resend_from_email: resendFromEmail || 'NOT SET (using default)',
        resend_from_email_set: !!resendFromEmail,
        default_would_be: 'TheraMate <onboarding@resend.dev>',
        resend_api_key_set: !!resendApiKey,
        actual_sender_email: resendFromEmail || 'TheraMate <onboarding@resend.dev>'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

