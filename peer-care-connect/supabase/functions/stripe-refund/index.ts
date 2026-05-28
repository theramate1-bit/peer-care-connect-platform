import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Stripe secret key
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }

    // Parse request body
    const { payment_intent_id, amount, session_id } = await req.json();

    if (!payment_intent_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'payment_intent_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Stripe API to create refund
    const stripeResponse = await fetch(`https://api.stripe.com/v1/refunds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        payment_intent: payment_intent_id,
        ...(amount && { amount: amount.toString() }),
      }),
    });

    const refundData = await stripeResponse.json();

    if (!stripeResponse.ok) {
      throw new Error(refundData.error?.message || 'Stripe refund failed');
    }

    // Update payments table if session_id provided
    if (session_id) {
      // Find payment record
      const { data: payment } = await supabase
        .from('payments')
        .select('id')
        .eq('stripe_payment_intent_id', payment_intent_id)
        .single();

      if (payment) {
        // Update payment record
        await supabase
          .from('payments')
          .update({
            payment_status: 'refunded',
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id);
      }

      // Create refund record
      await supabase
        .from('refunds')
        .insert({
          payment_id: payment?.id || null,
          stripe_refund_id: refundData.id,
          amount: refundData.amount,
          currency: refundData.currency,
          status: refundData.status,
          reason: 'practitioner_cancellation'
        });

      // Update client_sessions payment_status
      await supabase
        .from('client_sessions')
        .update({ payment_status: 'refunded' })
        .eq('id', session_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        refund_id: refundData.id,
        amount: refundData.amount / 100, // Convert from cents
        status: refundData.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing refund:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
