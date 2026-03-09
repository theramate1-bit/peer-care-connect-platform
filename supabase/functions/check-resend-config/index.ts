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
    
    // Determine what sender would actually be used
    const actualSender = resendFromEmail || 'TheraMate <onboarding@resend.dev>'
    
    // Check if it looks like domain email or default
    const isDomainEmail = resendFromEmail && resendFromEmail.includes('theramate.co.uk')
    const isDefaultEmail = !resendFromEmail || actualSender.includes('onboarding@resend.dev')
    
    return new Response(
      JSON.stringify({
        status: 'success',
        configuration: {
          resend_from_email_set: !!resendFromEmail,
          resend_from_email_configured: resendFromEmail ? 'YES' : 'NO (using default)',
          actual_sender_email: actualSender,
          is_domain_email: isDomainEmail,
          is_default_email: isDefaultEmail,
          resend_api_key_set: !!resendApiKey,
          recommendation: resendFromEmail 
            ? (isDomainEmail ? 'Configuration looks correct' : 'RESEND_FROM_EMAIL is set but not using theramate.co.uk domain')
            : 'RESEND_FROM_EMAIL secret is NOT set. Need to add it in Supabase Dashboard.'
        },
        expected_value: 'TheraMate <noreply@theramate.co.uk>',
        current_value: resendFromEmail || 'NOT SET (default: TheraMate <onboarding@resend.dev>)'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        status: 'error',
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

