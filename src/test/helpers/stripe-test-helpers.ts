/**
 * Stripe Test Helpers
 * Utilities for testing Stripe integration
 */

export interface MockStripePaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  metadata: Record<string, string>;
}

export interface MockStripeCustomer {
  id: string;
  email: string;
  name?: string;
  metadata: Record<string, string>;
}

export interface MockStripePrice {
  id: string;
  product: string;
  unit_amount: number;
  currency: string;
  metadata: Record<string, string>;
}

export class StripeTestHelpers {
  /**
   * Create a mock Stripe payment intent
   */
  static createMockPaymentIntent(overrides: Partial<MockStripePaymentIntent> = {}): MockStripePaymentIntent {
    return {
      id: `pi_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      client_secret: `pi_test_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`,
      amount: overrides.amount || 7000, // £70.00 in pence
      currency: overrides.currency || 'gbp',
      status: overrides.status || 'requires_payment_method',
      metadata: overrides.metadata || {},
    };
  }

  /**
   * Create a mock Stripe customer
   */
  static createMockCustomer(overrides: Partial<MockStripeCustomer> = {}): MockStripeCustomer {
    return {
      id: `cus_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: overrides.email || `test-${Date.now()}@example.com`,
      name: overrides.name || 'Test Customer',
      metadata: overrides.metadata || {},
    };
  }

  /**
   * Create a mock Stripe price
   */
  static createMockPrice(overrides: Partial<MockStripePrice> = {}): MockStripePrice {
    return {
      id: `price_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      product: overrides.product || `prod_test_${Date.now()}`,
      unit_amount: overrides.unit_amount || 7000,
      currency: overrides.currency || 'gbp',
      metadata: overrides.metadata || {},
    };
  }

  /**
   * Mock Stripe API response
   */
  static mockStripeResponse<T>(data: T): Promise<T> {
    return Promise.resolve(data);
  }

  /**
   * Mock Stripe API error
   */
  static mockStripeError(message: string, code: string = 'api_error'): Promise<never> {
    return Promise.reject({
      type: 'StripeAPIError',
      message,
      code,
    });
  }

  /**
   * Calculate platform fee (1.5% default)
   */
  static calculatePlatformFee(amountPence: number, feePercentage: number = 1.5): number {
    return Math.round(amountPence * (feePercentage / 100));
  }

  /**
   * Calculate practitioner earnings
   */
  static calculatePractitionerEarnings(amountPence: number, platformFeePence: number): number {
    return amountPence - platformFeePence;
  }

  /**
   * Format amount for Stripe (pounds to pence)
   */
  static formatAmountForStripe(amountInPounds: number): number {
    return Math.round(amountInPounds * 100);
  }

  /**
   * Format amount from Stripe (pence to pounds)
   */
  static formatAmountFromStripe(amountInPence: number): number {
    return amountInPence / 100;
  }

  /**
   * Create mock webhook event
   */
  static createMockWebhookEvent(
    type: string,
    data: any
  ): {
    id: string;
    type: string;
    data: { object: any };
    created: number;
  } {
    return {
      id: `evt_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data: { object: data },
      created: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Mock successful payment webhook event
   */
  static createSuccessfulPaymentEvent(bookingId: string, amount: number): any {
    return this.createMockWebhookEvent('payment_intent.succeeded', {
      id: `pi_test_${Date.now()}`,
      amount,
      currency: 'gbp',
      status: 'succeeded',
      metadata: {
        booking_id: bookingId,
      },
    });
  }

  /**
   * Mock failed payment webhook event
   */
  static createFailedPaymentEvent(bookingId: string, amount: number): any {
    return this.createMockWebhookEvent('payment_intent.payment_failed', {
      id: `pi_test_${Date.now()}`,
      amount,
      currency: 'gbp',
      status: 'requires_payment_method',
      last_payment_error: {
        message: 'Your card was declined.',
        type: 'card_error',
      },
      metadata: {
        booking_id: bookingId,
      },
    });
  }
}

