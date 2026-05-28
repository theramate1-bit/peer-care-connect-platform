/**
 * Tests for RescheduleService
 */
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { RescheduleService } from '../reschedule-service';
import { supabase } from '@/integrations/supabase/client';

const mockFrom = supabase.from as jest.Mock;

describe('RescheduleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-03-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('canReschedule', () => {
    it('returns canReschedule false when session not found', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
      });

      const result = await RescheduleService.canReschedule('invalid-id');

      expect(result.canReschedule).toBe(false);
      expect(result.reason).toBe('Session not found');
    });

    it('returns canReschedule false for cancelled session', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 's1',
            session_date: '2025-03-20',
            start_time: '14:00:00',
            status: 'cancelled',
            therapist_id: 't1',
          },
          error: null,
        }),
      });

      const result = await RescheduleService.canReschedule('s1');

      expect(result.canReschedule).toBe(false);
      expect(result.reason).toContain('cancelled');
    });

    it('returns canReschedule false for past session', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 's1',
            session_date: '2025-03-10',
            start_time: '10:00:00',
            status: 'scheduled',
            therapist_id: 't1',
          },
          error: null,
        }),
      });

      const result = await RescheduleService.canReschedule('s1');

      expect(result.canReschedule).toBe(false);
      expect(result.reason).toContain('past');
    });

    it('returns canReschedule false when less than 24h notice', async () => {
      // Now is 2025-03-15 12:00 UTC; session is 2025-03-16 08:00 UTC = 20h away
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 's1',
            session_date: '2025-03-16',
            start_time: '08:00:00',
            status: 'scheduled',
            therapist_id: 't1',
          },
          error: null,
        }),
      });

      const result = await RescheduleService.canReschedule('s1');

      expect(result.canReschedule).toBe(false);
      expect(result.reason).toContain('24 hours');
    });

    it('returns canReschedule true for valid scheduled session', async () => {
      // Now is 2025-03-15 12:00; session is 2025-03-20 14:00 = 5 days away
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 's1',
            session_date: '2025-03-20',
            start_time: '14:00:00',
            status: 'scheduled',
            therapist_id: 't1',
          },
          error: null,
        }),
      });

      const result = await RescheduleService.canReschedule('s1');

      expect(result.canReschedule).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });
});
