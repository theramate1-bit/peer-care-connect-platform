// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Import Stripe
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { method } = req;
    const body = await req.json();
    const action = body.action;

    switch (method) {
      case 'POST':
        if (action === 'create-payment-intent') {
          return await handleCreatePaymentIntent(req, supabase);
        } else if (action === 'confirm-payment') {
          return await handleConfirmPayment(req, supabase);
        } else if (action === 'create-connect-account') {
          return await handleCreateConnectAccount(req, supabase);
        } else if (action === 'transfer-to-connect') {
          return await handleTransferToConnect(req, supabase);
        }
        break;
      
      case 'GET':
        if (action === 'payment-status') {
          return await handleGetPaymentStatus(req, supabase);
        } else if (action === 'connect-account-status') {
          return await handleGetConnectAccountStatus(req, supabase);
        }
        break;
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleCreatePaymentIntent(req: Request, supabase: any) {
  try {
    const { amount, currency, payment_type, therapist_id, project_id, session_id, metadata } = await req.json();

    // Initialize Stripe with secret key
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount in pence
      currency: currency.toLowerCase(),
      metadata: {
        payment_type: payment_type || 'session_payment',
        therapist_id: therapist_id || '',
        project_id: project_id || '',
        session_id: session_id || '',
        ...metadata
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Store payment record in database
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        stripe_payment_intent_id: paymentIntent.id,
        amount: amount,
        currency: currency.toLowerCase(),
        payment_status: 'pending',
        payment_type: payment_type,
        therapist_id: therapist_id,
        project_id: project_id,
        session_id: session_id,
        metadata: metadata
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        payment_id: payment.id,
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        status: paymentIntent.status
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create payment intent' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleConfirmPayment(req: Request, supabase: any) {
  try {
    const { payment_intent_id } = await req.json();

    // Initialize Stripe with secret key
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    // Update payment status based on Stripe status
    const { error } = await supabase
      .from('payments')
      .update({ 
        payment_status: paymentIntent.status === 'succeeded' ? 'succeeded' : paymentIntent.status,
        stripe_response: paymentIntent
      })
      .eq('stripe_payment_intent_id', payment_intent_id);

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        payment_method: paymentIntent.payment_method
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error confirming payment:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to confirm payment' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleCreateConnectAccount(req: Request, supabase: any) {
  try {
    const { business_type, company, individual } = await req.json();

    // Initialize Stripe with secret key
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'GB',
      email: individual?.email,
      business_type: business_type,
      business_profile: {
        name: company?.name || `${individual?.first_name} ${individual?.last_name}`,
        url: 'https://peer-care-connect.vercel.app',
        mcc: '8011', // Medical and health services
      },
      individual: individual ? {
        first_name: individual.first_name,
        last_name: individual.last_name,
        email: individual.email,
        phone: individual.phone,
        address: individual.address,
        dob: individual.dob,
        id_number: individual.ssn_last_4,
      } : undefined,
      company: company ? {
        name: company.name,
        tax_id: company.tax_id,
        address: company.address,
      } : undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // Resolve authenticated user
    let userId: string | null = null;
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data } = await supabase.auth.getUser(token);
        userId = data?.user?.id ?? null;
      }
    } catch (_) {
      userId = null;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing or invalid user' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Store connect account record
    const { data: connectAccount, error } = await supabase
      .from('connect_accounts')
      .insert({
        stripe_account_id: account.id,
        user_id: userId,
        account_status: account.details_submitted ? 'active' : 'pending',
        business_type: business_type,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        company: company,
        individual: individual
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        connect_account_id: connectAccount.id,
        stripe_account_id: account.id,
        status: account.details_submitted ? 'active' : 'pending',
        account_link: account.id // You might want to create an account link for onboarding
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error creating connect account:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create connect account' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleTransferToConnect(req: Request, supabase: any) {
  try {
    const { amount, currency, connect_account_id, payment_intent_id } = await req.json();

    // Initialize Stripe with secret key
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Create transfer to Connect account
    const transfer = await stripe.transfers.create({
      amount: amount, // Amount in pence
      currency: currency.toLowerCase(),
      destination: connect_account_id,
      transfer_group: payment_intent_id ? `payment_${payment_intent_id}` : undefined,
      metadata: {
        payment_intent_id: payment_intent_id || '',
        therapist_id: connect_account_id,
      }
    });

    // Resolve authenticated user
    let userId: string | null = null;
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data } = await supabase.auth.getUser(token);
        userId = data?.user?.id ?? null;
      }
    } catch (_) {
      userId = null;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing or invalid user' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Store transfer record
    const { data: transferRecord, error } = await supabase
      .from('payouts')
      .insert({
        stripe_transfer_id: transfer.id,
        therapist_id: userId,
        amount: amount,
        currency: currency.toLowerCase(),
        payout_status: transfer.status === 'paid' ? 'succeeded' : 'pending',
        connect_account_id: connect_account_id,
        payment_intent_id: payment_intent_id
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        transfer_id: transferRecord.id,
        stripe_transfer_id: transfer.id,
        status: transfer.status,
        amount: transfer.amount,
        currency: transfer.currency
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error creating transfer:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create transfer' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleGetPaymentStatus(req: Request, supabase: any) {
  try {
    const url = new URL(req.url);
    const paymentId = url.searchParams.get('payment_id');

    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: 'Payment ID required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        payment_id: payment.id,
        status: payment.payment_status,
        amount: payment.amount,
        currency: payment.currency
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error getting payment status:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get payment status' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleGetConnectAccountStatus(req: Request, supabase: any) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { data: connectAccount, error } = await supabase
      .from('connect_accounts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!connectAccount) {
      return new Response(
        JSON.stringify({ error: 'Connect account not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        connect_account_id: connectAccount.id,
        stripe_account_id: connectAccount.stripe_account_id,
        status: connectAccount.account_status,
        charges_enabled: connectAccount.charges_enabled,
        payouts_enabled: connectAccount.payouts_enabled
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error getting connect account status:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get connect account status' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}
