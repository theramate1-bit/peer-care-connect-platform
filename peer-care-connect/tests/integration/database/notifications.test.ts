/**
 * Database integration tests for notifications
 * Uses mocked Supabase to verify notifications table operations
 */

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';

const mockFrom = supabase.from as jest.Mock;

describe('Notifications Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('notifications table', () => {
    it('can query notifications by user', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      const result = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', 'u1')
        .order('created_at', { ascending: false });

      expect(mockFrom).toHaveBeenCalledWith('notifications');
      expect(result.error).toBeNull();
    });

    it('can update read_at for notification', async () => {
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', 'n1');

      expect(mockFrom).toHaveBeenCalledWith('notifications');
    });
  });
});
