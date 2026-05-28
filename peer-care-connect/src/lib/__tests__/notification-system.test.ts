/**
 * Unit tests for NotificationSystem email functionality
 */

import { NotificationSystem } from '../notification-system';
import { MockDataFactory } from '@/test/helpers/mock-factories';

// Mock Supabase client (require inside factory to avoid hoisting/init order issues)
jest.mock('@/integrations/supabase/client', () => {
  const { createTestSupabaseClient } = require('@/test/helpers/supabase-test-client');
  return { supabase: createTestSupabaseClient() };
});

// Do not mock window.location (JSDOM non-configurable). Tests use window.location.origin when needed.

describe('NotificationSystem - Email Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendBookingConfirmation', () => {
    it('should send booking confirmation emails to client and practitioner', async () => {
      const session = {
        id: 'session-123',
        client_id: 'client-123',
        therapist_id: 'practitioner-123',
        session_type: 'Sports Therapy',
        session_date: '2024-12-25',
        start_time: '10:00',
        price: 70,
        duration_minutes: 60,
        location: 'London',
        payment_status: 'completed',
        client: {
          first_name: 'John',
          last_name: 'Client',
          email: 'client@example.com',
        },
        practitioner: {
          first_name: 'Jane',
          last_name: 'Practitioner',
          email: 'practitioner@example.com',
        },
      };

      const { supabase } = require('@/integrations/supabase/client');
      
      // Mock session query
      supabase.from = jest.fn((table: string) => {
        if (table === 'client_sessions') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: session, error: null }),
          };
        }
        if (table === 'reminders') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
            insert: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      // Mock RPC calls
      supabase.rpc = jest.fn().mockResolvedValue({ data: null, error: null });

      // Mock Edge Function invoke
      supabase.functions = {
        invoke: jest.fn().mockResolvedValue({
          data: { success: true, emailId: 'email-123' },
          error: null,
        }),
      };

      await NotificationSystem.sendBookingConfirmation('session-123');

      // Verify Edge Function was called for client email
      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-email', {
        body: expect.objectContaining({
          emailType: 'booking_confirmation_client',
          recipientEmail: 'client@example.com',
          recipientName: 'John Client',
        }),
      });

      // Verify Edge Function was called for practitioner email
      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-email', {
        body: expect.objectContaining({
          emailType: 'booking_confirmation_practitioner',
          recipientEmail: 'practitioner@example.com',
          recipientName: 'Jane Practitioner',
        }),
      });
    });

    it('should handle missing session gracefully', async () => {
      const { supabase } = require('@/integrations/supabase/client');
      
      supabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      await expect(NotificationSystem.sendBookingConfirmation('invalid-session')).resolves.not.toThrow();
    });
  });

  describe('sendCancellationNotification', () => {
    it('should send cancellation email to recipient', async () => {
      const session = {
        id: 'session-123',
        client_id: 'client-123',
        therapist_id: 'practitioner-123',
        session_type: 'Sports Therapy',
        session_date: '2024-12-25',
        start_time: '10:00',
        price: 70,
        payment_status: 'completed',
        client: {
          first_name: 'John',
          last_name: 'Client',
          email: 'client@example.com',
        },
        practitioner: {
          first_name: 'Jane',
          last_name: 'Practitioner',
          email: 'practitioner@example.com',
        },
      };

      const { supabase } = require('@/integrations/supabase/client');
      
      supabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: session, error: null }),
      }));

      supabase.rpc = jest.fn().mockResolvedValue({ data: null, error: null });
      supabase.functions = {
        invoke: jest.fn().mockResolvedValue({
          data: { success: true, emailId: 'email-123' },
          error: null,
        }),
      };

      // Client cancels, so practitioner receives email
      await NotificationSystem.sendCancellationNotification('session-123', 'client-123');

      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-email', {
        body: expect.objectContaining({
          emailType: 'cancellation',
          recipientEmail: 'practitioner@example.com',
        }),
      });
    });
  });

  describe('sendReschedulingNotification', () => {
    it('should send rescheduling emails to both parties', async () => {
      const session = {
        id: 'session-123',
        client_id: 'client-123',
        therapist_id: 'practitioner-123',
        session_type: 'Massage Therapy',
        client: {
          first_name: 'John',
          last_name: 'Client',
          email: 'client@example.com',
        },
        practitioner: {
          first_name: 'Jane',
          last_name: 'Practitioner',
          email: 'practitioner@example.com',
        },
      };

      const { supabase } = require('@/integrations/supabase/client');
      
      supabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: session, error: null }),
      }));

      supabase.rpc = jest.fn().mockResolvedValue({ data: null, error: null });
      supabase.functions = {
        invoke: jest.fn().mockResolvedValue({
          data: { success: true, emailId: 'email-123' },
          error: null,
        }),
      };

      await NotificationSystem.sendReschedulingNotification(
        'session-123',
        '2024-12-25',
        '10:00',
        '2024-12-26',
        '14:00'
      );

      // Should send emails to both client and practitioner
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(2);
    });
  });

  describe('Email Error Handling', () => {
    it('should not throw when email sending fails', async () => {
      const session = {
        id: 'session-123',
        client_id: 'client-123',
        therapist_id: 'practitioner-123',
        session_type: 'Sports Therapy',
        client: {
          first_name: 'John',
          last_name: 'Client',
          email: 'client@example.com',
        },
        practitioner: {
          first_name: 'Jane',
          last_name: 'Practitioner',
          email: 'practitioner@example.com',
        },
      };

      const { supabase } = require('@/integrations/supabase/client');
      
      supabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: session, error: null }),
      }));

      supabase.rpc = jest.fn().mockResolvedValue({ data: null, error: null });
      
      // Mock email failure
      supabase.functions = {
        invoke: jest.fn().mockResolvedValue({
          data: { success: false, error: 'Email service unavailable' },
          error: null,
        }),
      };

      // Should not throw even if email fails
      await expect(
        NotificationSystem.sendBookingConfirmation('session-123')
      ).resolves.not.toThrow();
    });

    it('should handle Edge Function errors gracefully', async () => {
      const session = {
        id: 'session-123',
        client_id: 'client-123',
        therapist_id: 'practitioner-123',
        session_type: 'Sports Therapy',
        client: {
          first_name: 'John',
          last_name: 'Client',
          email: 'client@example.com',
        },
        practitioner: {
          first_name: 'Jane',
          last_name: 'Practitioner',
          email: 'practitioner@example.com',
        },
      };

      const { supabase } = require('@/integrations/supabase/client');
      
      supabase.from = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: session, error: null }),
      }));

      supabase.rpc = jest.fn().mockResolvedValue({ data: null, error: null });
      
      // Mock Edge Function error
      supabase.functions = {
        invoke: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Function error' },
        }),
      };

      // Should not throw even if Edge Function fails
      await expect(
        NotificationSystem.sendBookingConfirmation('session-123')
      ).resolves.not.toThrow();
    });
  });
});

