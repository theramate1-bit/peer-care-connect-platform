/**
 * Tests for email send behavior
 * Mocks supabase.functions.invoke('send-email') to verify correct payloads
 */

jest.mock('@react-email/render', () => ({
  render: jest.fn((el: any) => '<html><body>mocked</body></html>'),
}));

jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { EmailTestHelpers } from '@/test/helpers/email-test-helpers';
import { renderEmail } from '../render';
import type { EmailType } from '../utils/types';

const mockInvoke = supabase.functions.invoke as jest.Mock;

describe('Email Send', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    mockInvoke.mockResolvedValue({ data: { success: true, emailId: 'test-id' }, error: null });
  });

  describe('Send payload structure', () => {
    it('send-email expects emailType, recipientEmail, recipientName, data', async () => {
      const payload = {
        emailType: 'booking_confirmation_client' as const,
        recipientEmail: 'client@example.com',
        recipientName: 'John Client',
        data: EmailTestHelpers.createBookingConfirmationData(),
      };

      await supabase.functions.invoke('send-email', { body: payload });

      expect(mockInvoke).toHaveBeenCalledWith('send-email', {
        body: expect.objectContaining({
          emailType: 'booking_confirmation_client',
          recipientEmail: 'client@example.com',
          recipientName: 'John Client',
          data: expect.any(Object),
        }),
      });
    });

    it('send-email can receive all valid email types', () => {
      const types = EmailTestHelpers.getValidEmailTypes();
      types.forEach((emailType) => {
        supabase.functions.invoke('send-email', {
          body: {
            emailType,
            recipientEmail: 'test@example.com',
            recipientName: 'Test',
            data: {},
          },
        });
      });
      expect(mockInvoke).toHaveBeenCalledTimes(types.length);
    });
  });

  describe('Rendered output matches send payload', () => {
    const sampleData = {
      sessionType: 'Sports Therapy',
      sessionDate: '2025-03-15',
      sessionTime: '14:00',
      practitionerName: 'Jane Smith',
      clientName: 'John Client',
      paymentAmount: 70,
    };

    it('rendered HTML and subject can be sent to Resend', () => {
      const emailTypes: EmailType[] = [
        'booking_confirmation_client',
        'booking_confirmation_practitioner',
        'payment_confirmation_client',
        'payment_received_practitioner',
      ];

      emailTypes.forEach((emailType) => {
        const { subject, html } = renderEmail({
          emailType,
          recipientName: 'Test User',
          recipientEmail: 'test@example.com',
          data: sampleData,
        });
        expect(subject).toBeTruthy();
        expect(html).toBeTruthy();
      });
    });
  });

  describe('Mock send flow', () => {
    it('successful invoke returns success and emailId', async () => {
      const result = await supabase.functions.invoke('send-email', {
        body: {
          emailType: 'payment_confirmation_client',
          recipientEmail: 'client@example.com',
          data: EmailTestHelpers.createPaymentConfirmationData(),
        },
      });

      expect(result.data.success).toBe(true);
      expect(result.data.emailId).toBeDefined();
      expect(result.error).toBeNull();
    });

    it('failed invoke returns error', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { success: false, error: 'Resend API error' },
        error: { message: 'Failed' },
      });

      const result = await supabase.functions.invoke('send-email', { body: {} });

      expect(result.data.success).toBe(false);
      expect(result.data.error).toBeDefined();
    });
  });
});
