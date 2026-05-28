/**
 * Unit tests for bookingService
 */

import { MockDataFactory } from '@/test/helpers/mock-factories';

// Mock Supabase before importing bookingService (lazy init to avoid "before initialization")
let _supabase: ReturnType<typeof import('@/test/helpers/supabase-test-client').createTestSupabaseClient>;
jest.mock('@/integrations/supabase/client', () => ({
  get supabase() {
    if (!_supabase) _supabase = require('@/test/helpers/supabase-test-client').createTestSupabaseClient();
    return _supabase;
  },
}));

import {
  createBooking,
  confirmBookingPayment,
  getClientBookings,
  getPractitionerBookings,
  updateBookingStatus,
  cancelBooking,
  getBookingById,
  getPractitionerStats,
} from '../bookingService';

// Mock fetch for Stripe API calls
global.fetch = jest.fn();

describe('bookingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('createBooking', () => {
    it('should create a booking successfully', async () => {
      const service = MockDataFactory.createService();
      const client = MockDataFactory.createClient();
      const practitioner = MockDataFactory.createPractitioner();

      const mockServiceResponse = { data: service, error: null };
      const mockBookingResponse = {
        data: MockDataFactory.createBooking({
          client_id: client.id,
          practitioner_id: practitioner.id,
          service_id: service.id,
        }),
        error: null,
      };
      const mockPaymentIntent = {
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
      };

      const { supabase } = require('@/integrations/supabase/client');
      supabase.from = jest.fn((table: string) => {
        if (table === 'practitioner_services') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue(mockServiceResponse),
          };
        }
        if (table === 'session_bookings') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue(mockBookingResponse),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ error: null }),
          };
        }
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockPaymentIntent,
      });

      const bookingRequest = {
        serviceId: service.id,
        clientId: client.id,
        sessionDate: new Date(),
      };

      const result = await createBooking(bookingRequest);

      expect(result.booking).toBeDefined();
      expect(result.paymentIntent).toBeDefined();
      expect(result.paymentIntent.client_secret).toBe(mockPaymentIntent.client_secret);
    });

    it('should throw error if service not found', async () => {
      const { supabase } = require('@/integrations/supabase/client');
      supabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }));

      const bookingRequest = {
        serviceId: 'invalid-service-id',
        clientId: 'client-id',
        sessionDate: new Date(),
      };

      await expect(createBooking(bookingRequest)).rejects.toThrow('Service not found or inactive');
    });
  });

  describe('confirmBookingPayment', () => {
    it('should confirm booking payment successfully', async () => {
      const booking = MockDataFactory.createBooking({ status: 'pending' });
      const mockResponse = {
        data: { ...booking, status: 'confirmed', stripe_payment_intent_id: 'pi_test_123' },
        error: null,
      };

      const { supabase } = require('@/integrations/supabase/client');
      supabase.from = jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(mockResponse),
      }));

      const result = await confirmBookingPayment(booking.id, 'pi_test_123');

      expect(result.status).toBe('confirmed');
      expect(result.stripe_payment_intent_id).toBe('pi_test_123');
    });

    it('should throw error if booking not found', async () => {
      const { supabase } = require('@/integrations/supabase/client');
      supabase.from = jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }));

      await expect(confirmBookingPayment('invalid-id', 'pi_test_123')).rejects.toThrow(
        'Failed to confirm booking'
      );
    });
  });

  describe('getClientBookings', () => {
    it('should fetch client bookings successfully', async () => {
      const bookings = MockDataFactory.createBookings(3);
      const mockResponse = { data: bookings, error: null };

      const { supabase } = require('@/integrations/supabase/client');
      supabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue(mockResponse),
      }));

      const result = await getClientBookings('client-id');

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('id');
    });
  });

  describe('getPractitionerBookings', () => {
    it('should fetch practitioner bookings successfully', async () => {
      const bookings = MockDataFactory.createBookings(2);
      const mockResponse = { data: bookings, error: null };

      const { supabase } = require('@/integrations/supabase/client');
      supabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue(mockResponse),
      }));

      const result = await getPractitionerBookings('practitioner-id');

      expect(result).toHaveLength(2);
    });
  });

  describe('updateBookingStatus', () => {
    it('should update booking status successfully', async () => {
      const booking = MockDataFactory.createBooking({ status: 'pending' });
      const mockResponse = { data: { ...booking, status: 'confirmed' }, error: null };

      const { supabase } = require('@/integrations/supabase/client');
      supabase.from = jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(mockResponse),
      }));

      const result = await updateBookingStatus(booking.id, 'confirmed');

      expect(result.status).toBe('confirmed');
    });
  });

  describe('cancelBooking', () => {
    it('should cancel booking as client', async () => {
      const booking = MockDataFactory.createBooking({ status: 'confirmed' });
      const mockResponse = { data: { ...booking, status: 'cancelled' }, error: null };

      const { supabase } = require('@/integrations/supabase/client');
      supabase.from = jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(mockResponse),
      }));

      const result = await cancelBooking(booking.id, booking.client_id, 'client');

      expect(result.status).toBe('cancelled');
    });

    it('should cancel booking as practitioner', async () => {
      const booking = MockDataFactory.createBooking({ status: 'confirmed' });
      const mockResponse = { data: { ...booking, status: 'cancelled' }, error: null };

      const { supabase } = require('@/integrations/supabase/client');
      supabase.from = jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(mockResponse),
      }));

      const result = await cancelBooking(booking.id, booking.practitioner_id, 'practitioner');

      expect(result.status).toBe('cancelled');
    });
  });

  describe('getBookingById', () => {
    it('should fetch booking by ID successfully', async () => {
      const booking = MockDataFactory.createBooking();
      const mockResponse = { data: booking, error: null };

      const { supabase } = require('@/integrations/supabase/client');
      supabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(mockResponse),
      }));

      const result = await getBookingById(booking.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(booking.id);
    });

    it('should return null if booking not found', async () => {
      const { supabase } = require('@/integrations/supabase/client');
      supabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      }));

      const result = await getBookingById('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('getPractitionerStats', () => {
    it('should calculate practitioner stats for month', async () => {
      const bookings = [
        MockDataFactory.createBooking({
          status: 'completed',
          total_price_pence: 7000,
          platform_fee_pence: 105,
          practitioner_earnings_pence: 6895,
        }),
        MockDataFactory.createBooking({
          status: 'completed',
          total_price_pence: 5000,
          platform_fee_pence: 75,
          practitioner_earnings_pence: 4925,
        }),
      ];

      const mockResponse = { data: bookings, error: null };

      const { supabase } = require('@/integrations/supabase/client');
      supabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockResolvedValue(mockResponse),
      }));

      const result = await getPractitionerStats('practitioner-id', 'month');

      expect(result.totalRevenue).toBe(12000);
      expect(result.platformFees).toBe(180);
      expect(result.practitionerEarnings).toBe(11820);
      expect(result.totalBookings).toBe(2);
      expect(result.averageBookingValue).toBe(6000);
    });
  });
});

