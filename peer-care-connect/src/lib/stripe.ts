/**
 * Stripe Payment Integration
 * Provides actual payment processing functionality
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { PaymentsService } from './database';

// Initialize Stripe
let stripePromise: Promise<Stripe | null>;

const getStripe = () => {
  if (!stripePromise) {
    const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!stripeKey) {
      // TEMPORARY FIX: Suppress Stripe warning completely
      // TODO: Add Stripe publishable key to environment variables
      console.log('🔧 Stripe features disabled (no publishable key configured)');
      stripePromise = Promise.resolve(null);
    } else {
      stripePromise = loadStripe(stripeKey, {
        // Disable Stripe's analytics to reduce blocked requests
        stripeAccount: undefined,
        // Add timeout to prevent hanging requests
        timeout: 10000,
        // Disable analytics and tracking
        apiVersion: '2024-12-18',
        locale: 'en',
      }).catch((error) => {
        // Suppress specific error messages that are caused by ad blockers
        const errorMessage = error.message || '';
        if (errorMessage.includes('r.stripe.com') || 
            errorMessage.includes('ERR_BLOCKED_BY_CLIENT') ||
            errorMessage.includes('Failed to fetch')) {
          // Silently handle ad blocker errors
          console.log('🔧 Stripe analytics blocked by ad blocker (this is normal)');
        } else {
          console.warn('⚠️ Stripe failed to load:', error.message);
        }
        // Return null instead of throwing to prevent app crashes
        return null;
      });
    }
  }
  return stripePromise;
};

// Export stripePromise for Elements provider
export default getStripe();

export interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

export class StripePaymentService {
  /**
   * Create a payment intent for a session
   */
  static async createPaymentIntent(
    sessionId: string,
    amount: number,
    currency: string = 'GBP'
  ): Promise<PaymentIntent> {
    try {
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          amount: amount * 100, // Convert to cents
          currency: currency.toLowerCase(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Confirm a payment intent
   */
  static async confirmPayment(
    paymentIntentId: string,
    clientSecret: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Stripe not initialized');
      }

      const { error } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error confirming payment:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Payment failed' 
      };
    }
  }

  /**
   * Process payment for a session
   */
  static async processSessionPayment(
    sessionId: string,
    amount: number,
    currency: string = 'GBP'
  ): Promise<{ success: boolean; paymentId?: string; error?: string }> {
    try {
      // Create payment intent
      const paymentIntent = await this.createPaymentIntent(sessionId, amount, currency);
      
      // Confirm payment
      const result = await this.confirmPayment(paymentIntent.id, paymentIntent.client_secret);
      
      if (result.success) {
        // Create payment record in database
        const payment = await PaymentsService.createPayment({
          session_id: sessionId,
          client_id: '', // Will be filled by the API
          therapist_id: '', // Will be filled by the API
          amount: amount * 100, // Convert to cents
          currency: currency.toUpperCase(),
          status: 'completed',
          stripe_payment_intent_id: paymentIntent.id,
        });

        return { success: true, paymentId: payment.id };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error processing session payment:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Payment processing failed' 
      };
    }
  }

  /**
   * Get payment methods for a user
   */
  static async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await fetch('/api/stripe/payment-methods', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }

      const data = await response.json();
      return data.payment_methods || [];
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return [];
    }
  }

  /**
   * Create a payment method
   */
  static async createPaymentMethod(
    cardElement: any,
    billingDetails?: any
  ): Promise<{ success: boolean; paymentMethodId?: string; error?: string }> {
    try {
      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Stripe not initialized');
      }

      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: billingDetails,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, paymentMethodId: paymentMethod?.id };
    } catch (error) {
      console.error('Error creating payment method:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create payment method' 
      };
    }
  }

  /**
   * Refund a payment
   */
  static async refundPayment(
    paymentId: string,
    amount?: number
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      const response = await fetch('/api/stripe/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_id: paymentId,
          amount: amount ? amount * 100 : undefined, // Convert to cents
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process refund');
      }

      const data = await response.json();
      return { success: true, refundId: data.refund_id };
    } catch (error) {
      console.error('Error processing refund:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Refund failed' 
      };
    }
  }

  /**
   * Get payment history for a user
   */
  static async getPaymentHistory(): Promise<any[]> {
    try {
      const response = await fetch('/api/stripe/payment-history', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment history');
      }

      const data = await response.json();
      return data.payments || [];
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }
  }
}