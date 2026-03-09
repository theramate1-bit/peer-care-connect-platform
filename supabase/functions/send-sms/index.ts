import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SMSRequest {
  to: string  // Phone number in E.164 format (e.g., +447123456789)
  message: string
  sessionId?: string
  reminderType?: '24h' | '2h' | '1h'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { to, message, sessionId, reminderType }: SMSRequest = await req.json()

    if (!to || !message) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: to and message' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate phone number format (should be E.164 format)
    const phoneRegex = /^\+[1-9]\d{1,14}$/
    if (!phoneRegex.test(to)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid phone number format. Must be in E.164 format (e.g., +447123456789)' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Twilio credentials from environment
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error('Twilio credentials not configured')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SMS service not configured. Please contact support.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Send SMS via Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`
    
    const formData = new URLSearchParams()
    formData.append('From', twilioPhoneNumber)
    formData.append('To', to)
    formData.append('Body', message)

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    const twilioData = await twilioResponse.json()

    if (!twilioResponse.ok) {
      console.error('Twilio API error:', twilioData)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: twilioData.message || 'Failed to send SMS',
          details: twilioData 
        }),
        { 
          status: twilioResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log SMS to database
    const { error: logError } = await supabaseClient
      .from('sms_logs')
      .insert({
        phone_number: to,
        message: message,
        session_id: sessionId,
        reminder_type: reminderType,
        twilio_message_sid: twilioData.sid,
        status: twilioData.status || 'queued',
        sent_at: new Date().toISOString(),
        metadata: {
          twilio_response: twilioData,
          to: to,
          from: twilioPhoneNumber
        }
      })

    if (logError) {
      console.error('Failed to log SMS:', logError)
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: twilioData.sid,
        status: twilioData.status,
        message: 'SMS sent successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('SMS send error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send SMS', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
