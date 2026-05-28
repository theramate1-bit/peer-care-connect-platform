/**
 * Refund Service
 * Handles processing refunds for cancelled sessions
 */

import { supabase } from '@/integrations/supabase/client';

export interface RefundResult {
  success: boolean;
  refundId?: string;
  refundAmount?: number;
  refundType?: 'stripe' | 'credit';
  error?: string;
}

export class RefundService {
  /**
   * Process refund for a cancelled session
   */
  static async processRefund(
    sessionId: string,
    refundAmount: number,
    refundType: 'stripe' | 'credit',
    cancellationReason?: string
  ): Promise<RefundResult> {
    try {
      if (refundType === 'stripe') {
        return await this.processStripeRefund(sessionId, refundAmount);
      } else {
        return await this.processCreditRefund(sessionId, refundAmount, cancellationReason);
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process refund'
      };
    }
  }

  /**
   * Process Stripe refund
   */
  static async processStripeRefund(
    sessionId: string,
    amount: number
  ): Promise<RefundResult> {
    try {
      // Get session details including payment info
      const { data: session, error: sessionError } = await supabase
        .from('client_sessions')
        .select('stripe_payment_intent_id, price')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      if (!session) throw new Error('Session not found');

      const paymentIntentId = session.stripe_payment_intent_id;
      if (!paymentIntentId) {
        throw new Error('No Stripe payment intent found for this session');
      }

      // Call Stripe refund Edge Function
      const { data, error } = await supabase.functions.invoke('stripe-refund', {
        body: {
          payment_intent_id: paymentIntentId,
          amount: amount * 100, // Convert to pence
          session_id: sessionId
        }
      });

      if (error) throw error;

      if (data?.success) {
        // Update payment status
        await supabase
          .from('client_sessions')
          .update({ payment_status: 'refunded' })
          .eq('id', sessionId);

        return {
          success: true,
          refundId: data.refund_id,
          refundAmount: amount,
          refundType: 'stripe'
        };
      } else {
        throw new Error(data?.error || 'Refund failed');
      }
    } catch (error) {
      console.error('Error processing Stripe refund:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process Stripe refund'
      };
    }
  }

  /**
   * Process credit refund
   */
  static async processCreditRefund(
    sessionId: string,
    amount: number,
    cancellationReason?: string
  ): Promise<RefundResult> {
    try {
      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from('client_sessions')
        .select('client_id, therapist_id, credit_cost')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      if (!session) throw new Error('Session not found');
      if (!session.client_id || !session.therapist_id) {
        throw new Error('Session missing client or therapist ID');
      }

      // Call peer booking refund RPC (function handles payment_status update internally)
      const { data, error } = await supabase.rpc('process_peer_booking_refund', {
        p_session_id: sessionId,
        p_cancellation_reason: cancellationReason || 'Cancelled by practitioner'
      });

      if (error) throw error;

      if (data?.success) {
        return {
          success: true,
          refundAmount: data.refunded_credits || amount,
          refundType: 'credit'
        };
      } else {
        throw new Error(data?.error || 'Refund failed');
      }
    } catch (error) {
      console.error('Error processing credit refund:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process credit refund'
      };
    }
  }

  /**
   * Determine refund type based on session payment info
   */
  static async getRefundType(sessionId: string): Promise<'stripe' | 'credit' | null> {
    try {
      const { data: session, error } = await supabase
        .from('client_sessions')
        .select('stripe_payment_intent_id, credit_cost')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      if (!session) return null;

      // Check if Stripe payment
      if (session.stripe_payment_intent_id || session.stripe_session_id) {
        return 'stripe';
      }

      // Check if credit payment
      if (session.credit_cost && session.credit_cost > 0) {
        return 'credit';
      }

      return null;
    } catch (error) {
      console.error('Error determining refund type:', error);
      return null;
    }
  }
}
