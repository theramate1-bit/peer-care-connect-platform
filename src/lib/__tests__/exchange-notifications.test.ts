/**
 * Tests for ExchangeNotificationService and types
 */
import {
  ExchangeNotificationType,
  ExchangeNotificationService,
  type ExchangeNotificationPayload,
} from '../exchange-notifications';

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    functions: { invoke: jest.fn() },
  },
}));

jest.mock('../push-notifications', () => ({
  PushNotificationService: {
    getInstance: jest.fn().mockReturnValue({
      sendLocalNotification: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

import { supabase } from '@/integrations/supabase/client';

const mockFrom = supabase.from as jest.Mock;
const mockRpc = supabase.rpc as jest.Mock;
const mockInvoke = supabase.functions.invoke as jest.Mock;

describe('ExchangeNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
  });

  describe('ExchangeNotificationType', () => {
    it('has expected enum values', () => {
      expect(ExchangeNotificationType.EXCHANGE_REQUEST_RECEIVED).toBe('exchange_request_received');
      expect(ExchangeNotificationType.EXCHANGE_REQUEST_ACCEPTED).toBe('exchange_request_accepted');
      expect(ExchangeNotificationType.EXCHANGE_REQUEST_DECLINED).toBe('exchange_request_declined');
      expect(ExchangeNotificationType.EXCHANGE_SLOT_HELD).toBe('exchange_slot_held');
      expect(ExchangeNotificationType.EXCHANGE_SLOT_RELEASED).toBe('exchange_slot_released');
    });
  });

  describe('sendExchangeRequestNotification', () => {
    const payload: ExchangeNotificationPayload = {
      type: ExchangeNotificationType.EXCHANGE_REQUEST_RECEIVED,
      requestId: 'req-1',
      practitionerId: 'p1',
      practitionerName: 'Jane Doe',
      sessionDate: '2025-03-20',
      startTime: '14:00:00',
      duration: 60,
      actionRequired: true,
    };

    beforeEach(() => {
      mockRpc.mockResolvedValue({ data: 'n1', error: null });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { email: 'jane@example.com', first_name: 'Jane', last_name: 'Doe' },
              error: null,
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { id: 'n1' }, error: null }),
        };
      });
    });

    it('creates notification and sends email when recipient has email', async () => {
      const id = await ExchangeNotificationService.sendExchangeRequestNotification('u1', payload);

      expect(id).toBe('n1');
      expect(mockRpc).toHaveBeenCalledWith('create_notification', expect.any(Object));
      expect(mockInvoke).toHaveBeenCalledWith('send-email', expect.any(Object));
    });
  });
});
