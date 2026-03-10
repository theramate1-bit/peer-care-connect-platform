import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { session_id, email } = await req.json();

    if (!session_id || !email) {
      return new Response(
        JSON.stringify({ success: false, error: 'session_id and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify ownership via get_session_by_email_and_id (uses LOWER comparison)
    const { data: rpcRows, error: rpcErr } = await supabase.rpc('get_session_by_email_and_id', {
      p_session_id: session_id,
      p_email: email.trim(),
    });

    const sessionRow = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
    if (rpcErr || !sessionRow) {
      return new Response(
        JSON.stringify({ success: false, error: 'Booking not found or email does not match.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (sessionRow.status !== 'confirmed') {
      return new Response(
        JSON.stringify({ success: false, error: 'This booking cannot be cancelled. It may already be cancelled or completed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get refund calculation
    const { data: refundCalc, error: calcErr } = await supabase.rpc('calculate_cancellation_refund', {
      p_session_id: session_id,
      p_cancellation_time: new Date().toISOString(),
    });

    if (calcErr) {
      return new Response(
        JSON.stringify({ success: false, error: calcErr.message || 'Could not calculate refund' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (refundCalc && !refundCalc.success && refundCalc.error) {
      return new Response(
        JSON.stringify({ success: false, error: refundCalc.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const refundAmount = Number(refundCalc?.refund_amount ?? 0) || 0;
    const refundPercent = Number(refundCalc?.refund_percent ?? 0) || 0;

    // Process Stripe refund if applicable
    if (refundAmount > 0 && sessionRow.stripe_payment_intent_id) {
      const stripeRefundUrl = `${supabaseUrl}/functions/v1/stripe-refund`;
      const stripeRes = await fetch(stripeRefundUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_intent_id: sessionRow.stripe_payment_intent_id,
          amount: Math.round(refundAmount * 100),
          session_id: session_id,
        }),
      });

      const stripeData = await stripeRes.json();
      if (!stripeRes.ok || !stripeData?.success) {
        return new Response(
          JSON.stringify({ success: false, error: stripeData?.error || 'Refund processing failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update session status
    const updateData: Record<string, unknown> = {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: 'Cancelled by guest',
      refund_amount: refundAmount,
      refund_percentage: refundPercent,
    };
    if (refundAmount > 0 && sessionRow.stripe_payment_intent_id) {
      updateData.payment_status = 'refunded';
    }

    // Conditional update: only cancel if still confirmed (avoids double refund when both cancel at once)
    const { data: updatedRows, error: updateErr } = await supabase
      .from('client_sessions')
      .update(updateData)
      .eq('id', session_id)
      .in('status', ['scheduled', 'confirmed'])
      .select('id');

    if (updateErr) {
      return new Response(
        JSON.stringify({ success: false, error: updateErr.message || 'Failed to update session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 0 rows: practitioner already cancelled; we may have refunded (race) - return success if we did the refund
    if (!updatedRows?.length) {
      if (refundAmount > 0) {
        return new Response(
          JSON.stringify({ success: true, refundAmount, refundPercent }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: 'This booking is already cancelled or completed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get practitioner for email
    const { data: practitioner } = await supabase
      .from('users')
      .select('first_name, last_name, email')
      .eq('id', sessionRow.therapist_id)
      .single();

    const practitionerName = practitioner
      ? [practitioner.first_name, practitioner.last_name].filter(Boolean).join(' ') || 'Practitioner'
      : 'Practitioner';

    // Send cancellation email to guest
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          emailType: 'cancellation',
          recipientEmail: sessionRow.client_email,
          recipientName: sessionRow.client_name || undefined,
          data: {
            sessionId: session_id,
            sessionType: sessionRow.session_type || 'Session',
            sessionDate: sessionRow.session_date,
            sessionTime: sessionRow.start_time,
            practitionerName,
            cancellationReason: 'Cancelled by guest',
            refundAmount: refundAmount > 0 ? refundAmount : undefined,
            refundPercent: refundPercent > 0 ? refundPercent : undefined,
          },
        },
      });
    } catch (emailErr) {
      console.warn('Cancellation email failed (non-critical):', emailErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        refundAmount,
        refundPercent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('guest-cancel-session error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
