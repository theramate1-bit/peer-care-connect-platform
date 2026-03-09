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
    // Create service role client for database operations
    // Note: Supabase provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY automatically
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    // Verify critical environment variables
    if (!Deno.env.get('STRIPE_SECRET_KEY')) {
      console.error('[STRIPE-PAYMENT] Missing STRIPE_SECRET_KEY environment variable');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing Stripe key' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { method } = req;
    
    let body;
    try {
      body = await req.json();
    } catch (error) {
      console.error('[STRIPE-PAYMENT] Failed to parse request body:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid request body', details: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const action = body?.action;

    console.log('[STRIPE-PAYMENT] Request:', { method, action, body_keys: Object.keys(body || {}) });

    switch (method) {
      case 'POST':
        if (action === 'create-payment-intent') {
          return await handleCreatePaymentIntent(req, body, supabaseAdmin);
        } else if (action === 'create-checkout-session') {
          return await handleCreateCheckoutSession(req, body, supabaseAdmin);
        } else if (action === 'confirm-payment') {
          return await handleConfirmPayment(req, body, supabaseAdmin);
        } else if (action === 'create-connect-account') {
          return await handleCreateConnectAccount(req, body, supabaseAdmin);
        } else if (action === 'get-connect-account-status' || action === 'get-account-status') {
          return await handleGetConnectAccountStatus(req, body, supabaseAdmin);
        } else if (action === 'verify-connect-account') {
          return await handleVerifyConnectAccount(req, body, supabaseAdmin);
        } else if (action === 'create-onboarding-link') {
          return await handleCreateOnboardingLink(req, body, supabaseAdmin);
        } else if (action === 'transfer-to-connect') {
          return await handleTransferToConnect(req, body, supabaseAdmin);
        } else if (action === 'create-product') {
          return await handleCreateProduct(req, body, supabaseAdmin);
        } else if (action === 'update-product') {
          return await handleUpdateProduct(req, body, supabaseAdmin);
        } else if (action === 'delete-product') {
          return await handleDeleteProduct(req, body, supabaseAdmin);
        } else if (action === 'list-products') {
          return await handleListProducts(req, body, supabaseAdmin);
        } else if (action === 'create-account-session') {
          return await handleCreateAccountSession(req, body, supabaseAdmin);
        } else if (action === 'capture-same-day-payment') {
          return await handleCaptureSameDayPayment(req, body, supabaseAdmin);
        } else if (action === 'release-same-day-payment') {
          return await handleReleaseSameDayPayment(req, body, supabaseAdmin);
        } else if (action === 'create-mobile-checkout-session') {
          return await handleCreateMobileCheckoutSession(req, body, supabaseAdmin);
        } else if (action === 'confirm-mobile-checkout-session') {
          return await handleConfirmMobileCheckoutSession(req, body, supabaseAdmin);
        } else if (action === 'capture-mobile-payment') {
          return await handleCaptureMobilePayment(req, body, supabaseAdmin);
        } else if (action === 'release-mobile-payment') {
          return await handleReleaseMobilePayment(req, body, supabaseAdmin);
        } else {
          console.error('[STRIPE-PAYMENT] Unknown action:', action);
          return new Response(
            JSON.stringify({ error: `Unknown action: ${action}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        break;
      
      case 'GET':
        if (action === 'payment-status') {
          return await handleGetPaymentStatus(req, supabaseAdmin);
        } else if (action === 'connect-account-status') {
          return await handleGetConnectAccountStatus(req, supabaseAdmin);
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
    console.error('[STRIPE-PAYMENT] Top-level error:', {
      message: error.message,
      type: error.type,
      code: error.code,
      stack: error.stack,
      details: error.toString()
    });
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        type: error.type || 'unknown',
        code: error.code || 'unknown'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleCreatePaymentIntent(req: Request, body: any, supabase: any) {
  try {
    const { amount, currency, payment_type, therapist_id, practitioner_id, project_id, session_id, idempotency_key, metadata, capture_method } = body;

    // CRITICAL VALIDATION: Check required fields
    if (!amount || !currency) {
      console.error('[CREATE-PAYMENT] Missing required fields:', { amount, currency });
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          details: {
            hasAmount: !!amount,
            hasCurrency: !!currency,
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CRITICAL VALIDATION: session_id is required for booking payments
    if (!session_id || session_id.trim() === '') {
      console.error('[CREATE-PAYMENT] Missing session_id:', { session_id, payment_type });
      return new Response(
        JSON.stringify({ 
          error: 'Missing required field: session_id',
          details: 'session_id is required for booking payments'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate metadata exists and has required fields
    if (!metadata || typeof metadata !== 'object') {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required metadata',
          details: 'metadata object is required'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!metadata.practitioner_name) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required metadata',
          details: 'metadata.practitioner_name is required'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!metadata.client_user_id || typeof metadata.client_user_id !== 'string') {
      return new Response(
        JSON.stringify({
          error: 'Missing client user id',
          details: 'metadata.client_user_id is required and must be a string'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientUserId = metadata.client_user_id;
    const sessionType = metadata.session_type || 'Session';
    const finalPractitionerId = practitioner_id || therapist_id;

    // Initialize Stripe with secret key
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Check for existing payment with same idempotency key
    if (idempotency_key) {
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('*')
        .eq('idempotency_key', idempotency_key)
        .maybeSingle();

      if (existingPayment) {
        console.log('[CREATE-PAYMENT] Found existing payment with idempotency key:', idempotency_key);
        return new Response(
          JSON.stringify({ 
            payment_id: existingPayment.id,
            checkout_url: existingPayment.metadata?.checkout_url,
            checkout_session_id: existingPayment.checkout_session_id,
            payment_intent_id: existingPayment.stripe_payment_intent_id,
            client_secret: existingPayment.metadata?.client_secret,
            status: existingPayment.payment_status
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // If capture_method is 'manual', create Payment Intent instead of Checkout Session
    if (capture_method === 'manual') {
      // Get practitioner's Connect account for transfer_data
      const { data: practitioner } = await supabase
        .from('users')
        .select('stripe_connect_account_id')
        .eq('id', finalPractitionerId)
        .single();

      if (!practitioner?.stripe_connect_account_id) {
        return new Response(
          JSON.stringify({ 
            error: 'Practitioner not connected to Stripe',
            details: 'Practitioner must have a Stripe Connect account'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Calculate platform fee (0.5% of amount)
      const platformFeeAmount = Math.round(amount * 0.005);
      const practitionerAmount = amount - platformFeeAmount;

      // Create Payment Intent with manual capture
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: currency.toLowerCase(),
        application_fee_amount: platformFeeAmount,
        transfer_data: { destination: practitioner.stripe_connect_account_id },
        metadata: {
          payment_type: payment_type || 'session_payment',
          therapist_id: finalPractitionerId,
          project_id: project_id || '',
          session_id: session_id || '',
          ...metadata
        },
        description: `Session booking with ${metadata.practitioner_name}`,
        confirm: false, // Do not confirm immediately
        capture_method: 'manual', // Manual capture for same-day bookings
      }, idempotency_key ? { idempotencyKey: idempotency_key } : undefined);

      // Store payment record in database
      const finalPaymentType = payment_type || 'session_payment';
      const { data: payment, error: dbError } = await supabase
        .from('payments')
        .insert({
          stripe_payment_intent_id: paymentIntent.id,
          amount: amount,
          platform_fee_amount: platformFeeAmount,
          practitioner_amount: practitionerAmount,
          currency: currency.toLowerCase(),
          payment_status: 'requires_action', // Payment authorization held
          payment_type: finalPaymentType,
          user_id: clientUserId,
          therapist_id: finalPractitionerId,
          project_id: project_id,
          session_id: session_id,
          idempotency_key: idempotency_key,
          metadata: {
            ...metadata,
            idempotency_key: idempotency_key,
            client_secret: paymentIntent.client_secret,
            capture_method: 'manual'
          }
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return new Response(
        JSON.stringify({
          success: true,
          payment_id: payment.id,
          payment_intent_id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          status: paymentIntent.status,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Stripe Checkout Session instead of Payment Intent with idempotency
    const sessionOptions: any = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: amount,
          product_data: {
            name: `Session with ${metadata.practitioner_name}`,
            description: `${sessionType} on ${metadata.session_date || ''} at ${metadata.session_time || ''}`,
          },
        },
        quantity: 1,
      }],
      payment_intent_data: {
        metadata: {
          payment_type: payment_type || 'session_payment',
          therapist_id: therapist_id || '',
          project_id: project_id || '',
          session_id: session_id || '',
          ...metadata
        }
      },
      customer_email: metadata.client_email,
      success_url: `${Deno.env.get('APP_URL')}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('APP_URL')}/marketplace`,
      metadata: { 
        session_id: session_id, // Required - validated above
        therapist_id: therapist_id || '',
        client_user_id: metadata.client_user_id, // Ensure this is always included
        client_email: metadata.client_email, // Ensure this is always included
        client_name: metadata.client_name || '',
        session_date: metadata.session_date || '',
        session_time: metadata.session_time || '',
        session_type: metadata.session_type || 'Session',
        practitioner_name: metadata.practitioner_name || '',
        ...metadata 
      }
    };

    // Create Checkout Session, supplying idempotency key via Stripe request options (not in payload)
    const session = await stripe.checkout.sessions.create(
      sessionOptions,
      idempotency_key ? { idempotencyKey: idempotency_key } : undefined
    );

    // Store payment record in database with idempotency key
    // Default payment_type to 'session_payment' if not provided (required field)
    const finalPaymentType = payment_type || 'session_payment';
    
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        stripe_payment_intent_id: session.payment_intent,
        checkout_session_id: session.id,
        amount: amount, // Total amount paid by client
        currency: currency.toLowerCase(),
        payment_status: 'pending',
        payment_type: finalPaymentType, // Ensure this is never null/undefined
        user_id: clientUserId,
        therapist_id: therapist_id,
        project_id: project_id,
        session_id: session_id,
        idempotency_key: idempotency_key,
        metadata: {
          ...metadata,
          checkout_url: session.url,
          idempotency_key: idempotency_key
        }
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        payment_id: payment.id,
        checkout_url: session.url,
        checkout_session_id: session.id,
        status: session.payment_status
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[CREATE-PAYMENT] Error creating checkout session:', error);
    console.error('[CREATE-PAYMENT] Error details:', {
      message: error?.message,
      type: error?.type,
      code: error?.code,
      param: error?.param,
      statusCode: error?.statusCode
    });
    
    // Return specific error message
    let errorMessage = 'Failed to create checkout session';
    if (error?.message?.includes('account')) {
      errorMessage = 'Invalid or restricted Stripe Connect account';
    } else if (error?.type === 'StripeInvalidRequestError') {
      errorMessage = `Stripe error: ${error.message}`;
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error?.message,
        stripeError: error?.type
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleConfirmPayment(req: Request, body: any, supabase: any) {
  try {
    const { payment_intent_id } = body;

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

async function handleCreateConnectAccount(req: Request, body: any, supabase: any) {
  // Extract return_url from body if provided (for profile/subscription pages)
  const returnUrl = body?.return_url || null;
  try {
    const { userId, email, firstName, lastName, businessType } = body;
    
    console.log('[CREATE-CONNECT] Starting with params:', { userId, email, firstName, lastName, businessType });

    // Resolve authenticated user using anon key client
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[CREATE-CONNECT] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create anon key client for user validation
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data, error: authError } = await supabaseAnon.auth.getUser(token);
    
    if (authError || !data?.user?.id) {
      console.error('[CREATE-CONNECT] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid user', details: authError?.message }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const authenticatedUserId = data.user.id;

    // Verify user exists in public.users (required for foreign key constraint)
    const { data: publicUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', authenticatedUserId)
      .maybeSingle();

    if (userCheckError || !publicUser) {
      console.error('[CREATE-CONNECT] User not found in public.users:', { authenticatedUserId, userCheckError });
      return new Response(
        JSON.stringify({ 
          error: 'User profile not found. Please complete your profile first.',
          details: 'User must exist in public.users before creating Connect account'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // IDEMPOTENCY CHECK: Check if user already has a Connect account
    const { data: existingAccount, error: fetchError } = await supabase
      .from('connect_accounts')
      .select('*')
      .eq('user_id', authenticatedUserId)
      .maybeSingle();

    if (fetchError) {
      console.error('[CREATE-CONNECT] Error checking existing account:', fetchError);
    }

    let accountId: string | undefined;
    let connectAccount: any;

    if (existingAccount && existingAccount.stripe_account_id) {
      // Account already exists - verify it's Accounts v2 format (dashboard: 'none' for fully embedded)
      console.log('[CREATE-CONNECT] Existing account found:', existingAccount.stripe_account_id);
      
      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';

      try {
        // Use Accounts v2 API to retrieve account
        // Include recipient and merchant to check capabilities
        const retrieveResponse = await fetch(
          `https://api.stripe.com/v2/core/accounts/${existingAccount.stripe_account_id}?include[]=configuration.merchant&include[]=configuration.recipient&include[]=requirements`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${stripeSecretKey}`,
              'Content-Type': 'application/json',
              'Stripe-Version': '2025-04-30.preview',
            },
          }
        );

        if (!retrieveResponse.ok) {
          // Account doesn't exist or can't be retrieved - delete DB record and create new
          console.warn('[CREATE-CONNECT] Existing account cannot be retrieved, will create new account');
          await supabase
            .from('connect_accounts')
            .delete()
            .eq('stripe_account_id', existingAccount.stripe_account_id);
          // Continue to create new account below
        } else {
          const account = await retrieveResponse.json();
        
          // Check if account is Accounts v2 format with dashboard: 'none' (fully embedded)
          const dashboard = account.dashboard || null;
          const responsibilities = account.defaults?.responsibilities || {};
          const feesCollector = responsibilities.fees_collector || null;
          const lossesCollector = responsibilities.losses_collector || null;
          
          // Check for required capabilities
          const merchant = account.configuration?.merchant || {};
          const recipient = account.configuration?.recipient || {};
          const cardPaymentsRequested = merchant.capabilities?.card_payments?.requested === true;
          const stripeTransfersRequested = recipient.capabilities?.stripe_balance?.stripe_transfers?.requested === true;
          
          console.log('[CREATE-CONNECT] Existing account details:', {
            dashboard,
            fees_collector: feesCollector,
            losses_collector: lossesCollector,
            account_id: account.id,
            card_payments_requested: cardPaymentsRequested,
            stripe_transfers_requested: stripeTransfersRequested,
          });
          
          // If capabilities are missing, update the account
          if (!cardPaymentsRequested || !stripeTransfersRequested) {
            console.log('[CREATE-CONNECT] Missing capabilities, updating account...');
            const updateResponse = await fetch(
              `https://api.stripe.com/v2/core/accounts/${existingAccount.stripe_account_id}`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${stripeSecretKey}`,
                  'Content-Type': 'application/json',
                  'Stripe-Version': '2025-04-30.preview',
                },
                body: JSON.stringify({
                  configuration: {
                    merchant: {
                      capabilities: {
                        card_payments: { requested: true }
                      }
                    },
                    recipient: {
                      capabilities: {
                        stripe_balance: {
                          stripe_transfers: { requested: true }
                        }
                      }
                    }
                  }
                })
              }
            );

            if (updateResponse.ok) {
              console.log('[CREATE-CONNECT] Successfully updated account capabilities');
              // Refresh account data
              const updatedAccount = await updateResponse.json();
              // Continue with updated status
              account.configuration = updatedAccount.configuration;
              account.requirements = updatedAccount.requirements;
            } else {
              console.error('[CREATE-CONNECT] Failed to update account capabilities:', await updateResponse.text());
            }
          }
          
          // Check if account is properly configured for fully embedded (Accounts v2)
          const isV2Account = dashboard === 'none';
          const hasCorrectConfig = feesCollector === 'application' && lossesCollector === 'application';
          
          // Check if fully onboarded (for Accounts v2, check requirements)
          const requirements = account.requirements || {};
          const isFullyOnboarded = !requirements.currently_due || requirements.currently_due.length === 0;
          
          if (!isV2Account || !hasCorrectConfig) {
          console.warn('[CREATE-CONNECT] Existing account has incorrect configuration:', {
              dashboard,
              fees_collector: feesCollector,
              losses_collector: lossesCollector,
              isFullyOnboarded,
              reason: !isV2Account ? 'Not Accounts v2 (dashboard !== "none")' : 'Responsibilities not set to "application"'
          });
          
          // If account is fully onboarded, we can't safely delete it (might have payments)
          if (isFullyOnboarded) {
              console.warn('[CREATE-CONNECT] Account is fully onboarded - cannot migrate. Will use existing account.');
            accountId = existingAccount.stripe_account_id;
            connectAccount = existingAccount;
            
            return new Response(
              JSON.stringify({ 
                connect_account_id: connectAccount.id,
                stripe_account_id: accountId,
                status: 'active',
                  message: 'Account fully onboarded (legacy config)'
              }),
              { 
                status: 200, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
          
          // Account not fully onboarded - safe to delete and recreate with correct config
          await supabase
            .from('connect_accounts')
            .delete()
            .eq('stripe_account_id', existingAccount.stripe_account_id);
          
            console.log('[CREATE-CONNECT] Deleted account with incorrect config, will create new Accounts v2 account');
          // Continue to create new account with correct configuration below
        } else {
            // Account is Accounts v2 with correct config - use it
          accountId = existingAccount.stripe_account_id;
          connectAccount = existingAccount;
          
          // If fully onboarded, return success
          if (isFullyOnboarded) {
            return new Response(
              JSON.stringify({ 
                connect_account_id: connectAccount.id,
                stripe_account_id: accountId,
                status: 'active',
                  message: 'Accounts v2 account already fully onboarded'
              }),
              { 
                status: 200, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
          
            // Accounts v2 account exists but not fully onboarded - return it for embedded onboarding
          return new Response(
            JSON.stringify({ 
              stripe_account_id: accountId,
              status: 'pending',
                message: 'Accounts v2 account exists, ready for embedded onboarding'
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
          }
        }
      } catch (stripeError: any) {
        console.error('[CREATE-CONNECT] Failed to verify existing account:', {
          message: stripeError.message,
          code: stripeError.code
        });
        // If we can't verify, delete the database record and create new
        await supabase
          .from('connect_accounts')
          .delete()
          .eq('stripe_account_id', existingAccount.stripe_account_id);
        console.log('[CREATE-CONNECT] Deleted unverifiable account, will create new Accounts v2 account');
      }
    }
    
    // Create new account using Accounts v2 API only (official way, no fallbacks)
    if (!accountId) {
      console.log('[CREATE-CONNECT] Creating new account using Accounts v2 API (official way, no fallbacks)');

      // Create Stripe Connect account using Accounts v2 API for fully embedded integration
      // Official documentation: https://docs.stripe.com/connect/embedded-onboarding?accounts-namespace=v2
      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
      
      // Build display name from user information
      const displayName = firstName && lastName 
        ? `${firstName} ${lastName}` 
        : email?.split('@')[0] || 'Account';
      
      // Build registered name for business details
      const registeredName = businessType === 'company' 
        ? displayName 
        : displayName;
      
      try {
        const v2Response = await fetch('https://api.stripe.com/v2/core/accounts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/json',
            'Stripe-Version': '2025-04-30.preview', // Official API version from documentation
          },
          body: JSON.stringify({
            // Include these fields to populate them in the response
            include: [
              'configuration.customer',
              'configuration.merchant',
              'configuration.recipient', // Include recipient to verify transfers capability was requested
              'identity',
              'requirements'
            ],
            // Contact email (required)
            contact_email: email,
            // Display name for the account
            display_name: displayName,
            // Dashboard access: 'none' for fully embedded (no Stripe Dashboard access)
            dashboard: 'none',
            // Identity information
            identity: {
              business_details: {
                registered_name: registeredName,
              },
              country: 'GB', // Set country (user cannot change it when specified)
              entity_type: businessType === 'company' ? 'company' : 'individual',
            },
            // Configuration: merchant and recipient for payment capabilities
            // CRITICAL: Both merchant (card_payments) and recipient (stripe_transfers) are REQUIRED
            // - merchant.card_payments: Allows account to accept payments
            // - recipient.stripe_balance.stripe_transfers: Allows account to receive transfers (REQUIRED for transfer_data in payments)
            configuration: {
              // Customer configuration (optional, for charging connected accounts via subscriptions)
              customer: {},
              // Merchant configuration for accepting payments
              merchant: {
                capabilities: {
                  card_payments: {
                    requested: true,
                  },
                },
              },
              // Recipient configuration for receiving transfers (REQUIRED for transfer_data)
              // Without this, payments with transfer_data will fail with "stripe_transfers not enabled"
              recipient: {
                capabilities: {
                  stripe_balance: {
                    stripe_transfers: {
                      requested: true,
                    },
                  },
                },
              },
            },
            // Default settings
            defaults: {
              currency: 'gbp',
              responsibilities: {
                fees_collector: 'application', // Platform collects fees
                losses_collector: 'application', // Platform is liable for losses when dashboard='none'
              },
              locales: ['en-GB'],
            },
          }),
        });

        if (!v2Response.ok) {
          // Accounts v2 failed - return error (no fallback)
          const v2ErrorText = await v2Response.text();
          let v2ErrorJson: any = null;
          try {
            v2ErrorJson = JSON.parse(v2ErrorText);
          } catch {
            v2ErrorJson = { raw: v2ErrorText };
          }
          
          console.error('[CREATE-CONNECT] Accounts v2 API failed:', {
            status: v2Response.status,
            statusText: v2Response.statusText,
            errorText: v2ErrorText,
            errorJson: v2ErrorJson,
          });
          
          return new Response(
            JSON.stringify({
              error: 'Failed to create Stripe Connect account',
              details: 'Accounts v2 API request failed. Only Accounts v2 is supported (no fallbacks).',
              stripeError: v2ErrorJson?.error || v2ErrorText,
              statusCode: v2Response.status,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // Success - parse response
        const v2Account = await v2Response.json();
        accountId = v2Account.id;
        
        console.log('[CREATE-CONNECT] Created Accounts v2 account (official way):', accountId, {
          dashboard: v2Account.dashboard, // Should be 'none' for fully embedded
          applied_configurations: v2Account.applied_configurations,
          identity: v2Account.identity,
        });
        
      } catch (v2Error: any) {
        // Network or parsing error - return error (no fallback)
        console.error('[CREATE-CONNECT] Accounts v2 API error:', {
          message: v2Error?.message || v2Error?.toString(),
          type: v2Error?.type,
          code: v2Error?.code,
          statusCode: v2Error?.statusCode,
          stack: v2Error?.stack,
        });
        
          return new Response(
            JSON.stringify({
              error: 'Failed to create Stripe Connect account',
            details: 'Accounts v2 API request failed. Only Accounts v2 is supported (no fallbacks).',
            errorMessage: v2Error?.message || 'Unknown error',
            errorType: v2Error?.type,
            errorCode: v2Error?.code,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
      }

      // Store connect account record
      const { data: newConnectAccount, error: dbError } = await supabase
        .from('connect_accounts')
        .insert({
          stripe_account_id: accountId,
          user_id: authenticatedUserId,
          account_status: 'pending',
          business_type: businessType || 'individual',
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false
        })
        .select()
        .single();

      if (dbError) {
        console.error('[CREATE-CONNECT] Database error:', dbError);
        // If duplicate key error, account was created between check and insert
        if (dbError.code === '23505') {
          // Fetch the existing account
          const { data: recovered } = await supabase
            .from('connect_accounts')
            .select('*')
            .eq('stripe_account_id', accountId)
            .single();
          connectAccount = recovered;
          accountId = recovered?.stripe_account_id || accountId;
        } else {
          throw dbError;
        }
      } else {
        connectAccount = newConnectAccount;
      }

      console.log('[CREATE-CONNECT] Saved to database:', connectAccount.id);
    }

    // Return account ID for embedded onboarding (NO Account Links - fully embedded)
    return new Response(
      JSON.stringify({ 
        connect_account_id: connectAccount.id,
        stripe_account_id: accountId,
        status: connectAccount.account_status || 'pending',
        onboardingUrl: null // No hosted onboarding URL - use embedded components only
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    const errorDetails = {
      message: error?.message || error?.toString() || 'Unknown error',
      type: error?.type || 'unknown',
      code: error?.code || 'unknown',
      statusCode: error?.statusCode,
      rawError: error,
      stack: error?.stack,
      // Additional Stripe-specific error details
      decline_code: error?.decline_code,
      param: error?.param,
      request_id: error?.requestId || error?.request_id
    };
    console.error('[CREATE-CONNECT] Error details:', JSON.stringify(errorDetails, null, 2));
    console.error('[CREATE-CONNECT] Full error object:', error);
    
    // Return detailed error for debugging
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create connect account', 
        details: errorDetails.message,
        type: errorDetails.type,
        code: errorDetails.code,
        statusCode: errorDetails.statusCode,
        decline_code: errorDetails.decline_code,
        param: errorDetails.param,
        request_id: errorDetails.request_id,
        // Include full error for debugging
        fullError: errorDetails
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleTransferToConnect(req: Request, body: any, supabase: any) {
  try {
    const { amount, currency, connect_account_id, payment_intent_id } = body;

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

async function handleGetConnectAccountStatus(req: Request, body: any, supabase: any) {
  try {
    const { userId, user_id, account_id } = body;
    const actualUserId = userId || user_id;
    const actualAccountId = account_id;

    // If account_id is provided, get user from that
    let targetUserId = actualUserId;
    let stripeAccountId = actualAccountId;

    if (actualAccountId && !actualUserId) {
      // Look up user by account_id
      const { data: accountUser, error: lookupError } = await supabase
        .from('users')
        .select('id, stripe_connect_account_id')
        .eq('stripe_connect_account_id', actualAccountId)
        .single();
      
      if (!lookupError && accountUser) {
        targetUserId = accountUser.id;
        stripeAccountId = accountUser.stripe_connect_account_id;
      }
    }

    if (!targetUserId && !stripeAccountId) {
      return new Response(
        JSON.stringify({ error: 'User ID or Account ID required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get connect account from database or users table
    // If account_id was provided directly, we can use it even if user record doesn't have it set yet
    let userStripeAccountId = null;
    if (targetUserId || actualUserId) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('stripe_connect_account_id')
        .eq('id', targetUserId || actualUserId)
        .maybeSingle();
      
      if (!userError && user) {
        userStripeAccountId = user.stripe_connect_account_id;
      }
    }
    
    // Use account_id from request if provided, otherwise use user's stored account ID
    const finalAccountId = stripeAccountId || userStripeAccountId;
    
    if (!finalAccountId) {
      return new Response(
        JSON.stringify({ error: 'No Stripe account found. Please provide account_id or ensure user has a Stripe account.' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    const finalUserId = targetUserId || actualUserId;

    if (!finalAccountId) {
      console.error('[CONNECT-STATUS] No account ID available');
      return new Response(
        JSON.stringify({ error: 'No Stripe account ID found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Stripe first - this is the source of truth
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Try to retrieve account from Stripe (will fail if invalid)
    let account;
    try {
      account = await stripe.accounts.retrieve(finalAccountId);
    } catch (stripeError: any) {
      console.error('[CONNECT-STATUS] Stripe API error:', stripeError);
      return new Response(
        JSON.stringify({ 
          error: 'Stripe account not found or invalid',
          details: stripeError.message
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Now check/update database record
    // CRITICAL: Query by stripe_account_id first (exact match) to avoid duplicate issues
    let connectAccount;
    let queryMethod = 'none';
    
    if (finalAccountId) {
      console.log('[CONNECT-STATUS] Querying by stripe_account_id:', finalAccountId);
      const { data: matchedAccounts, error: accountError } = await supabase
        .from('connect_accounts')
        .select('*')
        .eq('stripe_account_id', finalAccountId)
        .limit(1);
      
      if (accountError) {
        console.error('[CONNECT-STATUS] Error querying by stripe_account_id:', accountError);
      } else if (matchedAccounts && matchedAccounts.length > 0) {
        connectAccount = matchedAccounts[0];
        queryMethod = 'stripe_account_id';
        console.log('[CONNECT-STATUS] Found record by stripe_account_id:', connectAccount.id);
      }
    }

    // Fallback: query by user_id if no match found by stripe_account_id
    if (!connectAccount && finalUserId) {
      console.log('[CONNECT-STATUS] Fallback: Querying by user_id:', finalUserId);
      const { data: userAccounts, error: userError } = await supabase
        .from('connect_accounts')
        .select('*')
        .eq('user_id', finalUserId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (userError) {
        console.error('[CONNECT-STATUS] Error querying by user_id:', userError);
      } else if (userAccounts && userAccounts.length > 0) {
        connectAccount = userAccounts[0];
        queryMethod = 'user_id';
        console.log('[CONNECT-STATUS] Found record by user_id:', connectAccount.id);
        
        // Warn if multiple records exist for this user
        const { count, error: countError } = await supabase
          .from('connect_accounts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', finalUserId);
        
        if (!countError && count && count > 1) {
          console.warn(`[CONNECT-STATUS] WARNING: User has ${count} connect_accounts records. Using most recent.`);
          console.warn(`[CONNECT-STATUS] User's stripe_connect_account_id: ${finalAccountId}, Selected record: ${connectAccount.stripe_account_id}`);
        }
      }
    }

    // If connect_accounts record doesn't exist, create it
    let finalAccount = connectAccount;
    if (!connectAccount) {
      console.log('[CONNECT-STATUS] Creating missing connect_accounts record');
      const { data: newRecord, error: insertError } = await supabase
        .from('connect_accounts')
        .insert({
          user_id: finalUserId,
          stripe_account_id: finalAccountId,
          account_status: account.charges_enabled && account.payouts_enabled && account.details_submitted ? 'active' : 'pending',
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          business_type: account.business_type || 'individual',
          country: account.country || 'GB',
          email: account.email
        })
        .select()
        .single();

      if (insertError) {
        console.error('[CONNECT-STATUS] Failed to create record:', insertError);
        // Continue anyway - use Stripe data directly
      } else {
        finalAccount = newRecord;
      }
    }

    console.log('[CONNECT-STATUS] Retrieved from Stripe:', {
      id: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted
    });
    
    console.log('[CONNECT-STATUS] Query method used:', queryMethod);
    console.log('[CONNECT-STATUS] Database record found:', !!finalAccount);
    if (finalAccount) {
      console.log('[CONNECT-STATUS] Database record ID:', finalAccount.id);
      console.log('[CONNECT-STATUS] Database stripe_account_id:', finalAccount.stripe_account_id);
    }

    // Update database with latest status if record exists
    if (finalAccount) {
      const { data: updatedAccount, error: updateError } = await supabase
        .from('connect_accounts')
        .update({
          account_status: account.charges_enabled && account.payouts_enabled && account.details_submitted ? 'active' : 'pending',
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          updated_at: new Date().toISOString()
        })
        .eq('id', finalAccount.id)
        .select()
        .single();

      if (updateError) {
        console.error('[CONNECT-STATUS] Update error:', updateError);
      } else if (updatedAccount) {
        finalAccount = updatedAccount;
      }

      // Ensure users table is also updated (trigger should handle this, but safety net)
      await supabase
        .from('users')
        .update({ stripe_connect_account_id: finalAccountId })
        .eq('id', finalUserId)
        .neq('stripe_connect_account_id', finalAccountId); // Only update if different
    }

    // Return with camelCase keys to match frontend expectations
    // Use Stripe data as source of truth (always up-to-date)
    const statusValue = finalAccount?.account_status || 
      (account.charges_enabled && account.payouts_enabled && account.details_submitted ? 'active' : 'pending');
    
    return new Response(
      JSON.stringify({ 
        connect_account_id: finalAccount?.id || null,
        stripe_account_id: finalAccountId,
        status: statusValue,
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
        detailsSubmitted: account.details_submitted || false,
        requirementsCurrentlyDue: account.requirements?.currently_due || [],
        isFullyOnboarded: (account.charges_enabled && account.payouts_enabled && account.details_submitted) || false
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error getting connect account status:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get connect account status', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleVerifyConnectAccount(req: Request, body: any, supabase: any) {
  try {
    const { therapist_connect_account_id, practitioner_id, user_id } = body;
    const targetAccountId = therapist_connect_account_id;
    const targetUserId = practitioner_id || user_id;

    // Enhanced logging to see what was received
    console.log('[VERIFY-CONNECT-ACCOUNT] Received parameters:', {
      therapist_connect_account_id: targetAccountId,
      practitioner_id,
      user_id,
      targetAccountId,
      targetUserId,
      hasAccountId: !!targetAccountId,
      hasUserId: !!targetUserId,
      accountIdType: typeof targetAccountId,
      userIdType: typeof targetUserId
    });

    if (!targetAccountId && !targetUserId) {
      const errorResponse = {
        error: 'Missing connect_account_id or user_id',
        received: {
          therapist_connect_account_id: targetAccountId,
          practitioner_id,
          user_id,
          body_keys: Object.keys(body || {})
        },
        message: 'Either therapist_connect_account_id or practitioner_id/user_id must be provided'
      };
      
      console.error('[VERIFY-CONNECT-ACCOUNT] Validation failed:', errorResponse);
      
      return new Response(
        JSON.stringify(errorResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Get account ID from database if not provided
    let finalAccountId = targetAccountId;
    if (!finalAccountId && targetUserId) {
      const { data: connectAccount } = await supabase
        .from('connect_accounts')
        .select('stripe_account_id')
        .eq('user_id', targetUserId)
        .eq('account_status', 'active')
        .maybeSingle();
      
      if (!connectAccount?.stripe_account_id) {
        return new Response(
          JSON.stringify({ 
            verified: false,
            error: 'No active Stripe Connect account found',
            charges_enabled: false,
            payouts_enabled: false,
            details_submitted: false
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      finalAccountId = connectAccount.stripe_account_id;
    }

    // Verify account status directly from Stripe API
    try {
      const account = await stripe.accounts.retrieve(finalAccountId);
      
      const isReady = account.charges_enabled && account.payouts_enabled && account.details_submitted;
      
      return new Response(
        JSON.stringify({
          verified: isReady,
          charges_enabled: account.charges_enabled || false,
          payouts_enabled: account.payouts_enabled || false,
          details_submitted: account.details_submitted || false,
          account_id: finalAccountId,
          capabilities: account.capabilities || {},
          requirements: account.requirements || {}
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (stripeError: any) {
      console.error('[VERIFY-CONNECT-ACCOUNT] Stripe API error:', stripeError);
      return new Response(
        JSON.stringify({ 
          verified: false,
          error: 'Stripe account not found or invalid',
          details: stripeError.message,
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error: any) {
    console.error('[VERIFY-CONNECT-ACCOUNT] Error:', error);
    return new Response(
      JSON.stringify({ 
        verified: false,
        error: 'Failed to verify Connect account',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleCreateOnboardingLink(req: Request, body: any, supabase: any) {
  // UNIFIED APPROACH: This now calls the same unified logic as handleCreateConnectAccount
  // Just normalize the parameters and delegate
  try {
    const { user_id, email, first_name, last_name, return_url } = body;
    
    // Normalize parameter names to match handleCreateConnectAccount
    const normalizedBody = {
      userId: user_id,
      email: email,
      firstName: first_name,
      lastName: last_name,
      businessType: 'individual',
      return_url: return_url // Pass through return_url
    };

    // Delegate to unified function
    return await handleCreateConnectAccount(req, normalizedBody, supabase);
  } catch (error) {
    console.error('[CREATE-ONBOARDING-LINK] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create onboarding link', 
        details: error.message,
        type: error.type || 'unknown',
        code: error.code || 'unknown'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleCreateCheckoutSession(req: Request, body: any, supabase: any) {
  try {
    console.log('[CREATE-CHECKOUT-SESSION] Starting function');
    
    const { practitioner_id, price_id, client_email, client_name } = body;
    console.log('[CREATE-CHECKOUT-SESSION] Request data:', { practitioner_id, price_id, client_email, client_name });

    if (!practitioner_id || !price_id) {
      console.log('[CREATE-CHECKOUT-SESSION] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: practitioner_id, price_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('[CREATE-CHECKOUT-SESSION] Missing auth header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create anon key client for user validation
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await supabaseAnon.auth.getUser(token);
    
    if (authError || !authData?.user?.id) {
      console.log('[CREATE-CHECKOUT-SESSION] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid user' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[CREATE-CHECKOUT-SESSION] Authentication successful');

    // Initialize Stripe with secret key
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Generate idempotency key
    const idempotencyKey = `checkout_${practitioner_id}_${client_email}_${Date.now()}`;
    console.log('[CREATE-CHECKOUT-SESSION] Idempotency key:', idempotencyKey);

    // Check if session already exists (idempotency check)
    const { data: existingSession, error: existingError } = await supabase
      .from('checkout_sessions')
      .select('stripe_checkout_session_id, status')
      .eq('idempotency_key', idempotencyKey)
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .maybeSingle();

    if (existingSession && existingSession.status === 'completed') {
      console.log('[CREATE-CHECKOUT-SESSION] Found existing completed session');
      return new Response(
        JSON.stringify({ 
          checkout_url: `https://checkout.stripe.com/c/pay/${existingSession.stripe_checkout_session_id}`,
          existing: true 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get practitioner's Stripe Connect account
    const { data: practitioner, error: practitionerError } = await supabase
      .from('users')
      .select('stripe_connect_account_id, first_name, last_name')
      .eq('id', practitioner_id)
      .single();

    if (practitionerError || !practitioner?.stripe_connect_account_id) {
      console.log('[CREATE-CHECKOUT-SESSION] Practitioner not found or not connected:', practitionerError);
      return new Response(
        JSON.stringify({ error: 'Practitioner not connected to Stripe' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('practitioner_products')
      .select('*')
      .eq('stripe_price_id', price_id)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      console.log('[CREATE-CHECKOUT-SESSION] Product not found:', productError);
      return new Response(
        JSON.stringify({ error: 'Product not found or inactive' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Calculate application fee (0.5% platform fee)
    const applicationFeeAmount = Math.round(product.price_amount * 0.005);
    
    console.log('[CREATE-CHECKOUT-SESSION] Creating checkout session:', {
      price_id,
      application_fee: applicationFeeAmount,
      destination: practitioner.stripe_connect_account_id,
      product_price: product.price_amount
    });

    // CRITICAL FIX: Use price_data instead of price because prices are created on Connect account
    // but checkout sessions with transfer_data need prices on platform account
    // Create checkout session with application fee using inline price_data
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            unit_amount: product.price_amount, // Price in pence
            product_data: {
              name: product.name,
              description: product.description || undefined,
              metadata: {
                practitioner_id: practitioner_id,
                product_id: product.id,
                original_price_id: price_id, // Keep reference to original
              },
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: practitioner.stripe_connect_account_id,
        },
      },
      customer_email: client_email,
      metadata: {
        practitioner_id: practitioner_id,
        product_id: product.id,
        client_user_id: authData.user.id,
        platform: 'peer-care-connect',
        original_price_id: price_id, // Keep reference for tracking
      },
      success_url: `${Deno.env.get('APP_URL')}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('APP_URL')}/booking/cancel`,
    });

    console.log('[CREATE-CHECKOUT-SESSION] Created session:', session.id);

    // Save checkout session to database for idempotency tracking
    const { error: dbError } = await supabase
      .from('checkout_sessions')
      .insert({
        stripe_checkout_session_id: session.id,
        idempotency_key: idempotencyKey,
        practitioner_id: practitioner_id,
        client_email: client_email,
        client_name: client_name,
        status: 'pending',
        expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour
      });

    if (dbError) {
      console.error('[CREATE-CHECKOUT-SESSION] Database error (non-fatal):', dbError);
      // Continue even if DB insert fails - session was created successfully
    }

    return new Response(
      JSON.stringify({ 
        checkout_url: session.url,
        session_id: session.id,
        application_fee_amount: applicationFeeAmount,
        practitioner_amount: product.price_amount - applicationFeeAmount
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[CREATE-CHECKOUT-SESSION] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create checkout session', 
        details: error.message,
        type: error.type || 'unknown',
        code: error.code || 'unknown'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

async function handleCreateMobileCheckoutSession(req: Request, body: any, supabase: any) {
  try {
    const {
      request_id,
      amount,
      currency,
      client_email,
      practitioner_id,
      therapist_connect_account_id,
      metadata,
    } = body || {};

    if (!request_id || !amount || !currency || !client_email || !practitioner_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          details: {
            request_id: !!request_id,
            amount: !!amount,
            currency: !!currency,
            client_email: !!client_email,
            practitioner_id: !!practitioner_id,
          },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: mobileRequest, error: requestError } = await supabase
      .from('mobile_booking_requests')
      .select('id, status, payment_status, total_price_pence, platform_fee_pence, practitioner_id, product_id, client_id')
      .eq('id', request_id)
      .eq('practitioner_id', practitioner_id)
      .maybeSingle();

    if (requestError || !mobileRequest) {
      return new Response(
        JSON.stringify({ error: 'Mobile request not found', details: requestError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (mobileRequest.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Mobile request is not pending (status: ${mobileRequest.status})` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (Number(amount) !== Number(mobileRequest.total_price_pence)) {
      return new Response(
        JSON.stringify({
          error: 'Amount mismatch for mobile request',
          details: {
            expected: mobileRequest.total_price_pence,
            received: amount,
          },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let destinationAccountId = therapist_connect_account_id;
    if (!destinationAccountId) {
      const { data: practitioner } = await supabase
        .from('users')
        .select('stripe_connect_account_id')
        .eq('id', practitioner_id)
        .maybeSingle();
      destinationAccountId = practitioner?.stripe_connect_account_id;
    }

    if (!destinationAccountId) {
      return new Response(
        JSON.stringify({ error: 'Practitioner not connected to Stripe' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const appUrl = (
      Deno.env.get('APP_URL') ||
      Deno.env.get('SITE_URL') ||
      'https://theramate.co.uk'
    ).replace(/\/$/, '');
    const encodedRequestId = encodeURIComponent(request_id);
    const successUrl = `${appUrl}/marketplace?mobile_checkout_success=1&mobile_request_id=${encodedRequestId}&mobile_checkout_session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/marketplace?mobile_checkout_canceled=1&mobile_request_id=${encodedRequestId}`;
    const platformFee = Number.isFinite(Number(mobileRequest.platform_fee_pence))
      ? Number(mobileRequest.platform_fee_pence)
      : Math.round(Number(amount) * 0.005);

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: client_email,
      line_items: [
        {
          price_data: {
            currency: String(currency).toLowerCase(),
            unit_amount: Number(amount),
            product_data: {
              name: metadata?.service_name || 'Mobile Session',
              description: `Mobile booking request ${request_id}`,
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        capture_method: 'manual',
        application_fee_amount: platformFee,
        transfer_data: {
          destination: destinationAccountId,
        },
        metadata: {
          payment_type: 'mobile_booking_request',
          request_id,
          practitioner_id,
          product_id: mobileRequest.product_id || '',
          client_user_id: mobileRequest.client_id || metadata?.client_user_id || '',
          ...metadata,
        },
      },
      metadata: {
        payment_type: 'mobile_booking_request',
        request_id,
        practitioner_id,
        product_id: mobileRequest.product_id || '',
        client_user_id: mobileRequest.client_id || metadata?.client_user_id || '',
        ...metadata,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (checkoutSession.payment_intent && typeof checkoutSession.payment_intent === 'string') {
      await supabase
        .from('mobile_booking_requests')
        .update({
          stripe_payment_intent_id: checkoutSession.payment_intent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: checkoutSession.url,
        checkout_session_id: checkoutSession.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('[CREATE-MOBILE-CHECKOUT-SESSION] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create mobile checkout session',
        details: error?.message || String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}

async function handleConfirmMobileCheckoutSession(req: Request, body: any, supabase: any) {
  try {
    const { request_id, checkout_session_id } = body || {};

    if (!request_id || !checkout_session_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          details: {
            request_id: !!request_id,
            checkout_session_id: !!checkout_session_id,
          },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const checkoutSession = await stripe.checkout.sessions.retrieve(checkout_session_id, {
      expand: ['payment_intent'],
    });

    if (checkoutSession.metadata?.request_id && checkoutSession.metadata.request_id !== request_id) {
      return new Response(
        JSON.stringify({ error: 'Checkout session does not belong to request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (checkoutSession.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({
          error: 'Checkout session is not paid',
          details: { payment_status: checkoutSession.payment_status },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let paymentIntent: any = checkoutSession.payment_intent;
    if (typeof paymentIntent === 'string') {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntent);
    }

    if (!paymentIntent?.id) {
      return new Response(
        JSON.stringify({ error: 'Payment intent not found for checkout session' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const intentStatus = paymentIntent.status;
    const normalizedPaymentStatus =
      intentStatus === 'requires_capture'
        ? 'held'
        : intentStatus === 'succeeded'
          ? 'captured'
          : 'pending';

    const { error: updateError } = await supabase
      .from('mobile_booking_requests')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: normalizedPaymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request_id)
      .eq('status', 'pending');

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        request_id,
        payment_intent_id: paymentIntent.id,
        payment_status: normalizedPaymentStatus,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('[CONFIRM-MOBILE-CHECKOUT-SESSION] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to confirm mobile checkout session',
        details: error?.message || String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}

async function handleCaptureMobilePayment(req: Request, body: any, supabase: any) {
  try {
    const { payment_intent_id } = body || {};
    if (!payment_intent_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: payment_intent_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    let finalStatus = paymentIntent.status;

    if (paymentIntent.status === 'requires_capture') {
      const captured = await stripe.paymentIntents.capture(payment_intent_id);
      finalStatus = captured.status;
    } else if (paymentIntent.status !== 'succeeded') {
      return new Response(
        JSON.stringify({
          error: `Payment intent cannot be captured from status ${paymentIntent.status}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { error: updateError } = await supabase
      .from('mobile_booking_requests')
      .update({
        payment_status: 'captured',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', payment_intent_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        payment_intent_id,
        status: finalStatus,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('[CAPTURE-MOBILE-PAYMENT] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to capture mobile payment',
        details: error?.message || String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}

async function handleReleaseMobilePayment(req: Request, body: any, supabase: any) {
  try {
    const { payment_intent_id } = body || {};
    if (!payment_intent_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: payment_intent_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    let finalStatus = paymentIntent.status;

    if (
      paymentIntent.status === 'requires_capture' ||
      paymentIntent.status === 'requires_payment_method' ||
      paymentIntent.status === 'requires_confirmation' ||
      paymentIntent.status === 'requires_action' ||
      paymentIntent.status === 'processing'
    ) {
      const canceled = await stripe.paymentIntents.cancel(payment_intent_id);
      finalStatus = canceled.status;
    } else if (paymentIntent.status !== 'canceled') {
      return new Response(
        JSON.stringify({
          error: `Payment intent cannot be released from status ${paymentIntent.status}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { error: updateError } = await supabase
      .from('mobile_booking_requests')
      .update({
        payment_status: 'released',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', payment_intent_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        payment_intent_id,
        status: finalStatus,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('[RELEASE-MOBILE-PAYMENT] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to release mobile payment',
        details: error?.message || String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}

// Product Management Handlers

const ALLOWED_DURATIONS = [30, 45, 60, 75, 90];
const STRIPE_GBP_MIN_PENCE = 50;

async function handleCreateProduct(req: Request, body: any, supabase: any) {
  try {
    const { practitioner_id, name, description, price_amount, duration_minutes, category, service_category } = body;
    console.log('[CREATE-PRODUCT] Request:', { practitioner_id, name, price_amount, duration_minutes, category: category || 'general' });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return new Response(
        JSON.stringify({ error: 'Service name is required', details: 'name must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const amount = typeof price_amount === 'number' ? Math.round(price_amount) : parseInt(String(price_amount), 10);
    if (isNaN(amount) || amount < STRIPE_GBP_MIN_PENCE) {
      return new Response(
        JSON.stringify({
          error: 'Invalid price',
          details: `Price must be at least £${(STRIPE_GBP_MIN_PENCE / 100).toFixed(2)} (${STRIPE_GBP_MIN_PENCE} pence). Received: ${price_amount}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const dur = duration_minutes != null ? parseInt(String(duration_minutes), 10) : 60;
    if (isNaN(dur) || !ALLOWED_DURATIONS.includes(dur)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid duration',
          details: `Duration must be one of: ${ALLOWED_DURATIONS.join(', ')} minutes. Received: ${duration_minutes}`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !authData?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid user' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (authData.user.id !== practitioner_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', { apiVersion: '2023-10-16' });
    const { data: practitioner } = await supabase.from('users').select('stripe_connect_account_id').eq('id', practitioner_id).single();

    if (!practitioner?.stripe_connect_account_id) {
      return new Response(
        JSON.stringify({
          error: 'Practitioner not connected to Stripe',
          requires_connect: true,
          message: 'Please complete Stripe Connect onboarding before creating products',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const desc = (typeof description === 'string' && description.trim()) ? description.trim() : undefined;
    let stripeProduct: { id: string };
    try {
      stripeProduct = await stripe.products.create({
        name: name.trim(),
        description: desc,
        metadata: { practitioner_id, platform: 'peer-care-connect' },
      }, { stripeAccount: practitioner.stripe_connect_account_id });
    } catch (stripeErr: any) {
      console.error('[CREATE-PRODUCT] Stripe products.create error:', {
        message: stripeErr?.message,
        type: stripeErr?.type,
        code: stripeErr?.code,
        statusCode: stripeErr?.statusCode,
      });
      return new Response(
        JSON.stringify({
          error: 'Stripe error creating product',
          details: stripeErr?.message || String(stripeErr),
          code: stripeErr?.code,
          type: stripeErr?.type,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let stripePrice: { id: string };
    try {
      stripePrice = await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: amount,
        currency: 'gbp',
        metadata: {
          practitioner_id,
          duration_minutes: String(dur),
          category: category || 'general',
          service_category: service_category || '',
        },
      }, { stripeAccount: practitioner.stripe_connect_account_id });
    } catch (stripeErr: any) {
      console.error('[CREATE-PRODUCT] Stripe prices.create error:', {
        message: stripeErr?.message,
        type: stripeErr?.type,
        code: stripeErr?.code,
        statusCode: stripeErr?.statusCode,
      });
      await stripe.products.del(stripeProduct.id, { stripeAccount: practitioner.stripe_connect_account_id }).catch(() => {});
      return new Response(
        JSON.stringify({
          error: 'Stripe error creating price',
          details: stripeErr?.message || String(stripeErr),
          code: stripeErr?.code,
          type: stripeErr?.type,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: product, error: dbError } = await supabase.from('practitioner_products').insert({
      practitioner_id,
      stripe_product_id: stripeProduct.id,
      stripe_price_id: stripePrice.id,
      name: name.trim(),
      description: desc ?? null,
      price_amount: amount,
      duration_minutes: dur,
      category: category || 'general',
      service_category: service_category || null,
      is_active: true,
    }).select().single();

    if (dbError) {
      console.error('[CREATE-PRODUCT] DB insert error:', { message: dbError.message, code: dbError.code, details: dbError.details });
      await stripe.products.del(stripeProduct.id, { stripeAccount: practitioner.stripe_connect_account_id }).catch(() => {});
      return new Response(
        JSON.stringify({
          error: 'Database error saving product',
          details: dbError.message,
          code: dbError.code,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[CREATE-PRODUCT] Success:', product?.id);
    return new Response(JSON.stringify({ product }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('[CREATE-PRODUCT] Unexpected error:', {
      message: error?.message,
      type: error?.type,
      code: error?.code,
      stack: error?.stack,
    });
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error?.message || String(error),
        code: error?.code,
        type: error?.type,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleUpdateProduct(req: Request, body: any, supabase: any) {
  try {
    const { product_id, ...updates } = body;
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    // Create anon key client for user validation
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await supabaseAnon.auth.getUser(token);
    
    if (authError || !authData?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid user' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const { data: existingProduct } = await supabase.from('practitioner_products').select('*').eq('id', product_id).single();
    
    if (!existingProduct || authData.user.id !== existingProduct.practitioner_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', { apiVersion: '2023-10-16' });
    const { data: practitioner } = await supabase.from('users').select('stripe_connect_account_id').eq('id', existingProduct.practitioner_id).single();
    
    if (!practitioner?.stripe_connect_account_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Practitioner not connected to Stripe',
          requires_connect: true,
          message: 'Please complete Stripe Connect onboarding before updating products'
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (updates.name || updates.description) {
      await stripe.products.update(existingProduct.stripe_product_id, {
        name: updates.name || existingProduct.name,
        description: updates.description || existingProduct.description,
      }, { stripeAccount: practitioner.stripe_connect_account_id });
    }
    
    // Update Stripe price metadata if service_category or other metadata fields changed
    if (updates.service_category !== undefined || updates.category !== undefined || updates.duration_minutes !== undefined) {
      const updatedMetadata: Record<string, string> = {
        practitioner_id: existingProduct.practitioner_id,
        duration_minutes: (updates.duration_minutes ?? existingProduct.duration_minutes)?.toString() || '',
        category: updates.category || existingProduct.category || 'general',
        service_category: updates.service_category || existingProduct.service_category || '',
      };
      
      // Update price metadata (note: Stripe doesn't allow updating price metadata directly)
      // We'd need to create a new price if metadata changes are critical, but for now we'll just update DB
      console.log('[UPDATE-PRODUCT] Metadata would be:', updatedMetadata);
    }
    
    const { data: product, error: dbError } = await supabase.from('practitioner_products').update(updates).eq('id', product_id).select().single();
    
    if (dbError) throw dbError;
    return new Response(JSON.stringify({ product }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('[UPDATE-PRODUCT] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

async function handleDeleteProduct(req: Request, body: any, supabase: any) {
  try {
    const { product_id } = body;
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    // Create anon key client for user validation
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await supabaseAnon.auth.getUser(token);
    
    if (authError || !authData?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid user' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const { data: existingProduct } = await supabase.from('practitioner_products').select('*').eq('id', product_id).single();
    
    if (!existingProduct || authData.user.id !== existingProduct.practitioner_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', { apiVersion: '2023-10-16' });
    const { data: practitioner } = await supabase.from('users').select('stripe_connect_account_id').eq('id', existingProduct.practitioner_id).single();
    
    await stripe.products.update(existingProduct.stripe_product_id, { active: false }, { stripeAccount: practitioner?.stripe_connect_account_id });
    await supabase.from('practitioner_products').delete().eq('id', product_id);
    
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('[DELETE-PRODUCT] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

async function handleListProducts(req: Request, body: any, supabase: any) {
  try {
    const { practitioner_id } = body;
    
    const { data: products, error } = await supabase.from('practitioner_products').select('*').eq('practitioner_id', practitioner_id).order('created_at', { ascending: false });
    
    if (error) throw error;
    return new Response(JSON.stringify({ products: products || [] }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('[LIST-PRODUCTS] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

// Account Session handler for Stripe Connect Embedded Components
async function handleCreateAccountSession(req: Request, body: any, supabase: any) {
  try {
    const { stripe_account_id, components } = body;

    console.log('[CREATE-ACCOUNT-SESSION] Starting with params:', { stripe_account_id, components });

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[CREATE-ACCOUNT-SESSION] Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create anon key client for user validation
    const supabaseAnon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await supabaseAnon.auth.getUser(token);
    
    if (authError || !authData?.user?.id) {
      console.error('[CREATE-ACCOUNT-SESSION] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid user', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authenticatedUserId = authData.user.id;

    // If no stripe_account_id provided, look up from database
    let accountId = stripe_account_id;
    if (!accountId) {
      const { data: connectAccount, error: fetchError } = await supabase
        .from('connect_accounts')
        .select('stripe_account_id')
        .eq('user_id', authenticatedUserId)
        .maybeSingle();

      if (fetchError || !connectAccount?.stripe_account_id) {
        console.error('[CREATE-ACCOUNT-SESSION] No Connect account found for user:', authenticatedUserId);
        return new Response(
          JSON.stringify({ error: 'No Stripe Connect account found. Please complete onboarding first.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      accountId = connectAccount.stripe_account_id;
    } else {
      // Verify the user owns this account
      const { data: verifyAccount, error: verifyError } = await supabase
        .from('connect_accounts')
        .select('user_id')
        .eq('stripe_account_id', accountId)
        .maybeSingle();

      if (verifyError || !verifyAccount || verifyAccount.user_id !== authenticatedUserId) {
        console.error('[CREATE-ACCOUNT-SESSION] User does not own this account:', { accountId, authenticatedUserId });
        return new Response(
          JSON.stringify({ error: 'Unauthorized: you do not own this Stripe Connect account' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('[CREATE-ACCOUNT-SESSION] Creating session for account:', accountId);

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Verify account is Accounts v2 format (dashboard: 'none' for fully embedded)
    // Use Accounts v2 API to retrieve account details
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
    let accountDashboard: string | null = null;
    let responsibilities: any = null;
    
    try {
      const retrieveResponse = await fetch(
        `https://api.stripe.com/v2/core/accounts/${accountId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/json',
            'Stripe-Version': '2025-04-30.preview',
          },
        }
      );

      if (!retrieveResponse.ok) {
        const errorText = await retrieveResponse.text();
        console.error('[CREATE-ACCOUNT-SESSION] Failed to retrieve account:', {
          status: retrieveResponse.status,
          statusText: retrieveResponse.statusText,
          errorText
        });
        return new Response(
          JSON.stringify({
            error: 'Failed to retrieve Stripe account',
            details: `Account not found or invalid. Status: ${retrieveResponse.status}`,
            account_id: accountId
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const account = await retrieveResponse.json();
      accountDashboard = account.dashboard || null;
      responsibilities = account.defaults?.responsibilities || {};
      
      console.log('[CREATE-ACCOUNT-SESSION] Account details:', {
        dashboard: accountDashboard,
        fees_collector: responsibilities.fees_collector,
        losses_collector: responsibilities.losses_collector,
        account_id: account.id,
      });
      
      // ONLY Accounts v2 accounts with dashboard: 'none' support fully embedded onboarding
      if (accountDashboard !== 'none') {
        console.error('[CREATE-ACCOUNT-SESSION] Account is not Accounts v2 format:', accountDashboard);
        return new Response(
          JSON.stringify({
            error: 'Invalid account type',
            details: `Only Accounts v2 accounts with dashboard: 'none' support fully embedded onboarding. Account dashboard: ${accountDashboard || 'null'}`,
            account_id: accountId
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (accountError: any) {
      console.error('[CREATE-ACCOUNT-SESSION] Failed to retrieve account:', {
        message: accountError.message,
        type: accountError.type,
        code: accountError.code
      });
      return new Response(
        JSON.stringify({
          error: 'Failed to retrieve Stripe account',
          details: accountError.message,
          code: accountError.code
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build components configuration for fully embedded onboarding
    // NOTE: disable_stripe_user_authentication works when dashboard: 'none' and responsibilities are set to 'application'
    // For Accounts v2, when dashboard: 'none' and fees_collector/losses_collector: 'application', 
    // the platform is responsible for requirement collection, enabling disable_stripe_user_authentication
    const accountOnboardingFeatures: any = {
      external_account_collection: true, // Allow bank account collection inline
    };
    
    // Enable disable_stripe_user_authentication for Accounts v2 when platform owns requirements
    // This is true when dashboard: 'none' and responsibilities are set to 'application'
    const platformOwnsRequirements = accountDashboard === 'none' && 
                                      responsibilities.fees_collector === 'application' && 
                                      responsibilities.losses_collector === 'application';
    
    if (platformOwnsRequirements) {
      accountOnboardingFeatures.disable_stripe_user_authentication = true;
      console.log('[CREATE-ACCOUNT-SESSION] Account has platform-owned requirements - enabling disable_stripe_user_authentication');
    } else {
      console.log('[CREATE-ACCOUNT-SESSION] Account does not have platform-owned requirements - NOT enabling disable_stripe_user_authentication');
      // Remove disable_stripe_user_authentication from frontend components if present
      if (components?.account_onboarding?.features?.disable_stripe_user_authentication) {
        console.log('[CREATE-ACCOUNT-SESSION] Removing disable_stripe_user_authentication from frontend components (incompatible with account config)');
      }
    }
    
    // Build final components config - merge frontend components with validated backend config
    const frontendFeatures = components?.account_onboarding?.features || {};
    const finalFeatures: any = {
      ...accountOnboardingFeatures,
      ...frontendFeatures,
    };
    
    // Remove disable_stripe_user_authentication if account doesn't support it
    if (!platformOwnsRequirements) {
      delete finalFeatures.disable_stripe_user_authentication;
    }
    
    // CRITICAL: disable_stripe_user_authentication must be the same for account_onboarding and payouts
    // Backend completely controls this feature to ensure consistency - frontend config is ignored for this feature
    const payoutsFeatures: any = {};
    
    // Copy other frontend payouts features (excluding disable_stripe_user_authentication which we control)
    const frontendPayoutsFeatures = components?.payouts?.features || {};
    Object.keys(frontendPayoutsFeatures).forEach(key => {
      if (key !== 'disable_stripe_user_authentication') {
        payoutsFeatures[key] = frontendPayoutsFeatures[key];
      }
    });
    
    // Set disable_stripe_user_authentication for payouts to match account_onboarding (backend-controlled)
    if (platformOwnsRequirements && finalFeatures.disable_stripe_user_authentication) {
      payoutsFeatures.disable_stripe_user_authentication = true;
      console.log('[CREATE-ACCOUNT-SESSION] Setting disable_stripe_user_authentication for payouts to match account_onboarding');
    } else {
      // Explicitly ensure it's NOT set if account doesn't support it
      delete payoutsFeatures.disable_stripe_user_authentication;
      if (frontendPayoutsFeatures.disable_stripe_user_authentication) {
        console.log('[CREATE-ACCOUNT-SESSION] Removed disable_stripe_user_authentication from payouts (account does not support it)');
      }
    }
    
    const componentsConfig = {
      account_onboarding: { 
        enabled: components?.account_onboarding?.enabled ?? true,
        features: finalFeatures,
      },
      account_management: { enabled: components?.account_management?.enabled ?? true },
      payouts: { 
        enabled: components?.payouts?.enabled ?? true,
        features: Object.keys(payoutsFeatures).length > 0 ? payoutsFeatures : undefined,
      },
      payments: { enabled: components?.payments?.enabled ?? true },
      notification_banner: { enabled: components?.notification_banner?.enabled ?? true },
      disputes_list: { enabled: components?.disputes_list?.enabled ?? true },
      balances: { enabled: components?.balances?.enabled ?? true },
    };
    
    console.log('[CREATE-ACCOUNT-SESSION] Using fully embedded configuration for Accounts v2 account');

    console.log('[CREATE-ACCOUNT-SESSION] Components config:', JSON.stringify(componentsConfig, null, 2));

    // Create Account Session for embedded components
    // This enables the account-onboarding component to render inline without redirects
    let accountSession;
    try {
      accountSession = await stripe.accountSessions.create({
        account: accountId,
        components: componentsConfig,
      });
      console.log('[CREATE-ACCOUNT-SESSION] Created session successfully');
    } catch (sessionError: any) {
      console.error('[CREATE-ACCOUNT-SESSION] Stripe accountSessions.create failed:', {
        message: sessionError.message,
        type: sessionError.type,
        code: sessionError.code,
        statusCode: sessionError.statusCode,
        raw: sessionError.toString()
      });
      throw sessionError; // Re-throw to be caught by outer catch block
    }

    return new Response(
      JSON.stringify({
        client_secret: accountSession.client_secret,
        expires_at: accountSession.expires_at,
        account_id: accountId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    const errorDetails = {
      message: error?.message || error?.toString() || 'Unknown error',
      type: error?.type || 'unknown',
      code: error?.code || 'unknown',
      statusCode: error?.statusCode,
      decline_code: error?.decline_code,
      param: error?.param,
      request_id: error?.requestId || error?.request_id,
      raw: error?.toString()
    };
    console.error('[CREATE-ACCOUNT-SESSION] Error:', JSON.stringify(errorDetails, null, 2));
    return new Response(
      JSON.stringify({
        error: 'Failed to create account session',
        details: errorDetails.message,
        type: errorDetails.type,
        code: errorDetails.code,
        statusCode: errorDetails.statusCode,
        param: errorDetails.param,
        request_id: errorDetails.request_id,
        fullError: errorDetails
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Handler for capturing same-day booking payment after practitioner approval
async function handleCaptureSameDayPayment(req: Request, body: any, supabase: any) {
  try {
    const { session_id, payment_intent_id } = body;

    if (!session_id || !payment_intent_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          details: { session_id: !!session_id, payment_intent_id: !!payment_intent_id }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Verify session exists and is pending approval
    const { data: session, error: sessionError } = await supabase
      .from('client_sessions')
      .select('id, status, payment_status, stripe_payment_intent_id, therapist_id, price')
      .eq('id', session_id)
      .eq('status', 'pending_approval')
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found or not pending approval' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (session.stripe_payment_intent_id !== payment_intent_id) {
      return new Response(
        JSON.stringify({ error: 'Payment intent ID mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Capture the payment intent
    const paymentIntent = await stripe.paymentIntents.capture(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return new Response(
        JSON.stringify({ error: 'Payment capture failed', status: paymentIntent.status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update session payment status (approve_same_day_booking RPC will handle status update)
    const { error: updateError } = await supabase
      .from('client_sessions')
      .update({
        payment_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', session_id);

    if (updateError) {
      console.error('[CAPTURE-SAME-DAY-PAYMENT] Error updating session:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_intent_id: paymentIntent.id,
        status: paymentIntent.status
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[CAPTURE-SAME-DAY-PAYMENT] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to capture payment',
        details: error?.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Handler for releasing same-day booking payment authorization after practitioner decline
async function handleReleaseSameDayPayment(req: Request, body: any, supabase: any) {
  try {
    const { session_id, payment_intent_id } = body;

    if (!session_id || !payment_intent_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          details: { session_id: !!session_id, payment_intent_id: !!payment_intent_id }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Verify session exists and is pending approval
    const { data: session, error: sessionError } = await supabase
      .from('client_sessions')
      .select('id, status, payment_status, stripe_payment_intent_id')
      .eq('id', session_id)
      .in('status', ['pending_approval', 'declined', 'expired'])
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found or invalid status' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (session.stripe_payment_intent_id !== payment_intent_id) {
      return new Response(
        JSON.stringify({ error: 'Payment intent ID mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cancel the payment intent (releases authorization)
    const paymentIntent = await stripe.paymentIntents.cancel(payment_intent_id);

    // Update session payment status (decline_same_day_booking RPC will handle status update)
    const { error: updateError } = await supabase
      .from('client_sessions')
      .update({
        payment_status: 'released',
        updated_at: new Date().toISOString()
      })
      .eq('id', session_id);

    if (updateError) {
      console.error('[RELEASE-SAME-DAY-PAYMENT] Error updating session:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_intent_id: paymentIntent.id,
        status: paymentIntent.status
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[RELEASE-SAME-DAY-PAYMENT] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to release payment authorization',
        details: error?.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
