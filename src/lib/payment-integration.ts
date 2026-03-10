/**
 * Complete Payment Integration System
 * Handles all payment flows with proper error handling and confirmation
 */

import { supabase } from '@/integrations/supabase/client';
import { NotificationSystem } from '@/lib/notification-system';
import { toast } from 'sonner';

export interface PaymentRequest {
  sessionId: string;
  practitionerId: string;
  clientId: string;
  amount: number; // in pence
  currency: string;
  description: string;
  clientEmail?: string;
  clientName?: string;
  practitionerName?: string;
  sessionDate?: string;
  sessionTime?: string;
  sessionType?: string;
  idempotencyKey?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  checkoutUrl?: string;
  checkoutSessionId?: string;
  error?: string;
}

export class PaymentIntegration {
  /**
   * Create a payment intent for a session booking
   */
  static async createSessionPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      // Validate clientId is provided and is a valid UUID
      if (!request.clientId || typeof request.clientId !== 'string' || request.clientId.trim() === '') {
        console.error('❌ Missing or invalid clientId:', {
          clientId: request.clientId,
          type: typeof request.clientId,
          sessionId: request.sessionId
        });
        return {
          success: false,
          error: 'Client ID is required for payment processing'
        };
      }

      // Validate clientId is a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(request.clientId)) {
        console.error('❌ Invalid clientId format (not a UUID):', {
          clientId: request.clientId,
          sessionId: request.sessionId
        });
        return {
          success: false,
          error: 'Invalid client ID format'
        };
      }

      // Generate idempotency key to prevent duplicate payments (no Date.now() for double-click protection)
      const idempotencyKey = request.idempotencyKey || `${request.sessionId}-${request.clientId}`;
      
      // Validate session exists and is bookable FIRST (more efficient check)
      // Accept 'scheduled', 'pending_payment', and 'pending_approval' statuses
      const { data: session, error: sessionError } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('id', request.sessionId)
        .in('status', ['scheduled', 'pending_payment', 'pending_approval'])
        .single();

      if (sessionError || !session) {
        return {
          success: false,
          error: 'Session not found or not available for payment'
        };
      }

      // GUEST-SUPPORT: ADDED FOR GUEST CHECKOUT
      // For guest bookings, we must be certain about the price.
      // Use the product price if available, otherwise fallback to session price.
      const price = session.product_price ?? session.price;
      const currency = session.currency ?? 'GBP'; // Default to GBP

      if (!price || price <= 0) {
        return {
          success: false,
          error: 'Invalid session price for payment'
        };
      }

      console.log('💰 Session price for payment:', { price, currency });
      // GUEST-SUPPORT: END

      // Create a record in payment_intents before calling Stripe
      // This helps track payments that are initiated but not completed
      // Generate ID client-side to avoid RLS issues with RETURNING/select() for guest users
      const paymentIntentId = crypto.randomUUID();

      const { error: intentInsertError } = await supabase
        .from('payment_intents')
        .insert({
          id: paymentIntentId,
          session_id: request.sessionId,
          client_id: request.clientId,
          practitioner_id: request.practitionerId,
          amount: price,
          currency: currency,
          status: 'initiated',
          idempotency_key: idempotencyKey,
        });

      if (intentInsertError) {
        return {
          success: false,
          error: `Failed to create payment intent record: ${intentInsertError.message}`
        };
      }

      // Now, invoke the edge function to create Stripe payment intent
      console.log('🚀 Invoking stripe-payment Edge Function...', {
        idempotencyKey,
        sessionId: request.sessionId,
        clientId: request.clientId,
        practitionerId: request.practitionerId,
        paymentIntentId,
      });
      const { data, error } = await supabase.functions.invoke('stripe-payment', {
        body: {
          action: 'create-payment-intent',
          idempotency_key: idempotencyKey,
          session_id: request.sessionId,
          client_id: request.clientId,
          practitioner_id: request.practitionerId,
          payment_intent_id: paymentIntentId,
          // Convert price to pence for Stripe (if not already in pence)
          // client_sessions.price is numeric (e.g. 10.50), so we need to multiply by 100
          amount: Math.round(Number(price) * 100),
          currency: currency, // Pass currency
          payment_type: 'session_payment', // Explicitly set payment_type to avoid NOT NULL constraint violation
          metadata: {
            practitioner_name: request.practitionerName || 'Practitioner',
            client_user_id: request.clientId,
            client_email: request.clientEmail || '',
            client_name: request.clientName || '',
            session_date: request.sessionDate || '',
            session_time: request.sessionTime || '',
            session_type: request.sessionType || 'Session'
          }
        },
      });

      console.log('💳 Payment intent response:', {
        hasData: !!data,
        hasError: !!error,
        dataKeys: data ? Object.keys(data) : [],
        errorMessage: error?.message,
        checkout_url: data?.checkout_url,
        checkout_session_id: data?.checkout_session_id
      });

      if (error) {
        console.error('❌ Checkout session creation error:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          context: error.context,
          status: error.status,
          name: error.name,
          fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
        });
        
        // Try to extract detailed error message from response body
        let errorMessage = error.message || 'Failed to create checkout session';
        let errorDetails: any = null;
        
        // Check if error.context is a Response object (Supabase Functions client wraps it)
        if (error.context && typeof error.context === 'object') {
          // Check if it's a Response object or has Response-like properties
          const isResponse = error.context instanceof Response || 
                             (typeof error.context.json === 'function') ||
                             (typeof error.context.text === 'function');
          
          if (isResponse) {
            try {
              // Try to parse the Response body as JSON
              const responseData = await error.context.json();
              if (responseData.error) {
                errorMessage = responseData.error;
                if (responseData.details) {
                  errorDetails = responseData.details;
                  if (typeof responseData.details === 'object') {
                    errorMessage += `: ${JSON.stringify(responseData.details)}`;
                  } else {
                    errorMessage += `: ${responseData.details}`;
                  }
                }
              }
              console.error('✅ Extracted error from Response:', { errorMessage, errorDetails });
            } catch (parseError) {
              // If JSON parsing fails, try text()
              try {
                // Clone the response first if possible (Response body can only be read once)
                const responseClone = error.context.clone ? error.context.clone() : error.context;
                const responseText = await responseClone.text();
                console.error('⚠️ Response body (text):', responseText);
                if (responseText) {
                  try {
                    const parsedText = JSON.parse(responseText);
                    if (parsedText.error) {
                      errorMessage = parsedText.error;
                      if (parsedText.details) {
                        errorDetails = parsedText.details;
                        errorMessage += `: ${typeof parsedText.details === 'object' ? JSON.stringify(parsedText.details) : parsedText.details}`;
                      }
                    }
                  } catch (e) {
                    // Not JSON, use as-is
                    errorMessage = responseText;
                  }
                }
              } catch (textError) {
                console.warn('Could not extract text from Response:', textError);
              }
            }
          }
        }
        
        // Check if error has context with response body (legacy format - string or object)
        if (!errorDetails && error.context && typeof error.context !== 'object') {
          try {
            // Parse context if it's a string (JSON)
            let contextData = error.context;
            if (typeof contextData === 'string') {
              contextData = JSON.parse(contextData);
            }
            
            // Check multiple possible locations for error message
            if (contextData?.error) {
              errorMessage = contextData.error;
              if (contextData.details) {
                errorDetails = contextData.details;
                if (typeof contextData.details === 'object') {
                  errorMessage += `: ${JSON.stringify(contextData.details)}`;
                } else {
                  errorMessage += `: ${contextData.details}`;
                }
              }
            } else if (contextData?.response) {
              const responseBody = contextData.response;
              if (typeof responseBody === 'string') {
                try {
                  const parsedBody = JSON.parse(responseBody);
                  if (parsedBody.error) {
                    errorMessage = parsedBody.error;
                    if (parsedBody.details) {
                      errorDetails = parsedBody.details;
                      errorMessage += `: ${typeof parsedBody.details === 'object' ? JSON.stringify(parsedBody.details) : parsedBody.details}`;
                    }
                  }
                } catch (e) {
                  // responseBody is not JSON, use as-is
                  errorMessage = responseBody;
                }
              } else if (responseBody?.error) {
                errorMessage = responseBody.error;
                if (responseBody.details) {
                  errorDetails = responseBody.details;
                  errorMessage += `: ${typeof responseBody.details === 'object' ? JSON.stringify(responseBody.details) : responseBody.details}`;
                }
              }
            } else if (contextData?.message) {
              errorMessage = contextData.message;
            }
          } catch (e) {
            console.warn('Could not parse error context:', e);
          }
        }
        
        // Also check if data contains error (sometimes Edge Functions return errors in data with 200 status)
        if (data && data.error) {
          errorMessage = data.error;
          if (data.details) {
            errorDetails = data.details;
            errorMessage += `: ${typeof data.details === 'object' ? JSON.stringify(data.details) : data.details}`;
          }
        }
        
        console.error('📋 Final extracted error message:', errorMessage);
        
        return {
          success: false,
          error: errorMessage
        };
      }

      if (!data || !data.checkout_url) {
        console.error('❌ Invalid response from checkout session creation:', {
          hasData: !!data,
          dataType: typeof data,
          dataKeys: data ? Object.keys(data) : [],
          checkout_url: data?.checkout_url,
          fullData: JSON.stringify(data, null, 2)
        });
        return {
          success: false,
          error: `Invalid response from payment system: ${data ? 'Missing checkout_url' : 'No data returned'}`
        };
      }

      return {
        success: true,
        checkoutUrl: data.checkout_url,
        checkoutSessionId: data.checkout_session_id,
        paymentIntentId: data.payment_id
      };

    } catch (error: any) {
      console.error('❌ Payment creation error:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        name: error?.name,
        stack: error?.stack
      });
      return {
        success: false,
        error: error?.message || 'Payment system error'
      };
    }
  }

  /**
   * Confirm a payment and update session status
   */
  static async confirmPayment(
    paymentIntentId: string,
    sessionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Confirm payment via Edge Function
      const { data, error } = await supabase.functions.invoke('stripe-payment', {
        body: {
          action: 'confirm-payment',
          payment_intent_id: paymentIntentId,
          session_id: sessionId
        }
      });

      if (error) {
        console.error('Payment confirmation error:', error);
        return {
          success: false,
          error: 'Failed to confirm payment'
        };
      }

      // Update session status to scheduled
      const { error: sessionError } = await supabase
        .from('client_sessions')
        .update({
          status: 'scheduled',
          payment_status: 'completed',
          payment_date: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (sessionError) {
        console.error('Session update error:', sessionError);
        return {
          success: false,
          error: 'Payment confirmed but session update failed'
        };
      }

      // Send confirmation notifications
      await this.sendPaymentConfirmationNotifications(sessionId);

      return { success: true };

    } catch (error) {
      console.error('Payment confirmation error:', error);
      return {
        success: false,
        error: 'Payment confirmation failed'
      };
    }
  }

  /**
   * Send payment confirmation notifications
   */
  private static async sendPaymentConfirmationNotifications(sessionId: string) {
    try {
      // Get session details
      const { data: session } = await supabase
        .from('client_sessions')
        .select(`
          *,
          client:users!client_sessions_client_id_fkey(first_name, last_name, email),
          practitioner:users!client_sessions_therapist_id_fkey(first_name, last_name, email)
        `)
        .eq('id', sessionId)
        .single();

      if (!session) return;

      // Create notifications for both client and practitioner
      const notifications = [
        {
          user_id: session.client_id,
          type: 'payment_confirmed',
          title: 'Payment Confirmed',
          message: `Your session with ${session.practitioner?.first_name} ${session.practitioner?.last_name} on ${session.session_date} has been confirmed.`,
          data: {
            session_id: sessionId,
            practitioner_name: `${session.practitioner?.first_name} ${session.practitioner?.last_name}`,
            session_date: session.session_date,
            start_time: session.start_time
          }
        },
        {
          user_id: session.therapist_id,
          type: 'payment_received',
          title: 'Payment Received',
          message: `Payment received for your session with ${session.client?.first_name} ${session.client?.last_name} on ${session.session_date}.`,
          data: {
            session_id: sessionId,
            client_name: `${session.client?.first_name} ${session.client?.last_name}`,
            session_date: session.session_date,
            start_time: session.start_time,
            amount: session.price
          }
        }
      ];

      // Insert notifications
      await supabase
        .from('notifications')
        .insert(notifications);

      // Send email notifications
      await NotificationSystem.sendPaymentConfirmation(session.payment_id || sessionId);

    } catch (error) {
      console.error('Error sending payment notifications:', error);
    }
  }

  /**
   * Handle payment failure
   */
  static async handlePaymentFailure(
    paymentIntentId: string,
    sessionId: string,
    error: string
  ): Promise<void> {
    try {
      // Update payment status
      await supabase
        .from('payments')
        .update({
          payment_status: 'failed',
          metadata: { error_message: error }
        })
        .eq('stripe_payment_intent_id', paymentIntentId);

      // Update session status
      await supabase
        .from('client_sessions')
        .update({
          payment_status: 'failed'
        })
        .eq('id', sessionId);

      // Send failure notification
      const { data: session } = await supabase
        .from('client_sessions')
        .select('client_id')
        .eq('id', sessionId)
        .single();

      if (session) {
        await supabase
          .from('notifications')
          .insert({
            user_id: session.client_id,
            type: 'payment_failed',
            title: 'Payment Failed',
            message: 'Your payment could not be processed. Please try again.',
            data: {
              session_id: sessionId,
              error: error
            }
          });
      }

    } catch (error) {
      console.error('Error handling payment failure:', error);
    }
  }

  /**
   * Get payment status for a session
   */
  static async getPaymentStatus(sessionId: string): Promise<{
    status: string;
    amount?: number;
    currency?: string;
    paymentDate?: string;
  }> {
    try {
      const { data: payment } = await supabase
        .from('payments')
        .select('payment_status, amount, currency, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        status: payment?.payment_status || 'pending',
        amount: payment?.amount,
        currency: payment?.currency,
        paymentDate: payment?.created_at
      };
    } catch (error) {
      console.error('Error getting payment status:', error);
      return { status: 'unknown' };
    }
  }
}

