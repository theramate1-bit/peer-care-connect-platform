// Expire pending mobile booking requests: cancel Stripe hold when applicable, update DB, create in-app notification.
// Schedule this function every 15 minutes (e.g. Supabase Dashboard > Edge Functions > expire-mobile-requests > Schedule).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('[EXPIRE-MOBILE-REQUESTS] Missing Supabase env');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const now = new Date().toISOString();
    const { data: rows, error: selectError } = await supabase
      .from('mobile_booking_requests')
      .select('id, client_id, practitioner_id, requested_date, requested_start_time, product_id, stripe_payment_intent_id, payment_status')
      .eq('status', 'pending')
      .not('expires_at', 'is', null)
      .lt('expires_at', now);

    if (selectError) {
      console.error('[EXPIRE-MOBILE-REQUESTS] Select error:', selectError);
      throw selectError;
    }

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ success: true, expired_count: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let stripe: Stripe | null = null;
    if (stripeSecretKey) {
      stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' });
    }

    let expiredCount = 0;
    const productNames: Record<string, string> = {};
    const userCache: Record<string, { email?: string; first_name?: string; last_name?: string; user_role?: string }> = {};

    for (const row of rows) {
      const id = row.id as string;
      const paymentStatus = row.payment_status as string;
      const paymentIntentId = row.stripe_payment_intent_id as string | null;

      if (paymentStatus === 'held' && paymentIntentId && stripe) {
        try {
          await stripe.paymentIntents.cancel(paymentIntentId);
        } catch (stripeErr: unknown) {
          console.error('[EXPIRE-MOBILE-REQUESTS] Stripe cancel failed for', id, stripeErr);
          // Continue to mark as expired in DB so we don't retry forever
        }
      }

      const { error: updateError } = await supabase
        .from('mobile_booking_requests')
        .update({
          status: 'expired',
          payment_status: 'released',
          expired_notified_at: now,
          updated_at: now,
        })
        .eq('id', id);

      if (updateError) {
        console.error('[EXPIRE-MOBILE-REQUESTS] Update error for', id, updateError);
        continue;
      }

      expiredCount += 1;

      let productName = productNames[row.product_id as string];
      if (productName === undefined && row.product_id) {
        const { data: product } = await supabase
          .from('practitioner_products')
          .select('name')
          .eq('id', row.product_id)
          .single();
        productName = (product?.name as string) || 'Service';
        productNames[row.product_id as string] = productName;
      } else if (!productName) {
        productName = 'Service';
      }

      const title = 'Mobile Session Request Expired';
      const message = `Your mobile session request for ${productName} on ${row.requested_date} at ${row.requested_start_time} has expired.`;
      const payload = {
        request_id: id,
        practitioner_id: row.practitioner_id,
        product_id: row.product_id,
        product_name: productName,
        requested_date: row.requested_date,
        requested_start_time: row.requested_start_time,
      };

      await supabase.rpc('create_notification', {
        p_recipient_id: row.client_id,
        p_type: 'booking_request',
        p_title: title,
        p_body: message,
        p_payload: payload,
        p_source_type: 'mobile_booking_request',
        p_source_id: id,
      });

      // Send mobile_request_expired_client email (clients and guests)
      const clientId = row.client_id as string;
      if (clientId) {
        let clientUser = userCache[clientId];
        if (!clientUser) {
          const { data: u } = await supabase.from('users').select('email, first_name, last_name, user_role').eq('id', clientId).maybeSingle();
          clientUser = (u || {}) as typeof clientUser;
          userCache[clientId] = clientUser;
        }
        if (clientUser?.email) {
          const pid = row.practitioner_id as string;
          let pract = userCache[pid];
          if (!pract) {
            const { data: p } = await supabase.from('users').select('first_name, last_name').eq('id', pid).maybeSingle();
            pract = (p || {}) as { first_name?: string; last_name?: string };
            userCache[pid] = pract;
          }
          const practitionerName = `${pract?.first_name || ''} ${pract?.last_name || ''}`.trim() || 'Your practitioner';
          const siteUrl = Deno.env.get('SITE_URL') || Deno.env.get('APP_URL') || 'https://theramate.co.uk';
          const requestUrl = clientUser.user_role === 'client'
            ? `${siteUrl}/client/mobile-requests`
            : `${siteUrl}/guest/mobile-requests?email=${encodeURIComponent(clientUser.email!)}`;
          try {
            await supabase.functions.invoke('send-email', {
              headers: { Authorization: `Bearer ${supabaseServiceRoleKey}` },
              body: {
                emailType: 'mobile_request_expired_client',
                recipientEmail: clientUser.email,
                recipientName: `${clientUser.first_name || ''} ${clientUser.last_name || ''}`.trim() || 'Guest',
                data: {
                  requestId: id,
                  practitionerName,
                  serviceType: productName,
                  requestedDate: row.requested_date,
                  requestedTime: row.requested_start_time,
                  requestUrl,
                },
              },
            });
          } catch (emailErr) {
            console.error('[EXPIRE-MOBILE-REQUESTS] Failed to send expiry email for', id, emailErr);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, expired_count: expiredCount }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    console.error('[EXPIRE-MOBILE-REQUESTS] Error:', err);
    return new Response(
      JSON.stringify({
        error: 'Failed to expire mobile requests',
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
