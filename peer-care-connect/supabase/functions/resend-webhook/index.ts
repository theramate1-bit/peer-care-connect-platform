import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
}

// Resend webhook event types
type ResendWebhookEvent = 
  | 'email.sent'
  | 'email.delivered'
  | 'email.delivery_delayed'
  | 'email.complained'
  | 'email.bounced'
  | 'email.opened'
  | 'email.clicked'

interface ResendWebhookPayload {
  type: ResendWebhookEvent
  created_at: string
  data: {
    email_id: string
    from: string
    to: string[]
    subject: string
    created_at: string
    [key: string]: any
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify webhook signature (optional but recommended for production)
    const signature = req.headers.get('svix-signature')
    const timestamp = req.headers.get('svix-timestamp')
    const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET')
    
    // In production, verify the signature using Resend's webhook secret
    // For now, we'll accept requests (you should add signature verification)
    
    const payload: ResendWebhookPayload = await req.json()
    
    console.log(`Resend webhook received: ${payload.type}`)
    console.log(`Email ID: ${payload.data.email_id}`)

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Find the email log entry by resend_email_id
    const { data: emailLog, error: findError } = await supabaseClient
      .from('email_logs')
      .select('*')
      .eq('resend_email_id', payload.data.email_id)
      .single()

    if (findError && findError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error finding email log:', findError)
      throw findError
    }

    if (!emailLog) {
      console.warn(`Email log not found for resend_email_id: ${payload.data.email_id}`)
      // Still return 200 to acknowledge we received the webhook
      return new Response(
        JSON.stringify({ message: 'Email log not found, but webhook received' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update email log based on webhook event type
    const updateData: any = {
      metadata: {
        ...(emailLog.metadata || {}),
        [`${payload.type}_at`]: payload.created_at,
        [`${payload.type}_data`]: payload.data
      }
    }

    switch (payload.type) {
      case 'email.delivered':
        updateData.status = 'delivered'
        updateData.delivered_at = new Date(payload.created_at).toISOString()
        break

      case 'email.bounced':
        updateData.status = 'bounced'
        updateData.error_message = payload.data.error || 'Email bounced'
        break

      case 'email.complained':
        updateData.status = 'complained'
        updateData.error_message = 'Recipient marked email as spam'
        // Optionally: Add email to suppression list
        break

      case 'email.opened':
        updateData.opened_at = new Date(payload.created_at).toISOString()
        // Don't change status, just track open
        break

      case 'email.clicked':
        updateData.clicked_at = new Date(payload.created_at).toISOString()
        // Don't change status, just track click
        break

      case 'email.delivery_delayed':
        // Keep status as 'sent' but log the delay
        updateData.metadata.delivery_delayed = true
        updateData.metadata.delivery_delayed_at = payload.created_at
        break

      case 'email.sent':
        // Usually already logged, but update if needed
        if (emailLog.status === 'pending') {
          updateData.status = 'sent'
        }
        break

      default:
        console.log(`Unhandled webhook event type: ${payload.type}`)
    }

    // Update the email log
    const { error: updateError } = await supabaseClient
      .from('email_logs')
      .update(updateData)
      .eq('id', emailLog.id)

    if (updateError) {
      console.error('Error updating email log:', updateError)
      throw updateError
    }

    // For booking confirmation emails that fail, we might want to notify the user
    if (payload.type === 'email.bounced' && emailLog.email_type?.includes('booking_confirmation')) {
      console.log(`Booking confirmation email bounced for: ${emailLog.recipient_email}`)
      
      // Optionally: Create a notification or alert
      // You could call a notification service here
      // For now, we'll just log it
    }

    // For spam complaints, we should handle this more carefully
    if (payload.type === 'email.complained') {
      console.warn(`Spam complaint received for email: ${emailLog.recipient_email}`)
      // Consider adding to suppression list or investigating
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Webhook processed: ${payload.type}`,
        email_id: payload.data.email_id,
        status_updated: updateData.status || emailLog.status
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Resend webhook error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Webhook processing failed', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

