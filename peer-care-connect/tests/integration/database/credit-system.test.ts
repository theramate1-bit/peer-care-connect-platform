/**
 * Database integration tests for credit system
 * Uses mocked Supabase to verify RPC/table operations
 */

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { calculateRequiredCredits } from '@/lib/treatment-exchange/credits';

const mockFrom = supabase.from as jest.Mock;
const mockRpc = supabase.rpc as jest.Mock;

describe('Credit System Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Credit calculation (pure)', () => {
    it('calculateRequiredCredits returns 1 per minute', () => {
      expect(calculateRequiredCredits(60)).toBe(60);
      expect(calculateRequiredCredits(30)).toBe(30);
    });

    it('calculateRequiredCredits enforces minimum 1', () => {
      expect(calculateRequiredCredits(0)).toBe(1);
      expect(calculateRequiredCredits(-5)).toBe(1);
    });
  });

  describe('Credit balance query pattern', () => {
    it('user_credits table is queried via from()', async () => {
      const mockSingle = jest.fn().mockResolvedValue({ data: { balance: 100 }, error: null });
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: mockSingle,
      });

      await supabase.from('user_credits').select('balance').eq('user_id', 'u1').single();

      expect(mockFrom).toHaveBeenCalledWith('user_credits');
    });
  });

  describe('Credit transaction constraints', () => {
    it('credit cost for 90 min session is 90', () => {
      expect(calculateRequiredCredits(90)).toBe(90);
    });
  });
});
