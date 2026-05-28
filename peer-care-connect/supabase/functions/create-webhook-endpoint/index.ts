import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'STRIPE_SECRET_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    })

    const webhookUrl = 'https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/stripe-webhook'
    
    // First, check if webhook already exists
    console.log('🔍 Checking for existing webhooks...')
    const existingWebhooks = await stripe.webhookEndpoints.list({ limit: 100 })
    const matching = existingWebhooks.data.find(w => w.url === webhookUrl)
    
    if (matching) {
      console.log(`✅ Found existing webhook: ${matching.id}`)
      
      // Check if all required events are enabled (including v2 events for fully embedded)
      const requiredEvents = [
        'account.updated',
        'account.application.deauthorized',
        'account.application.authorized',
        'checkout.session.completed',
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'charge.succeeded',
        'charge.failed',
        'invoice.payment_succeeded',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'checkout.session.expired',
        'invoice.payment_action_required'
      ]
      
      const missingEvents = requiredEvents.filter(e => !matching.enabled_events.includes(e))
      
      if (missingEvents.length > 0) {
        console.log(`🔄 Updating webhook with missing events...`)
        const updated = await stripe.webhookEndpoints.update(matching.id, {
          enabled_events: requiredEvents
        })
        
        return new Response(
          JSON.stringify({
            success: true,
            action: 'updated',
            webhook_id: updated.id,
            webhook_secret: updated.secret,
            url: updated.url,
            status: updated.status,
            events: updated.enabled_events,
            message: 'Webhook updated with all required events'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        // Retrieve the webhook - note: secret is only available on creation
        // For existing webhooks, we need to get the signing secret separately
        const retrieved = await stripe.webhookEndpoints.retrieve(matching.id)
        
        // Try to get the signing secret - Stripe only returns this on creation
        // But we can check if it matches what's in Supabase
        const currentSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
        const secretMatches = currentSecret ? 'check_in_supabase' : 'not_set'
        
        return new Response(
          JSON.stringify({
            success: true,
            action: 'exists',
            webhook_id: retrieved.id,
            webhook_secret: retrieved.secret || 'secret_not_available_on_retrieve',
            url: retrieved.url,
            status: retrieved.status,
            events: retrieved.enabled_events,
            secret_status: secretMatches,
            message: 'Webhook already exists and is configured correctly. Secret can only be retrieved on creation.'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    
    // Create new webhook
    console.log('🔧 Creating new webhook endpoint...')
    const webhookEndpoint = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: [
        'account.updated',
        'account.application.deauthorized',
        'account.application.authorized',
        'checkout.session.completed',
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'charge.succeeded',
        'charge.failed',
        'invoice.payment_succeeded',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'checkout.session.expired',
        'invoice.payment_action_required'
      ],
      description: 'Theramate Payment Webhook - Fully Embedded Connect'
    })

    console.log('✅ Webhook created successfully!')
    console.log('Webhook ID:', webhookEndpoint.id)
    console.log('Webhook Secret:', webhookEndpoint.secret)

    return new Response(
      JSON.stringify({
        success: true,
        action: 'created',
        webhook_id: webhookEndpoint.id,
        webhook_secret: webhookEndpoint.secret,
        url: webhookEndpoint.url,
        status: webhookEndpoint.status,
        events: webhookEndpoint.enabled_events,
        livemode: webhookEndpoint.livemode,
        message: 'Webhook endpoint created successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

