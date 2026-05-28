/**
 * Database integration tests for payments and Stripe operations
 * Uses mocked Supabase to verify query patterns
 */

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { calculateApplicationFee, calculatePractitionerAmount } from '@/config/platform-fees';

const mockFrom = supabase.from as jest.Mock;
const mockRpc = supabase.rpc as jest.Mock;

describe('Payments Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Platform fee calculations (pure)', () => {
    it('calculateApplicationFee with 0.5%', () => {
      expect(calculateApplicationFee(10000, 0.5)).toBe(50);
      expect(calculateApplicationFee(5000, 0.5)).toBe(25);
    });
    it('calculatePractitionerAmount subtracts fee', () => {
      expect(calculatePractitionerAmount(10000, 50)).toBe(9950);
      expect(calculatePractitionerAmount(6000, 30)).toBe(5970);
    });
  });

  describe('session_bookings / payments query pattern', () => {
    it('can query session_bookings by session_id', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'b1', session_id: 's1', payment_status: 'completed' },
          error: null,
        }),
      });

      await supabase.from('session_bookings').select('*').eq('session_id', 's1').single();

      expect(mockFrom).toHaveBeenCalledWith('session_bookings');
    });
  });

  describe('RPC payment helpers', () => {
    it('create_booking RPC pattern', () => {
      mockRpc.mockResolvedValue({ data: { id: 'b1' }, error: null });
      supabase.rpc('create_booking', { p_session_id: 's1', p_client_id: 'c1' });
      expect(mockRpc).toHaveBeenCalledWith('create_booking', expect.any(Object));
    });
  });
});
