import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://cdn.jsdelivr.net/npm/stripe@15.0.0/+esm";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/+esm";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Helper function to generate Google Calendar URL
function generateCalendarUrl(
  title: string,
  description: string,
  startDate: string,
  startTime: string,
  durationMinutes: number,
  location?: string
): string {
  try {
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);
    
    const formatGC = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${formatGC(startDateTime)}/${formatGC(endDateTime)}`,
      details: description,
    });
    
    if (location && location.trim() !== '') {
      params.append('location', location);
    }
    
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  } catch (error) {
    console.error('Error generating calendar URL:', error);
    return '#';
  }
}

// Initialize Stripe with the latest API version
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-07-30.basil", // Match Stripe Dashboard webhook API version
});

// Initialize Supabase client with service role key
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Helper function to retrieve user_id from metadata (simplified)
async function retrieveUserId(eventType: string, eventData: any): Promise<string | null> {
  console.log(`🔍 Retrieving user_id for ${eventType}`);
  
  try {
    if (eventType === "checkout.session.completed") {
      const session = eventData as Stripe.Checkout.Session;
      
      // Primary: From session metadata
      let userId = session.metadata?.user_id || session.metadata?.supabase_user_id;
      console.log("Session metadata user_id:", userId);
      
      if (!userId) {
        // Fallback: From customer metadata
        console.log("Checking customer metadata...");
        const customer = await stripe.customers.retrieve(session.customer as string);
        if (customer && !customer.deleted) {
          userId = customer.metadata?.user_id || customer.metadata?.supabase_user_id;
          console.log("Customer metadata user_id:", userId);
        }
      }
      
      console.log(`✅ Final user_id for ${eventType}:`, userId);
      return userId;
      
    } else if (eventType === "customer.subscription.created") {
      const subscription = eventData as Stripe.Subscription;
      
      // Primary: From subscription metadata
      let userId = subscription.metadata?.user_id || subscription.metadata?.supabase_user_id;
      console.log("Subscription metadata user_id:", userId);
      
      if (!userId) {
        // Fallback: From customer metadata
        console.log("Checking customer metadata...");
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if (customer && !customer.deleted) {
          userId = customer.metadata?.user_id || customer.metadata?.supabase_user_id;
          console.log("Customer metadata user_id:", userId);
        }
      }
      
      console.log(`✅ Final user_id for ${eventType}:`, userId);
      return userId;
    }
    
    return null;
    
  } catch (error) {
    console.error(`❌ Error retrieving user_id for ${eventType}:`, error);
    return null;
  }
}

// Helper function to safely update user onboarding status
async function updateUserOnboardingStatus(userId: string, eventType: string): Promise<boolean> {
  try {
    console.log(`👤 Updating onboarding status for user ${userId} (${eventType})`);
    
    // First, check if user is a practitioner
    const { data: userData } = await supabase
      .from('users')
      .select('user_role')
      .eq('id', userId)
      .single();
    
    const isPractitioner = userData?.user_role && 
      ['sports_therapist', 'massage_therapist', 'osteopath'].includes(userData.user_role);
    
    const updateData: any = { 
        onboarding_status: 'completed', 
        profile_completed: true,
        updated_at: new Date().toISOString()
    };
    
    // Automatically enable treatment exchange for practitioners
    if (isPractitioner) {
      updateData.treatment_exchange_enabled = true;
      console.log(`✅ Auto-enabling treatment exchange for practitioner ${userId}`);
    }
    
    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);
      
    if (error) {
      console.error(`❌ Error updating user onboarding status (${eventType}):`, error);
      return false;
    }
    
    console.log(`✅ User ${userId} onboarding status updated successfully (${eventType})`);
    return true;
  } catch (error) {
    console.error(`❌ Exception updating user onboarding status (${eventType}):`, error);
    return false;
  }
}

// Helper function to determine plan and monthly credits from price_id
function getPlanAndCredits(priceId: string | undefined): { plan: string; billing_cycle: string; monthly_credits: number } {
  if (!priceId) {
    return { plan: 'practitioner', billing_cycle: 'monthly', monthly_credits: 30 }; // Changed from 60
  }

  // Practitioner plans (monthly)
  if (priceId === 'price_1SGfP1Fk77knaVvan6m5IRRS' || priceId === 'price_1SGOrXFk77knaVvaCbVM0FZN') {
    return { plan: 'practitioner', billing_cycle: 'monthly', monthly_credits: 30 }; // Changed from 60
  }
  
  // Practitioner plans (yearly) - assuming SL prefix indicates yearly
  if (priceId.includes('SL6QFFk77knaVvaRMyinzWv') && !priceId.includes('SGfPIFk77knaVvaeBxPlhJ9')) {
    return { plan: 'practitioner', billing_cycle: 'yearly', monthly_credits: 30 }; // Changed from 60
  }
  
  // Pro plans (monthly)
  if (priceId === 'price_1SGfPIFk77knaVvaeBxPlhJ9' || priceId === 'price_1SGOrgFk77knaVvatu5ksh5y') {
    return { plan: 'pro', billing_cycle: 'monthly', monthly_credits: 60 }; // Changed from 120
  }
  
  // Pro plans (yearly)
  if (priceId.includes('SL6QFFk77knaVvarSHwZKou')) {
    return { plan: 'pro', billing_cycle: 'yearly', monthly_credits: 60 }; // Changed from 120
  }

  // Default fallback
  return { plan: 'practitioner', billing_cycle: 'monthly', monthly_credits: 30 }; // Changed from 60
}

// Helper function to allocate credits for a subscription
async function allocateCreditsForSubscription(
  userId: string,
  subscriptionId: string,
  stripeSubscriptionId: string,
  priceId: string | undefined,
  periodStart: number,
  periodEnd: number,
  allocationType: 'initial' | 'monthly' = 'initial'
): Promise<boolean> {
  try {
    console.log(`💰 Allocating ${allocationType} credits for subscription ${stripeSubscriptionId}...`);
    
    const { plan, monthly_credits } = getPlanAndCredits(priceId);
    
    // Get the subscription record from database
    const { data: dbSubscription } = await supabase
      .from('subscriptions')
      .select('id, monthly_credits')
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .single();

    if (!dbSubscription) {
      console.error(`❌ Subscription not found in database: ${stripeSubscriptionId}`);
      return false;
    }

    // Update monthly_credits if not set or incorrect
    if (!dbSubscription.monthly_credits || dbSubscription.monthly_credits !== monthly_credits) {
      console.log(`📝 Updating monthly_credits from ${dbSubscription.monthly_credits} to ${monthly_credits} for plan ${plan}`);
      await supabase
        .from('subscriptions')
        .update({ monthly_credits })
        .eq('id', dbSubscription.id);
    }

    // Call the RPC function to allocate credits
    const { error: allocError } = await supabase.rpc('allocate_monthly_credits', {
      p_user_id: userId,
      p_subscription_id: dbSubscription.id,
      p_amount: monthly_credits,
      p_allocation_type: allocationType,
      p_period_start: new Date(periodStart * 1000).toISOString(),
      p_period_end: new Date(periodEnd * 1000).toISOString()
    });

    if (allocError) {
      console.error("❌ Error allocating credits:", allocError);
      return false;
    }

    console.log(`✅ Credits allocated successfully: ${monthly_credits} credits (${allocationType} allocation)`);
    return true;
  } catch (error) {
    console.error("❌ Exception allocating credits:", error);
    return false;
  }
}

// Helper function to safely insert/upsert subscription
async function upsertSubscription(subscriptionData: any, eventType: string): Promise<boolean> {
  try {
    console.log(`💾 Upserting subscription (${eventType}):`, subscriptionData.stripe_subscription_id);
    
    // Ensure monthly_credits is always set correctly
    if (!subscriptionData.monthly_credits || subscriptionData.monthly_credits === 0) {
      const { plan, monthly_credits } = getPlanAndCredits(subscriptionData.price_id);
      subscriptionData.monthly_credits = monthly_credits;
      console.log(`📝 Ensuring monthly_credits is set to ${monthly_credits} for plan ${plan}`);
    }
    
    // Prevent duplicate active subscriptions: deactivate existing active subscriptions
    // This ensures users can only have one active subscription at a time
    if (subscriptionData.status === 'active' && subscriptionData.user_id) {
      const { data: existingActive, error: checkError } = await supabase
        .from('subscriptions')
        .select('id, stripe_subscription_id, plan')
        .eq('user_id', subscriptionData.user_id)
        .eq('status', 'active')
        .neq('stripe_subscription_id', subscriptionData.stripe_subscription_id || '');
      
      if (!checkError && existingActive && existingActive.length > 0) {
        console.log(`⚠️ Found ${existingActive.length} existing active subscription(s) for user ${subscriptionData.user_id}. Deactivating before activating new subscription.`);
        
        // Deactivate existing active subscriptions
        const { error: deactivateError } = await supabase
          .from('subscriptions')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', subscriptionData.user_id)
          .eq('status', 'active')
          .neq('stripe_subscription_id', subscriptionData.stripe_subscription_id || '');
        
        if (deactivateError) {
          console.error(`❌ Error deactivating existing subscriptions:`, deactivateError);
          // Continue anyway - the database trigger will handle it
        } else {
          console.log(`✅ Deactivated ${existingActive.length} existing active subscription(s)`);
        }
      }
    }
    
    const { error } = await supabase
      .from("subscriptions")
      .upsert(subscriptionData, { 
        onConflict: 'stripe_subscription_id',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error(`❌ Error upserting subscription (${eventType}):`, error);
      return false;
    }
    
    // Double-check: If upsert didn't update monthly_credits correctly, fix it
    const { data: updatedSub, error: checkError } = await supabase
      .from('subscriptions')
      .select('id, monthly_credits, plan, price_id')
      .eq('stripe_subscription_id', subscriptionData.stripe_subscription_id)
      .single();
    
    if (!checkError && updatedSub && (!updatedSub.monthly_credits || updatedSub.monthly_credits === 0)) {
      const { plan, monthly_credits } = getPlanAndCredits(updatedSub.price_id || subscriptionData.price_id);
      console.log(`🔧 Fixing monthly_credits for subscription ${subscriptionData.stripe_subscription_id} from ${updatedSub.monthly_credits} to ${monthly_credits}`);
      await supabase
        .from('subscriptions')
        .update({ monthly_credits })
        .eq('id', updatedSub.id);
    }
    
    console.log(`✅ Subscription upserted successfully (${eventType})`);
    return true;
  } catch (error) {
    console.error(`❌ Exception upserting subscription (${eventType}):`, error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests FIRST - this must be before any auth checks
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // IMPORTANT: For Stripe webhooks, we need to bypass Supabase auth
  // Stripe sends a stripe-signature header but no Supabase auth headers
  // The webhook secret verification is our authentication mechanism
  const stripeSignature = req.headers.get("stripe-signature");
  
  // If this is a Stripe webhook (has stripe-signature), process it directly
  // Otherwise, return 401 (this should not happen for properly configured webhooks)
  if (!stripeSignature && req.method === "POST") {
    console.error("❌ POST request without stripe-signature header - not a valid Stripe webhook");
    return new Response(JSON.stringify({ error: "Missing Stripe signature header" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  try {
    console.log("=== WEBHOOK RECEIVED (FIXED VERSION) ===");
    console.log("Method:", req.method);
    console.log("Headers:", Object.fromEntries(req.headers.entries()));
    
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    console.log("=== SIGNATURE VERIFICATION DEBUG ===");
    console.log("Signature exists:", !!signature);
    console.log("Webhook secret exists:", !!webhookSecret);
    console.log("Webhook secret length:", webhookSecret?.length);
    console.log("Webhook secret prefix:", webhookSecret?.substring(0, 15));
    console.log("Signature value:", signature);

    if (!signature || !webhookSecret) {
      console.error("❌ Missing signature or webhook secret");
      return new Response(JSON.stringify({ error: "Missing signature or webhook secret" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get the raw body - this is critical for signature verification
    const rawBody = await req.text();
    
    console.log("Body length:", rawBody.length);
    console.log("Body preview:", rawBody.substring(0, 300));

        // Verify webhook signature using the raw body
        let event: Stripe.Event;
        try {
          console.log("🔐 Attempting signature verification...");
          // Use constructEvent for webhook signature verification
          // Note: In Stripe v15, constructEvent is synchronous but works in Deno
          try {
            event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
          } catch (syncError) {
            // Fallback: try async version if available
            if (typeof stripe.webhooks.constructEventAsync === 'function') {
              event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
            } else {
              throw syncError;
            }
          }
          console.log("✅ ✅ ✅ SIGNATURE VERIFICATION SUCCESSFUL ✅ ✅ ✅");
          console.log("Event type:", event.type);
          console.log("Event ID:", event.id);
          console.log("Event livemode:", event.livemode);
        } catch (err) {
          console.error("❌ ❌ ❌ WEBHOOK SIGNATURE VERIFICATION FAILED ❌ ❌ ❌");
          console.error("Error type:", err.constructor.name);
          console.error("Error message:", err.message);
          console.error("Full error:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
          console.error("Signature header:", signature);
          console.error("Webhook secret (first 15 chars):", webhookSecret.substring(0, 15));
          console.error("Webhook secret length:", webhookSecret.length);
          console.error("Body length:", rawBody.length);
          console.error("Body preview (first 200):", rawBody.substring(0, 200));
          
          return new Response(JSON.stringify({ 
            error: "Invalid signature",
            details: err.message,
            webhook_secret_prefix: webhookSecret.substring(0, 10)
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

    console.log(`Processing webhook event: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        console.log("🛒 Processing checkout.session.completed");
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Session mode:", session.mode);
        console.log("Session metadata:", session.metadata);
        
        // Check if this is a marketplace booking (has application_fee_amount)
        if (session.payment_intent_data?.application_fee_amount || (session.payment_intent as string)) {
          console.log("🏪 Processing marketplace booking");
          
          const bookingData = {
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent,
            client_email: session.customer_email,
            amount_paid: session.amount_total || 0,
            platform_fee: session.payment_intent_data?.application_fee_amount || 0,
            practitioner_amount: (session.amount_total || 0) - (session.payment_intent_data?.application_fee_amount || 0),
            status: 'paid',
            booking_date: new Date().toISOString(),
            client_id: session.metadata?.client_user_id,
            practitioner_id: session.metadata?.practitioner_id,
            product_id: session.metadata?.product_id,
            product_name: session.metadata?.product_name,
            client_name: session.metadata?.client_name,
          };

          const { error } = await supabase
            .from('marketplace_bookings')
            .insert(bookingData);

          if (error) {
            console.error("❌ Error creating marketplace booking:", error);
          } else {
            console.log(`✅ Marketplace booking created for session ${session.id}`);
          }

          // Link payment to our payments table if present, mark as succeeded
          let payment = null;
          try {
            const { data: paymentData, error: paymentError } = await supabase
              .from('payments')
              .select('*')
              .eq('checkout_session_id', session.id)
              .single();
            
            if (!paymentError && paymentData) {
              await supabase
                .from('payments')
                .update({ payment_status: 'succeeded' })
                .eq('id', paymentData.id);
              payment = paymentData;
            }
          } catch (e) {
            console.warn('⚠️ Could not update payments by checkout_session_id', e);
          }

          // If this session was a client booking (session_id in metadata), confirm it now
          const clientSessionId = session.metadata?.session_id as string | undefined;
          
          if (clientSessionId && clientSessionId.trim() !== '') {
            console.log('📅 Confirming client session after payment:', clientSessionId);
            
            // Fetch session details for emails (including practitioner clinic address, therapist_type, and service_type)
            const { data: sessionData, error: sessionFetchError } = await supabase
              .from('client_sessions')
              .select(`
                *,
                client:users!client_sessions_client_id_fkey(id, first_name, last_name, email),
                practitioner:users!client_sessions_therapist_id_fkey(id, first_name, last_name, email, clinic_address, therapist_type),
                service:practitioner_products!client_sessions_service_id_fkey(service_type)
              `)
              .eq('id', clientSessionId)
              .single();

            if (sessionFetchError || !sessionData) {
              console.error('❌ Failed to fetch session data:', sessionFetchError);
              console.error('❌ session_id provided but session not found in database:', clientSessionId);
              // Don't send emails if session not found - this indicates a data integrity issue
            } else {
              // Update session status to confirmed (not scheduled)
              const { error: updErr } = await supabase
                .from('client_sessions')
                .update({
                  status: 'confirmed', // Changed from 'scheduled' to 'confirmed'
                  payment_status: 'completed',
                  updated_at: new Date().toISOString(),
                  expires_at: null
                })
                .eq('id', clientSessionId);
              
              if (updErr) {
                console.error('❌ Failed to mark client session confirmed:', updErr);
              } else {
                console.log('✅ Client session confirmed:', clientSessionId);
                
                // Create in-app notifications
                try {
                  const clientId = session.metadata?.client_user_id || sessionData.client_id;
                  const practitionerId = session.metadata?.practitioner_id || sessionData.therapist_id;
                  const serviceName = session.metadata?.product_name || session.metadata?.session_type || sessionData.session_type || 'Session';
                  const whenText = `${session.metadata?.session_date || sessionData.session_date || ''} ${session.metadata?.session_time || sessionData.start_time || ''}`.trim();
                  const sourceId = clientSessionId;

                  if (clientId) {
                    await supabase.rpc('create_notification', {
                      p_recipient_id: clientId,
                      p_type: 'booking_confirmed',
                      p_title: 'Booking confirmed',
                      p_body: `${serviceName} with your practitioner on ${whenText} is confirmed.`,
                      p_payload: {
                        session_id: clientSessionId,
                        practitioner_id: practitionerId,
                        when: whenText,
                      },
                      p_source_type: 'client_session',
                      p_source_id: sourceId,
                    });
                  }

                  if (practitionerId) {
                    await supabase.rpc('create_notification', {
                      p_recipient_id: practitionerId,
                      p_type: 'booking_confirmed',
                      p_title: 'New booking confirmed',
                      p_body: `${serviceName} with a client on ${whenText} is confirmed.`,
                      p_payload: {
                        session_id: clientSessionId,
                        client_id: clientId,
                        when: whenText,
                      },
                      p_source_type: 'client_session',
                      p_source_id: sourceId,
                    });
                  }
                } catch (nErr) {
                  console.warn('⚠️ Failed to emit notifications:', nErr);
                }

                // Send booking confirmation and payment confirmation emails
                try {
                  const baseUrl = Deno.env.get('SITE_URL') || 'https://theramate.co.uk';
                  const clientName = sessionData.client 
                    ? `${sessionData.client.first_name || ''} ${sessionData.client.last_name || ''}`.trim() 
                    : session.metadata?.client_name || 'Client';
                  // Get client email from multiple sources (supports both authenticated and guest bookings)
                  const clientEmail = sessionData.client?.email 
                    || sessionData.client_email  // For guest bookings, email is stored in client_email field
                    || session.metadata?.client_email 
                    || session.customer_email;
                  const practitionerName = sessionData.practitioner
                    ? `${sessionData.practitioner.first_name || ''} ${sessionData.practitioner.last_name || ''}`.trim()
                    : 'Practitioner';
                  const practitionerEmail = sessionData.practitioner?.email;

                  // Send booking confirmation to client
                  if (clientEmail) {
                    const sessionDate = sessionData.session_date || session.metadata?.session_date;
                    const sessionTime = sessionData.start_time || session.metadata?.session_time;
                    const sessionDuration = sessionData.duration_minutes || 60;
                    // Get location from session location, practitioner clinic_address, or empty string
                    const sessionLocation = sessionData.location || 
                                          (sessionData.practitioner as any)?.clinic_address || 
                                          '';
                    const sessionType = sessionData.session_type || serviceName;
                    // Check if client has an account (for account creation flow in email)
                    const clientHasAccount = !!sessionData.client_id && !!sessionData.client;
                    
                    // Generate calendar URL
                    const calendarUrl = sessionDate && sessionTime
                      ? generateCalendarUrl(
                          `${sessionType} with ${practitionerName}`,
                          `Session: ${sessionType}\\nPractitioner: ${practitionerName}\\nDuration: ${sessionDuration} minutes`,
                          sessionDate,
                          sessionTime,
                          sessionDuration,
                          sessionLocation
                        )
                      : '#';
                    
                    try {
                      const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-email', {
                      headers: {
                        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                      },
                      body: {
                        emailType: 'booking_confirmation_client',
                        recipientEmail: clientEmail,
                        recipientName: clientName,
                        data: {
                          sessionId: clientSessionId,
                          sessionType: sessionType,
                          sessionDate: sessionDate,
                          sessionTime: sessionTime,
                          sessionPrice: sessionData.price || session.amount_total ? (session.amount_total / 100) : 0,
                          sessionDuration: sessionDuration,
                          sessionLocation: sessionLocation,
                          practitionerName: practitionerName,
                          therapistType: (sessionData.practitioner as any)?.therapist_type || undefined,
                          serviceType: (sessionData.service as any)?.service_type || undefined,
                          clientHasAccount: clientHasAccount,
                          clientEmail: clientEmail,
                          bookingUrl: `${baseUrl}/client/sessions`,
                          calendarUrl: calendarUrl,
                          messageUrl: `${baseUrl}/messages`,
                        }
                      }
                      });

                      if (emailError) {
                        console.error(`[CRITICAL] Failed to send booking_confirmation_client to ${clientEmail}:`, emailError);
                      } else if (emailResponse && !emailResponse.success) {
                        console.error(`[CRITICAL] Email send returned failure for booking_confirmation_client to ${clientEmail}:`, emailResponse.error || emailResponse.details);
                      } else if (emailResponse?.success) {
                        console.log(`[SUCCESS] Booking confirmation email sent to client ${clientEmail} (ID: ${emailResponse.emailId})`);
                      }
                    } catch (emailErr) {
                      console.error(`[CRITICAL] Exception sending booking_confirmation_client to ${clientEmail}:`, emailErr);
                    }
                  }

                  // Get payment details for combined email
                  const paymentId = session.metadata?.payment_id || payment?.id;
                  let paymentData = null;
                  let platformFee = 0;
                  let practitionerAmount = 0;
                  
                  if (paymentId) {
                    const { data: paymentDataResult } = await supabase
                      .from('payments')
                      .select('*')
                      .eq('id', paymentId)
                      .single();
                    
                    paymentData = paymentDataResult;
                    
                    if (paymentData) {
                      platformFee = session.payment_intent_data?.application_fee_amount 
                        ? (session.payment_intent_data.application_fee_amount / 100) 
                        : (session.amount_total ? (session.amount_total / 100) * 0.005 : 0);
                      practitionerAmount = session.amount_total 
                        ? ((session.amount_total / 100) - platformFee) 
                        : (paymentData.amount ? (paymentData.amount / 100) - platformFee : 0);
                    }
                  }

                  // Send COMBINED booking + payment confirmation to client (ONE EMAIL)
                  if (clientEmail) {
                    try {
                      const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-email', {
                      headers: {
                        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                      },
                      body: {
                        emailType: 'booking_confirmation_client',
                        recipientEmail: clientEmail,
                        recipientName: clientName,
                        data: {
                          sessionId: clientSessionId,
                          sessionType: sessionType,
                          sessionDate: sessionDate,
                          sessionTime: sessionTime,
                          sessionPrice: sessionData.price || session.amount_total ? (session.amount_total / 100) : 0,
                          sessionDuration: sessionDuration,
                          sessionLocation: sessionLocation,
                          practitionerName: practitionerName,
                          therapistType: (sessionData.practitioner as any)?.therapist_type || undefined,
                          serviceType: (sessionData.service as any)?.service_type || undefined,
                          clientHasAccount: clientHasAccount,
                          clientEmail: clientEmail,
                          bookingUrl: `${baseUrl}/client/sessions`,
                          calendarUrl: calendarUrl,
                          messageUrl: `${baseUrl}/messages`,
                          // Include payment details in combined email
                          paymentAmount: paymentData ? (paymentData.amount / 100) : (session.amount_total / 100),
                          paymentId: paymentId || '',
                          cancellationPolicySummary: data.cancellationPolicySummary
                        }
                      }
                      });

                      if (emailError) {
                        console.error(`[CRITICAL] Failed to send combined booking_confirmation_client to ${clientEmail}:`, emailError);
                      } else if (emailResponse && !emailResponse.success) {
                        console.error(`[CRITICAL] Email send returned failure for booking_confirmation_client to ${clientEmail}:`, emailResponse.error || emailResponse.details);
                      } else if (emailResponse?.success) {
                        console.log(`[SUCCESS] Combined booking & payment confirmation email sent to client ${clientEmail} (ID: ${emailResponse.emailId})`);
                      }
                    } catch (emailErr) {
                      console.error(`[CRITICAL] Exception sending booking_confirmation_client to ${clientEmail}:`, emailErr);
                    }
                  }

                  // Send COMBINED booking + payment confirmation to practitioner (ONE EMAIL)
                  if (practitionerEmail) {
                    try {
                      const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-email', {
                      headers: {
                        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                      },
                      body: {
                        emailType: 'booking_confirmation_practitioner',
                        recipientEmail: practitionerEmail,
                        recipientName: practitionerName,
                        data: {
                          sessionId: clientSessionId,
                          sessionType: sessionData.session_type || serviceName,
                          sessionDate: sessionData.session_date || session.metadata?.session_date,
                          sessionTime: sessionData.start_time || session.metadata?.session_time,
                          sessionPrice: sessionData.price || session.amount_total ? (session.amount_total / 100) : 0,
                          sessionDuration: sessionData.duration_minutes || 60,
                          clientName: clientName,
                          clientEmail: clientEmail,
                          paymentStatus: 'completed',
                          bookingUrl: `${baseUrl}/practice/sessions/${clientSessionId}`,
                          messageUrl: `${baseUrl}/messages`,
                          // Include payment details in combined email
                          paymentAmount: paymentData ? (paymentData.amount / 100) : (session.amount_total / 100),
                          platformFee: platformFee,
                          practitionerAmount: practitionerAmount,
                          paymentId: paymentId || ''
                        }
                      }
                      });

                      if (emailError) {
                        console.error(`[CRITICAL] Failed to send combined booking_confirmation_practitioner to ${practitionerEmail}:`, emailError);
                      } else if (emailResponse && !emailResponse.success) {
                        console.error(`[CRITICAL] Email send returned failure for booking_confirmation_practitioner to ${practitionerEmail}:`, emailResponse.error || emailResponse.details);
                      } else if (emailResponse?.success) {
                        console.log(`[SUCCESS] Combined booking & payment confirmation email sent to practitioner ${practitionerEmail} (ID: ${emailResponse.emailId})`);
                      }
                    } catch (emailErr) {
                      console.error(`[CRITICAL] Exception sending booking_confirmation_practitioner to ${practitionerEmail}:`, emailErr);
                    }
                  }

                  console.log('✅ Booking and payment confirmation emails sent');
                } catch (emailErr) {
                  console.error('⚠️ Failed to send confirmation emails:', emailErr);
                  // Don't fail the webhook - emails are non-critical
                }

                // Create conversation between client and practitioner
                try {
                  const clientId = session.metadata?.client_user_id || sessionData.client_id;
                  const practitionerId = session.metadata?.practitioner_id || sessionData.therapist_id;
                  
                  if (clientId && practitionerId) {
                    // Get or create conversation using RPC function
                    const { data: conversationId, error: convError } = await supabase
                      .rpc('get_or_create_conversation', {
                        p_user1_id: clientId,
                        p_user2_id: practitionerId
                      });

                    if (convError) {
                      console.error('⚠️ Failed to create conversation:', convError);
                    } else if (conversationId) {
                      console.log('✅ Conversation created/retrieved:', conversationId);
                      
                      // Send automated welcome message
                      const sessionDate = sessionData.session_date || session.metadata?.session_date || '';
                      const sessionTime = sessionData.start_time || session.metadata?.session_time || '';
                      const sessionType = sessionData.session_type || session.metadata?.session_type || 'Session';
                      
                      // Format date for message
                      const formattedDate = sessionDate ? new Date(sessionDate).toLocaleDateString() : '';
                      
                      const welcomeMessage = `Your ${sessionType} session on ${formattedDate} at ${sessionTime} has been confirmed. Feel free to message your practitioner with any questions!`;
                      
                      // Send system message
                      const { error: messageError } = await supabase
                        .from('messages')
                        .insert({
                          conversation_id: conversationId,
                          sender_id: practitionerId, // System message from practitioner perspective
                          content: welcomeMessage,
                          message_type: 'system'
                        });

                      if (messageError) {
                        console.error('⚠️ Failed to send welcome message:', messageError);
                      } else {
                        console.log('✅ Welcome message sent to conversation');
                      }
                    }
                  }
                } catch (convErr) {
                  console.error('⚠️ Failed to create conversation:', convErr);
                  // Don't fail the webhook - conversation creation is non-critical
                }

                // Schedule session reminders
                try {
                  const sessionDate = sessionData.session_date;
                  const sessionTime = sessionData.start_time;
                  
                  if (sessionDate && sessionTime) {
                    const sessionDateTime = new Date(`${sessionDate}T${sessionTime}`);
                    const now = new Date();

                    // Schedule reminders at 24 hours, 2 hours, and 1 hour before
                    const reminders = [
                      {
                        session_id: clientSessionId,
                        reminder_type: 'email',
                        reminder_time: new Date(sessionDateTime.getTime() - 24 * 60 * 60 * 1000).toISOString(),
                        message: 'Your session is tomorrow',
                        status: 'pending'
                      },
                      {
                        session_id: clientSessionId,
                        reminder_type: 'email',
                        reminder_time: new Date(sessionDateTime.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                        message: 'Your session starts in 2 hours',
                        status: 'pending'
                      },
                      {
                        session_id: clientSessionId,
                        reminder_type: 'email',
                        reminder_time: new Date(sessionDateTime.getTime() - 60 * 60 * 1000).toISOString(),
                        message: 'Your session starts in 1 hour',
                        status: 'pending'
                      }
                    ];

                    // Only schedule future reminders
                    const futureReminders = reminders.filter(r => new Date(r.reminder_time) > now);

                    if (futureReminders.length > 0) {
                      // Check for existing reminders to prevent duplicates
                      const { data: existingReminders } = await supabase
                        .from('reminders')
                        .select('reminder_time')
                        .eq('session_id', clientSessionId)
                        .in('status', ['pending', 'sent']);

                      const existingTimes = new Set(
                        (existingReminders || []).map(r => r.reminder_time)
                      );

                      // Filter out reminders that already exist
                      const newReminders = futureReminders.filter(
                        r => !existingTimes.has(r.reminder_time)
                      );

                      if (newReminders.length > 0) {
                        const { error: reminderError } = await supabase
                          .from('reminders')
                          .insert(newReminders);

                        if (reminderError) {
                          console.error('⚠️ Failed to schedule reminders:', reminderError);
                        } else {
                          console.log(`✅ Scheduled ${newReminders.length} session reminders`);
                        }
                      } else {
                        console.log('✅ All reminders already scheduled for this session');
                      }
                    }
                  }
                } catch (reminderErr) {
                  console.error('⚠️ Failed to schedule reminders:', reminderErr);
                  // Don't fail the webhook - reminder scheduling is non-critical
                }
              }
            }
          }
          
          return new Response(JSON.stringify({ 
            received: true, 
            message: "Marketplace booking processed successfully",
            session_id: session.id
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        
        if (session.mode === "subscription") {
          console.log("📋 Retrieving subscription details...");
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          console.log("Subscription ID:", subscription.id);
          console.log("Subscription status:", subscription.status);
          
          // Use robust user_id retrieval with multiple fallback methods
          const userId = await retrieveUserId("checkout.session.completed", session);
          
          if (!userId) {
            console.error("❌ CRITICAL: Could not retrieve user_id after all fallback methods");
            console.error("Session metadata:", JSON.stringify(session.metadata, null, 2));
            console.error("Session customer:", session.customer);
            console.error("Subscription ID:", subscription.id);
            
            // CRITICAL: Don't skip - try to find user_id from subscription metadata
            let recoveredUserId = subscription.metadata?.user_id || subscription.metadata?.supabase_user_id;
            
            if (!recoveredUserId && subscription.customer) {
              try {
                const customer = await stripe.customers.retrieve(subscription.customer as string);
                if (customer && !customer.deleted) {
                  recoveredUserId = customer.metadata?.user_id || customer.metadata?.supabase_user_id;
                  console.log("✅ Recovered user_id from customer metadata:", recoveredUserId);
                }
              } catch (error) {
                console.error("❌ Error retrieving customer:", error);
              }
            }
            
            if (!recoveredUserId) {
              console.error("❌ FATAL: No user_id found anywhere - subscription will NOT be created");
              return new Response(JSON.stringify({ 
                received: true, 
                error: "Could not retrieve user_id, subscription NOT created",
                event_type: "checkout.session.completed",
                subscription_id: subscription.id,
                session_id: session.id
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400, // Return 400 to signal error to Stripe
              });
            }
            
            // Use recovered user_id
            userId = recoveredUserId;
            console.log("✅ Using recovered user_id:", userId);
          }

          // Determine plan and credits from price_id
          const priceId = subscription.items.data[0]?.price.id;
          const { plan, billing_cycle, monthly_credits } = getPlanAndCredits(priceId);
          
          // Prepare subscription data for upsert
          const subscriptionData = {
            user_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            status: subscription.status,
            plan: plan,
            billing_cycle: billing_cycle,
            price_id: priceId,
            quantity: subscription.items.data[0]?.quantity || 1,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            monthly_credits: monthly_credits,
            updated_at: new Date().toISOString(),
          };

          // Upsert subscription (handles duplicates gracefully)
          const subscriptionSuccess = await upsertSubscription(subscriptionData, "checkout.session.completed");
          
          // ALLOCATE CREDITS IMMEDIATELY after subscription is created (with idempotency check)
          if (subscriptionSuccess && userId) {
            // Get the database subscription ID for idempotency check
            const { data: dbSubscription, error: subError } = await supabase
              .from('subscriptions')
              .select('id')
              .eq('stripe_subscription_id', subscription.id)
              .single();
            
            if (subError || !dbSubscription) {
              console.error(`❌ Could not find database subscription for Stripe subscription ${subscription.id}:`, subError);
            } else {
              // Check if allocation already exists for this subscription period (idempotency)
              const periodStart = new Date(subscription.current_period_start * 1000).toISOString();
              const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
              
              const { data: existingAllocation } = await supabase
                .from('credit_allocations')
                .select('id')
                .eq('subscription_id', dbSubscription.id) // Use database subscription ID, not Stripe ID
                .gte('allocated_at', periodStart)
                .lte('allocated_at', periodEnd)
                .maybeSingle();
              
              if (!existingAllocation) {
                console.log(`💰 Allocating initial credits for subscription ${subscription.id} (DB ID: ${dbSubscription.id})`);
                const allocSuccess = await allocateCreditsForSubscription(
                  userId,
                  dbSubscription.id, // Pass database subscription ID
                  subscription.id, // Pass Stripe subscription ID
                  priceId,
                  subscription.current_period_start,
                  subscription.current_period_end,
                  'initial'
                );
                if (!allocSuccess) {
                  console.error(`❌ Failed to allocate credits for subscription ${subscription.id}`);
                }
              } else {
                console.log(`ℹ️ Credits already allocated for subscription ${subscription.id} (allocation ID: ${existingAllocation.id})`);
              }
            }
          }
          
          // Update user onboarding status (attempt regardless of subscription success)
          const onboardingSuccess = await updateUserOnboardingStatus(userId, "checkout.session.completed");
          
          // Return success response with processing details
          return new Response(JSON.stringify({ 
            received: true, 
            message: "checkout.session.completed processed successfully",
            subscription_processed: subscriptionSuccess,
            onboarding_updated: onboardingSuccess,
            user_id: userId,
            subscription_id: subscription.id
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
          
        } else {
          console.log("⚠️ Session mode is not subscription, skipping");
          return new Response(JSON.stringify({ 
            received: true, 
            message: "Non-subscription session, skipping",
            session_mode: session.mode
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }

      case "customer.subscription.created": {
        console.log("🆕 Processing customer.subscription.created");
        const subscription = event.data.object as Stripe.Subscription;
        console.log("Subscription ID:", subscription.id);
        console.log("Subscription status:", subscription.status);
        console.log("Customer ID:", subscription.customer);
        
        // Use robust user_id retrieval with multiple fallback methods
        let userId = await retrieveUserId("customer.subscription.created", subscription);
        
        if (!userId) {
          console.error("❌ CRITICAL: Could not retrieve user_id after all fallback methods");
          console.error("Subscription metadata:", JSON.stringify(subscription.metadata, null, 2));
          console.error("Subscription customer:", subscription.customer);
          
          // CRITICAL: Try to recover user_id from customer metadata
          if (subscription.customer) {
            try {
              const customer = await stripe.customers.retrieve(subscription.customer as string);
              if (customer && !customer.deleted) {
                userId = customer.metadata?.user_id || customer.metadata?.supabase_user_id;
                console.log("✅ Recovered user_id from customer metadata:", userId);
              }
            } catch (error) {
              console.error("❌ Error retrieving customer:", error);
            }
          }
          
          if (!userId) {
            console.error("❌ FATAL: No user_id found - subscription will NOT be created");
            return new Response(JSON.stringify({ 
              received: true, 
              error: "Could not retrieve user_id, subscription NOT created",
              event_type: "customer.subscription.created",
              subscription_id: subscription.id
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400, // Return 400 to signal error to Stripe
            });
          }
        }
        
        // Determine plan and credits from price_id
        const priceId = subscription.items.data[0]?.price.id;
        const { plan, billing_cycle, monthly_credits } = getPlanAndCredits(priceId);
        
        // Prepare subscription data for upsert with safe date conversion
        const subscriptionData = {
          user_id: userId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          status: subscription.status,
          plan: plan,
          billing_cycle: billing_cycle,
          price_id: priceId,
          quantity: subscription.items.data[0]?.quantity || 1,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_start: subscription.current_period_start 
            ? new Date(subscription.current_period_start * 1000).toISOString()
            : new Date().toISOString(),
          current_period_end: subscription.current_period_end 
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : new Date().toISOString(),
          monthly_credits: monthly_credits,
          updated_at: new Date().toISOString(),
        };

        // Upsert subscription (handles duplicates gracefully)
        const subscriptionSuccess = await upsertSubscription(subscriptionData, "customer.subscription.created");
        
        // ALLOCATE CREDITS IMMEDIATELY after subscription is created
        if (subscriptionSuccess && userId) {
          // Get the database subscription ID
          const { data: dbSubscription, error: subError } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('stripe_subscription_id', subscription.id)
            .single();
          
          if (subError || !dbSubscription) {
            console.error(`❌ Could not find database subscription for Stripe subscription ${subscription.id}:`, subError);
          } else {
            // Check if allocation already exists (idempotency)
            const periodStart = new Date(subscription.current_period_start * 1000).toISOString();
            const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
            
            const { data: existingAllocation } = await supabase
              .from('credit_allocations')
              .select('id')
              .eq('subscription_id', dbSubscription.id)
              .gte('allocated_at', periodStart)
              .lte('allocated_at', periodEnd)
              .maybeSingle();
            
            if (!existingAllocation) {
              console.log(`💰 Allocating initial credits for subscription ${subscription.id} (DB ID: ${dbSubscription.id})`);
              const allocSuccess = await allocateCreditsForSubscription(
                userId,
                dbSubscription.id, // Pass database subscription ID
                subscription.id, // Pass Stripe subscription ID
                priceId,
                subscription.current_period_start,
                subscription.current_period_end,
                'initial'
              );
              if (!allocSuccess) {
                console.error(`❌ Failed to allocate credits for subscription ${subscription.id}`);
              }
            } else {
              console.log(`ℹ️ Credits already allocated for subscription ${subscription.id} (allocation ID: ${existingAllocation.id})`);
            }
          }
        }
        
        // Update user onboarding status (attempt regardless of subscription success)
        const onboardingSuccess = await updateUserOnboardingStatus(userId, "customer.subscription.created");
        
        // Return success response with processing details
        return new Response(JSON.stringify({ 
          received: true, 
          message: "customer.subscription.created processed successfully",
          subscription_processed: subscriptionSuccess,
          onboarding_updated: onboardingSuccess,
          user_id: userId,
          subscription_id: subscription.id
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "customer.subscription.updated": {
        console.log("🔄 Processing customer.subscription.updated");
        const subscription = event.data.object as Stripe.Subscription;
        console.log("Subscription ID:", subscription.id);
        console.log("New status:", subscription.status);
        
        // Map Stripe status to database-compatible status
        // Database CHECK constraint only allows: 'active', 'cancelled', 'past_due', 'unpaid'
        // Stripe can return: 'active', 'past_due', 'canceled', 'unpaid', 'trialing', 'incomplete', 'incomplete_expired', 'paused'
        let dbStatus = subscription.status;
        if (dbStatus === 'trialing' || dbStatus === 'incomplete') {
          // Map trialing/incomplete to 'active' for database compatibility
          dbStatus = 'active';
        } else if (dbStatus === 'canceled' || dbStatus === 'cancelled') {
          dbStatus = 'cancelled'; // Normalize to database format
        } else if (dbStatus === 'incomplete_expired' || dbStatus === 'paused') {
          dbStatus = 'unpaid'; // Treat as unpaid
        } else if (!['active', 'cancelled', 'past_due', 'unpaid'].includes(dbStatus)) {
          console.warn(`⚠️ Unexpected Stripe status: ${dbStatus}, defaulting to 'active'`);
          dbStatus = 'active'; // Default fallback
        }
        
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: dbStatus,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_start: subscription.current_period_start 
              ? new Date(subscription.current_period_start * 1000).toISOString()
              : new Date().toISOString(),
            current_period_end: subscription.current_period_end 
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("❌ Error updating subscription:", error);
        } else {
          console.log(`✅ Subscription ${subscription.id} updated to ${subscription.status}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        console.log("🗑️ Processing customer.subscription.deleted");
        const subscription = event.data.object as Stripe.Subscription;
        console.log("Subscription ID:", subscription.id);
        
        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            ended_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) {
          console.error("❌ Error canceling subscription:", error);
        } else {
          console.log(`✅ Subscription ${subscription.id} marked as canceled`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        console.log("💰 Processing invoice.payment_succeeded");
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Invoice ID:", invoice.id);
        console.log("Subscription ID:", invoice.subscription);
        
        if (invoice.subscription) {
          // Retrieve subscription from Stripe to get current period dates
          let subscription: Stripe.Subscription | null = null;
          try {
            subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          } catch (error) {
            console.error("❌ Error retrieving subscription from Stripe:", error);
          }

          // Get existing subscription to determine monthly_credits if subscription retrieval fails
          const { data: existingSub } = await supabase
            .from("subscriptions")
            .select('price_id, monthly_credits, plan')
            .eq("stripe_subscription_id", invoice.subscription)
            .single();

          // Determine plan and credits from price_id (prefer from Stripe, fallback to DB)
          const priceId = subscription?.items.data[0]?.price.id || existingSub?.price_id;
          const { plan, monthly_credits } = getPlanAndCredits(priceId);
          
          // Update subscription status and period
          const updateData: any = {
            status: "active",
            updated_at: new Date().toISOString(),
            // Ensure monthly_credits is always set correctly
            monthly_credits: monthly_credits,
          };
          
          if (subscription) {
            updateData.current_period_start = new Date(subscription.current_period_start * 1000).toISOString();
            updateData.current_period_end = new Date(subscription.current_period_end * 1000).toISOString();
          }

          const { data: updatedSub, error: updateError } = await supabase
            .from("subscriptions")
            .update(updateData)
            .eq("stripe_subscription_id", invoice.subscription)
            .select('id, user_id, price_id, monthly_credits')
            .single();

          if (updateError) {
            console.error("❌ Error updating subscription status:", updateError);
          } else if (updatedSub && subscription) {
            console.log(`✅ Subscription ${invoice.subscription} status updated to active`);
            
            // ALLOCATE MONTHLY CREDITS on renewal
            // Check if allocation already exists for this period (idempotency check)
            const periodStart = new Date(subscription.current_period_start * 1000).toISOString();
            const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
            
            const { data: existingAllocation } = await supabase
              .from('credit_allocations')
              .select('id, allocated_at')
              .eq('subscription_id', updatedSub.id) // Use database subscription ID
              .gte('allocated_at', periodStart)
              .lte('allocated_at', periodEnd)
              .maybeSingle();
            
            if (existingAllocation) {
              console.log(`ℹ️ Credits already allocated for this period (allocation ID: ${existingAllocation.id})`);
            } else {
              // Check when credits were last allocated (backup check)
              const { data: lastAllocation } = await supabase
                .from('credit_allocations')
                .select('allocated_at')
                .eq('subscription_id', updatedSub.id)
                .order('allocated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              
              const now = new Date();
              const lastAllocDate = lastAllocation?.allocated_at ? new Date(lastAllocation.allocated_at) : null;
              const daysSinceAllocation = lastAllocDate 
                ? (now.getTime() - lastAllocDate.getTime()) / (1000 * 60 * 60 * 24)
                : 999; // If no previous allocation, allocate now
              
              // Allocate if no previous allocation or more than 25 days have passed
              if (daysSinceAllocation > 25 && updatedSub.user_id) {
                console.log(`💰 Allocating monthly credits on renewal (${daysSinceAllocation.toFixed(1)} days since last allocation)`);
                const allocSuccess = await allocateCreditsForSubscription(
                  updatedSub.user_id,
                  updatedSub.id, // Pass database subscription ID
                  invoice.subscription as string, // Pass Stripe subscription ID
                  priceId,
                  subscription.current_period_start,
                  subscription.current_period_end,
                  'monthly'
                );
                if (!allocSuccess) {
                  console.error(`❌ Failed to allocate monthly credits for subscription ${invoice.subscription}`);
                }
              } else {
                console.log(`ℹ️ Skipping credit allocation - ${daysSinceAllocation.toFixed(1)} days since last allocation (threshold: 25 days)`);
              }
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        console.log("💸 Processing invoice.payment_failed");
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Invoice ID:", invoice.id);
        console.log("Subscription ID:", invoice.subscription);
        
        if (invoice.subscription) {
          const { error } = await supabase
            .from("subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", invoice.subscription);

          if (error) {
            console.error("❌ Error updating subscription status:", error);
          } else {
            console.log(`✅ Subscription ${invoice.subscription} status updated to past_due`);
          }
        }
        break;
      }


      case "payment_intent.succeeded": {
        console.log("💰 Processing payment_intent.succeeded (marketplace)");
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Check if this is a marketplace payment (has application_fee_amount)
        if (paymentIntent.application_fee_amount) {
          console.log("🏪 Processing marketplace payment");
          
          // Get booking details to find practitioner
          const checkoutSessionId = paymentIntent.metadata?.checkout_session_id;
          let practitionerId: string | null = null;
          
          if (checkoutSessionId) {
            // Get booking to find practitioner
            const { data: booking } = await supabase
              .from('marketplace_bookings')
              .select('practitioner_id, id')
              .eq('stripe_checkout_session_id', checkoutSessionId)
              .single();
            
            if (booking) {
              practitionerId = booking.practitioner_id;
            }
          }
          
          // Fallback: Try to get from metadata
          if (!practitionerId) {
            practitionerId = paymentIntent.metadata?.practitioner_id || paymentIntent.metadata?.therapist_id || null;
          }
          
          // Update booking with payment intent ID and charge ID
          const { error } = await supabase
            .from('marketplace_bookings')
            .update({
              stripe_payment_intent_id: paymentIntent.id,
              stripe_charge_id: paymentIntent.charges.data[0]?.id,
              status: 'paid',
            })
            .eq('stripe_checkout_session_id', checkoutSessionId || paymentIntent.metadata?.checkout_session_id);

          if (error) {
            console.error("❌ Error updating marketplace booking:", error);
          } else {
            console.log(`✅ Marketplace booking updated for payment ${paymentIntent.id}`);
            
            // Notify practitioner of payment received
            if (practitionerId) {
              const amountInPounds = (paymentIntent.amount / 100).toFixed(2);
              const currency = paymentIntent.currency.toUpperCase();
              
              try {
                const { error: notifyError } = await supabase.rpc('create_notification', {
                  p_recipient_id: practitionerId,
                  p_type: 'payment_received',
                  p_title: 'Payment Received',
                  p_body: `You received £${amountInPounds} ${currency} for a booking. Payment will arrive in your bank within 2-7 business days.`,
                  p_payload: {
                    payment_intent_id: paymentIntent.id,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency,
                    booking_id: checkoutSessionId
                  },
                  p_source_type: 'payment',
                  p_source_id: paymentIntent.id
                });
                
                if (notifyError) {
                  console.error("❌ Error creating payment notification:", notifyError);
                } else {
                  console.log(`✅ Payment notification sent to practitioner ${practitionerId}`);
                }
              } catch (notifyErr) {
                console.error("❌ Exception creating payment notification:", notifyErr);
              }
            } else {
              console.warn("⚠️ Could not find practitioner_id for payment notification");
            }
          }
        }
        break;
      }

      case "account.updated": {
        console.log("🏢 Processing account.updated (Connect v1)");
        const account = event.data.object as Stripe.Account;
        
        // Update connect_accounts table (source of truth)
        const { error: connectError } = await supabase
          .from('connect_accounts')
          .update({
            account_status: account.charges_enabled && account.payouts_enabled && account.details_submitted ? 'active' : 'pending',
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_account_id', account.id);

        if (connectError) {
          console.error("❌ Error updating connect_accounts:", connectError);
        } else {
          console.log(`✅ Connect account updated: ${account.id}`);
        }

        // Trigger will automatically sync users.stripe_connect_account_id via database trigger
        // But ensure it's set if missing (safety net)
        const { error: userError } = await supabase
          .from('users')
          .update({
            stripe_connect_account_id: account.id,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_connect_account_id', account.id);

        if (userError) {
          console.error("❌ Error updating users table:", userError);
        } else {
          console.log(`✅ Users table synced: ${account.id}`);
        }
        break;
      }

      case "v2.core.account.updated": {
        console.log("🏢 Processing v2.core.account.updated (Connect v2 - Fully Embedded)");
        const account = event.data.object as any; // Accounts v2 object structure
        
        // Accounts v2 uses different structure - need to retrieve via v1 API for details_submitted
        try {
          const v1Account = await stripe.accounts.retrieve(account.id);
          
          // Update connect_accounts table
          const { error: connectError } = await supabase
            .from('connect_accounts')
            .update({
              account_status: v1Account.charges_enabled && v1Account.payouts_enabled && v1Account.details_submitted ? 'active' : 'pending',
              charges_enabled: v1Account.charges_enabled,
              payouts_enabled: v1Account.payouts_enabled,
              details_submitted: v1Account.details_submitted,
              updated_at: new Date().toISOString()
            })
            .eq('stripe_account_id', account.id);
          
          if (connectError) {
            console.error("❌ Error updating connect_accounts (v2):", connectError);
          } else {
            console.log(`✅ Connect v2 account updated: ${account.id}`);
          }
        } catch (error: any) {
          console.error("❌ Error retrieving v1 account for v2 update:", error.message);
        }
        break;
      }

      case "v2.core.account[configuration.merchant].capability_status_updated": {
        console.log("💳 Processing merchant capability status update (Fully Embedded)");
        const capability = event.data.object as any;
        
        // Check if card_payments is now enabled
        if (capability.updated_capability === 'card_payments' && capability.status === 'active') {
          // Update connect_accounts to mark charges_enabled
          const { error } = await supabase
            .from('connect_accounts')
            .update({
              charges_enabled: true,
              account_status: 'active', // Update status if both charges and payouts are enabled
              updated_at: new Date().toISOString()
            })
            .eq('stripe_account_id', capability.account);
          
          if (error) {
            console.error("❌ Error updating charges_enabled:", error);
          } else {
            console.log(`✅ Charges enabled for account: ${capability.account}`);
          }
        }
        break;
      }

      case "v2.core.account[configuration.recipient].capability_status_updated": {
        console.log("💰 Processing recipient capability status update (Fully Embedded)");
        const capability = event.data.object as any;
        
        // Check if stripe_balance.stripe_transfers is now enabled
        if (capability.updated_capability === 'stripe_balance.stripe_transfers' && capability.status === 'active') {
          // Update connect_accounts to mark payouts_enabled
          const { error } = await supabase
            .from('connect_accounts')
            .update({
              payouts_enabled: true,
              account_status: 'active', // Update status if both charges and payouts are enabled
              updated_at: new Date().toISOString()
            })
            .eq('stripe_account_id', capability.account);
          
          if (error) {
            console.error("❌ Error updating payouts_enabled:", error);
          } else {
            console.log(`✅ Payouts enabled for account: ${capability.account}`);
          }
        }
        break;
      }

      case "account.application.deauthorized": {
        console.log("🚫 Processing account.application.deauthorized (Account Disconnected)");
        const account = event.data.object as Stripe.Account;
        
        // Mark account as disabled when disconnected
        const { error } = await supabase
          .from('connect_accounts')
          .update({
            account_status: 'disabled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_account_id', account.id);
        
        if (error) {
          console.error("❌ Error marking account as disabled:", error);
        } else {
          console.log(`✅ Account marked as disabled: ${account.id}`);
        }
        break;
      }

      case "account.application.authorized": {
        console.log("✅ Processing account.application.authorized (Account Connected)");
        const account = event.data.object as Stripe.Account;
        
        // Account was just authorized - ensure it's tracked
        // This is usually handled by account.updated, but good to have as backup
        console.log(`✅ Account authorized: ${account.id}`);
        break;
      }

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ 
      error: "Webhook processing failed",
      details: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});