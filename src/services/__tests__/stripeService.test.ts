/**
 * Unit tests for stripeService
 */

import {
  createServicePrice,
  createPaymentIntent,
  createCustomer,
  retrievePaymentIntent,
  confirmPaymentIntent,
  createRefund,
  calculatePlatformFee,
  calculatePractitionerEarnings,
  formatAmountForStripe,
  formatAmountFromStripe,
} from '../stripeService';
import { StripeTestHelpers } from '@/test/helpers/stripe-test-helpers';

// Mock Stripe (named export) - factory returns same instance so stripeService and tests share it
jest.mock('stripe', () => {
  const shared = {
    prices: { create: jest.fn() },
    paymentIntents: { create: jest.fn(), retrieve: jest.fn(), confirm: jest.fn() },
    customers: { create: jest.fn() },
    refunds: { create: jest.fn() },
  };
  return { Stripe: jest.fn(() => shared) };
});

describe('stripeService', () => {
  let mockStripe: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const { Stripe } = require('stripe');
    mockStripe = new Stripe();
  });

  describe('createServicePrice', () => {
    it('should create a Stripe price successfully', async () => {
      const mockPrice = StripeTestHelpers.createMockPrice();
      mockStripe.prices.create.mockResolvedValue(mockPrice);

      const request = {
        serviceId: 'service-123',
        practitionerId: 'practitioner-123',
        serviceName: 'Sports Therapy',
        serviceType: 'sports_therapy',
        basePricePence: 7000,
        platformFeePence: 105,
        practitionerEarningsPence: 6895,
      };

      const result = await createServicePrice(request);

      expect(result).toBe(mockPrice.id);
      expect(mockStripe.prices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          unit_amount: 7000,
          currency: 'gbp',
          metadata: expect.objectContaining({
            service_id: 'service-123',
            practitioner_id: 'practitioner-123',
          }),
        })
      );
    });

    it('should throw error on failure', async () => {
      mockStripe.prices.create.mockRejectedValue(new Error('Stripe API error'));

      const request = {
        serviceId: 'service-123',
        practitionerId: 'practitioner-123',
        serviceName: 'Sports Therapy',
        serviceType: 'sports_therapy',
        basePricePence: 7000,
        platformFeePence: 105,
        practitionerEarningsPence: 6895,
      };

      await expect(createServicePrice(request)).rejects.toThrow('Failed to create service price');
    });
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent successfully', async () => {
      const mockPaymentIntent = StripeTestHelpers.createMockPaymentIntent();
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const request = {
        amount: 7000,
        currency: 'gbp',
        metadata: {
          booking_id: 'booking-123',
          practitioner_id: 'practitioner-123',
        },
      };

      const result = await createPaymentIntent(request);

      expect(result.id).toBe(mockPaymentIntent.id);
      expect(result.client_secret).toBe(mockPaymentIntent.client_secret);
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 7000,
          currency: 'gbp',
          metadata: request.metadata,
        })
      );
    });

    it('should throw error on failure', async () => {
      mockStripe.paymentIntents.create.mockRejectedValue(new Error('Stripe API error'));

      const request = {
        amount: 7000,
        currency: 'gbp',
        metadata: {},
      };

      await expect(createPaymentIntent(request)).rejects.toThrow('Failed to create payment intent');
    });
  });

  describe('createCustomer', () => {
    it('should create a customer successfully', async () => {
      const mockCustomer = StripeTestHelpers.createMockCustomer();
      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      const result = await createCustomer('test@example.com', 'Test User');

      expect(result).toBe(mockCustomer.id);
      expect(mockStripe.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          name: 'Test User',
        })
      );
    });

    it('should throw error on failure', async () => {
      mockStripe.customers.create.mockRejectedValue(new Error('Stripe API error'));

      await expect(createCustomer('test@example.com')).rejects.toThrow('Failed to create customer');
    });
  });

  describe('retrievePaymentIntent', () => {
    it('should retrieve payment intent successfully', async () => {
      const mockPaymentIntent = StripeTestHelpers.createMockPaymentIntent();
      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      const result = await retrievePaymentIntent('pi_test_123');

      expect(result).toBe(mockPaymentIntent);
      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_test_123');
    });

    it('should throw error on failure', async () => {
      mockStripe.paymentIntents.retrieve.mockRejectedValue(new Error('Stripe API error'));

      await expect(retrievePaymentIntent('pi_test_123')).rejects.toThrow(
        'Failed to retrieve payment intent'
      );
    });
  });

  describe('confirmPaymentIntent', () => {
    it('should confirm payment intent successfully', async () => {
      const mockPaymentIntent = StripeTestHelpers.createMockPaymentIntent({
        status: 'succeeded',
      });
      mockStripe.paymentIntents.confirm.mockResolvedValue(mockPaymentIntent);

      const result = await confirmPaymentIntent('pi_test_123');

      expect(result).toBe(mockPaymentIntent);
      expect(mockStripe.paymentIntents.confirm).toHaveBeenCalledWith('pi_test_123');
    });

    it('should throw error on failure', async () => {
      mockStripe.paymentIntents.confirm.mockRejectedValue(new Error('Stripe API error'));

      await expect(confirmPaymentIntent('pi_test_123')).rejects.toThrow(
        'Failed to confirm payment intent'
      );
    });
  });

  describe('createRefund', () => {
    it('should create refund successfully', async () => {
      const mockRefund = {
        id: 're_test_123',
        amount: 7000,
        status: 'succeeded',
      };
      mockStripe.refunds.create.mockResolvedValue(mockRefund);

      const result = await createRefund('ch_test_123', 7000, 'requested_by_customer');

      expect(result).toBe(mockRefund);
      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          charge: 'ch_test_123',
          amount: 7000,
          reason: 'requested_by_customer',
        })
      );
    });

    it('should throw error on failure', async () => {
      mockStripe.refunds.create.mockRejectedValue(new Error('Stripe API error'));

      await expect(createRefund('ch_test_123')).rejects.toThrow('Failed to create refund');
    });
  });

  describe('calculatePlatformFee', () => {
    it('should calculate platform fee correctly', () => {
      expect(calculatePlatformFee(7000, 1.5)).toBe(105); // 1.5% of 7000
      expect(calculatePlatformFee(10000, 4)).toBe(400); // 4% of 10000
    });
  });

  describe('calculatePractitionerEarnings', () => {
    it('should calculate practitioner earnings correctly', () => {
      expect(calculatePractitionerEarnings(7000, 105)).toBe(6895);
      expect(calculatePractitionerEarnings(10000, 400)).toBe(9600);
    });
  });

  describe('formatAmountForStripe', () => {
    it('should convert pounds to pence', () => {
      expect(formatAmountForStripe(70.0)).toBe(7000);
      expect(formatAmountForStripe(100.5)).toBe(10050);
    });
  });

  describe('formatAmountFromStripe', () => {
    it('should convert pence to pounds', () => {
      expect(formatAmountFromStripe(7000)).toBe(70);
      expect(formatAmountFromStripe(10050)).toBe(100.5);
    });
  });
});

