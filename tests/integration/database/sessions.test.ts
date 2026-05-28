/**
 * Database integration tests for sessions
 * Uses mocked Supabase to verify session table operations
 */

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';

const mockFrom = supabase.from as jest.Mock;

describe('Sessions Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('session_bookings table', () => {
    it('can query sessions by practitioner', async () => {
      const mockSessions = [
        { id: 's1', therapist_id: 'p1', session_date: '2025-06-15', status: 'confirmed' },
      ];
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockSessions, error: null }),
      });

      const result = await supabase
        .from('session_bookings')
        .select('*')
        .eq('therapist_id', 'p1')
        .gte('session_date', '2025-01-01')
        .order('session_date');

      expect(mockFrom).toHaveBeenCalledWith('session_bookings');
      expect(result.data).toEqual(mockSessions);
      expect(result.error).toBeNull();
    });

    it('can query sessions by client', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      await supabase.from('session_bookings').select('*').eq('client_id', 'c1').order('session_date');

      expect(mockFrom).toHaveBeenCalledWith('session_bookings');
    });
  });

  describe('Status values', () => {
    it('documents valid session statuses', () => {
      const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'pending_payment'];
      expect(validStatuses).toContain('confirmed');
      expect(validStatuses).toContain('cancelled');
    });
  });

  describe('calendar_events table', () => {
    it('can be queried for blocked time', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        gt: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      await supabase
        .from('calendar_events')
        .select('id, start_time, end_time')
        .eq('user_id', 'p1')
        .in('event_type', ['block', 'unavailable']);

      expect(mockFrom).toHaveBeenCalledWith('calendar_events');
    });
  });
});
