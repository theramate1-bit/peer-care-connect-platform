/**
 * Stripe Service Integration
 * Handles dynamic pricing and payment processing for the marketplace
 */

import { Stripe } from 'stripe';

// Initialize Stripe (you'll need to add your secret key)
const stripe = new Stripe(process.env.REACT_APP_STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

export interface CreatePriceRequest {
  serviceId: string;
  practitionerId: string;
  serviceName: string;
  serviceType: string;
  basePricePence: number;
  platformFeePence: number;
  practitionerEarningsPence: number;
}

export interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  metadata: Record<string, string>;
  customerId?: string;
}

/**
 * Create a dynamic Stripe price for a service
 */
export async function createServicePrice(request: CreatePriceRequest): Promise<string> {
  try {
    const price = await stripe.prices.create({
      product_data: {
        name: request.serviceName,
        description: `${request.serviceType} session - ${request.serviceName}`,
        metadata: {
          service_id: request.serviceId,
          practitioner_id: request.practitionerId,
          platform_fee: request.platformFeePence.toString(),
          practitioner_earnings: request.practitionerEarningsPence.toString(),
          service_type: request.serviceType
        }
      },
      unit_amount: request.basePricePence,
      currency: 'gbp',
      metadata: {
        service_id: request.serviceId,
        practitioner_id: request.practitionerId,
        platform_fee: request.platformFeePence.toString(),
        practitioner_earnings: request.practitionerEarningsPence.toString()
      }
    });

    return price.id;
  } catch (error) {
    console.error('Error creating Stripe price:', error);
    throw new Error('Failed to create service price');
  }
}

/**
 * Create a payment intent for a booking
 */
export async function createPaymentIntent(request: CreatePaymentIntentRequest): Promise<{
  id: string;
  client_secret: string;
}> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: request.amount,
      currency: request.currency,
      customer: request.customerId,
      metadata: request.metadata,
      automatic_payment_methods: {
        enabled: true,
      },
      // Enable marketplace features
      application_fee_amount: parseInt(request.metadata.platform_fee || '0'),
      transfer_data: {
        destination: request.metadata.practitioner_stripe_account_id || undefined,
      },
    });

    return {
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret || '',
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new Error('Failed to create payment intent');
  }
}

/**
 * Create a customer in Stripe
 */
export async function createCustomer(email: string, name?: string): Promise<string> {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        platform: 'theramate'
      }
    });

    return customer.id;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw new Error('Failed to create customer');
  }
}

/**
 * Retrieve a payment intent
 */
export async function retrievePaymentIntent(paymentIntentId: string) {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    throw new Error('Failed to retrieve payment intent');
  }
}

/**
 * Confirm a payment intent
 */
export async function confirmPaymentIntent(paymentIntentId: string) {
  try {
    return await stripe.paymentIntents.confirm(paymentIntentId);
  } catch (error) {
    console.error('Error confirming payment intent:', error);
    throw new Error('Failed to confirm payment intent');
  }
}

/**
 * Create a refund
 */
export async function createRefund(chargeId: string, amount?: number, reason?: string) {
  try {
    const refund = await stripe.refunds.create({
      charge: chargeId,
      amount,
      reason: reason as any,
      metadata: {
        platform: 'theramate'
      }
    });

    return refund;
  } catch (error) {
    console.error('Error creating refund:', error);
    throw new Error('Failed to create refund');
  }
}

/**
 * Create a transfer to practitioner
 */
export async function createTransfer(
  amount: number,
  destination: string,
  transferGroup: string,
  metadata: Record<string, string>
) {
  try {
    const transfer = await stripe.transfers.create({
      amount,
      currency: 'gbp',
      destination,
      transfer_group: transferGroup,
      metadata: {
        ...metadata,
        platform: 'theramate'
      }
    });

    return transfer;
  } catch (error) {
    console.error('Error creating transfer:', error);
    throw new Error('Failed to create transfer');
  }
}

/**
 * Get payment methods for a customer
 */
export async function getCustomerPaymentMethods(customerId: string) {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return paymentMethods.data;
  } catch (error) {
    console.error('Error getting payment methods:', error);
    throw new Error('Failed to get payment methods');
  }
}

/**
 * Create a setup intent for saving payment methods
 */
export async function createSetupIntent(customerId: string) {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
    });

    return setupIntent;
  } catch (error) {
    console.error('Error creating setup intent:', error);
    throw new Error('Failed to create setup intent');
  }
}

/**
 * Calculate platform fee for a given amount
 */
export function calculatePlatformFee(amountPence: number, feePercentage: number = 4): number {
  return Math.round(amountPence * (feePercentage / 100));
}

/**
 * Calculate practitioner earnings after platform fee
 */
export function calculatePractitionerEarnings(amountPence: number, platformFeePence: number): number {
  return amountPence - platformFeePence;
}

/**
 * Format amount for Stripe (convert pounds to pence)
 */
export function formatAmountForStripe(amountInPounds: number): number {
  return Math.round(amountInPounds * 100);
}

/**
 * Format amount from Stripe (convert pence to pounds)
 */
export function formatAmountFromStripe(amountInPence: number): number {
  return amountInPence / 100;
}

/**
 * Validate Stripe webhook signature
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    throw new Error('Invalid webhook signature');
  }
}

/**
 * Handle successful payment webhook
 */
export async function handleSuccessfulPayment(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  
  // Update booking status to confirmed
  // This would typically involve updating your database
  console.log('Payment succeeded:', paymentIntent.id);
  
  // Extract metadata
  const bookingId = paymentIntent.metadata.booking_id;
  const practitionerId = paymentIntent.metadata.practitioner_id;
  const platformFee = parseInt(paymentIntent.metadata.platform_fee || '0');
  const practitionerEarnings = parseInt(paymentIntent.metadata.practitioner_earnings || '0');
  
  // Create transfer to practitioner (if using Stripe Connect)
  if (practitionerEarnings > 0) {
    // This would require the practitioner's Stripe Connect account ID
    // await createTransfer(practitionerEarnings, practitionerStripeAccountId, bookingId, {
    //   booking_id: bookingId,
    //   practitioner_id: practitionerId
    // });
  }
  
  return { success: true, bookingId };
}

/**
 * Handle failed payment webhook
 */
export async function handleFailedPayment(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  
  // Update booking status to cancelled
  console.log('Payment failed:', paymentIntent.id);
  
  return { success: true };
}
