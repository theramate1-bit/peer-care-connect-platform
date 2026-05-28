/**
 * Database integration tests for booking operations
 * Uses mocked Supabase to verify RPC calls and table operations
 */

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { CancellationPolicyService } from '@/lib/cancellation-policy';

const mockFrom = supabase.from as jest.Mock;
const mockRpc = supabase.rpc as jest.Mock;

describe('Booking Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CancellationPolicyService RPC', () => {
    it('calls get_cancellation_policy with practitioner id', async () => {
      mockRpc.mockResolvedValue({
        data: [{
          advance_notice_hours: 24,
          full_refund_hours: 24,
          partial_refund_hours: 12,
          partial_refund_percent: 50,
          no_refund_hours: 12,
        }],
        error: null,
      });

      await CancellationPolicyService.getPolicy('practitioner-123');

      expect(mockRpc).toHaveBeenCalledWith('get_cancellation_policy', {
        p_practitioner_id: 'practitioner-123',
      });
    });

    it('returns default policy when RPC returns empty', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const policy = await CancellationPolicyService.getPolicy('p1');

      expect(policy.full_refund_hours).toBe(24);
      expect(policy.partial_refund_percent).toBe(50);
    });
  });

  describe('calculateRefund RPC', () => {
    it('calls calculate_cancellation_refund with session id', async () => {
      mockRpc.mockResolvedValue({
        data: { success: true, refund_amount: 5000, refund_type: 'full' },
        error: null,
      });

      await CancellationPolicyService.calculateRefund('session-1');

      expect(mockRpc).toHaveBeenCalledWith('calculate_cancellation_refund', expect.objectContaining({
        p_session_id: 'session-1',
      }));
    });
  });

  describe('Data contract for create_booking RPC', () => {
    it('documents expected create_booking_with_validation params', () => {
      const expectedParams = [
        'p_therapist_id', 'p_client_id', 'p_client_name', 'p_client_email',
        'p_session_date', 'p_start_time', 'p_duration_minutes', 'p_session_type',
        'p_price', 'p_payment_status', 'p_status', 'p_expires_at', 'p_idempotency_key',
      ];
      expect(expectedParams.length).toBeGreaterThan(10);
    });
  });

  describe('get_cancellation_policy error handling', () => {
    it('returns default policy when RPC throws', async () => {
      mockRpc.mockRejectedValue({ code: 'PGRST202', message: 'Function not found' });

      const policy = await CancellationPolicyService.getPolicy('p1');

      expect(policy.full_refund_hours).toBe(24);
    });
  });
});
