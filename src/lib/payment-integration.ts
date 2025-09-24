/**
 * Complete Payment Integration System
 * Handles all payment flows with proper error handling and confirmation
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PaymentRequest {
  sessionId: string;
  practitionerId: string;
  clientId: string;
  amount: number; // in pence
  currency: string;
  description: string;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  error?: string;
}

export class PaymentIntegration {
  /**
   * Create a payment intent for a session booking
   */
  static async createSessionPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      // Validate session exists and is bookable
      const { data: session, error: sessionError } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('id', request.sessionId)
        .eq('status', 'scheduled')
        .single();

      if (sessionError || !session) {
        return {
          success: false,
          error: 'Session not found or not available for payment'
        };
      }

      // Check if payment already exists
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('*')
        .eq('session_id', request.sessionId)
        .eq('payment_status', 'completed')
        .single();

      if (existingPayment) {
        return {
          success: false,
          error: 'Payment already completed for this session'
        };
      }

      // Create payment intent via Edge Function
      const { data, error } = await supabase.functions.invoke('stripe-payment', {
        body: {
          action: 'create-payment-intent',
          amount: request.amount,
          currency: request.currency,
          payment_type: 'session_payment',
          therapist_id: request.practitionerId,
          session_id: request.sessionId,
          metadata: {
            client_id: request.clientId,
            description: request.description
          }
        }
      });

      if (error) {
        console.error('Payment intent creation error:', error);
        return {
          success: false,
          error: 'Failed to create payment intent'
        };
      }

      return {
        success: true,
        paymentIntentId: data.payment_intent_id,
        clientSecret: data.client_secret
      };

    } catch (error) {
      console.error('Payment creation error:', error);
      return {
        success: false,
        error: 'Payment system error'
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

      // Update session status to confirmed
      const { error: sessionError } = await supabase
        .from('client_sessions')
        .update({
          status: 'confirmed',
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
