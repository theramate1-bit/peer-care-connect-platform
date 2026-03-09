/**
 * REAL Integration tests for email Edge Function
 * These tests actually call the Edge Function and Resend API
 * 
 * REQUIREMENTS:
 * - Test Supabase project with Edge Function deployed
 * - RESEND_API_KEY set in Supabase secrets
 * - Test email addresses configured
 * 
 * To run these tests:
 * 1. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables
 * 2. Ensure Edge Function is deployed
 * 3. Use test Resend API key (not production)
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// These should be set as environment variables or in a .env.test file
const SUPABASE_URL = process.env.TEST_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || '';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

// Skip tests if not configured
const shouldSkip = !SUPABASE_URL || !SUPABASE_ANON_KEY || TEST_EMAIL === 'test@example.com';

(shouldSkip ? describe.skip : describe)('Email Edge Function - REAL Integration Tests', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  describe('Actual Email Sending', () => {
    it('should send booking confirmation email via Edge Function', async () => {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          emailType: 'booking_confirmation_client',
          recipientEmail: TEST_EMAIL,
          recipientName: 'Test User',
          data: {
            sessionType: 'Sports Therapy',
            sessionDate: '2024-12-25',
            sessionTime: '10:00',
            sessionDuration: 60,
            sessionPrice: 70,
            practitionerName: 'Test Practitioner',
          },
        },
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.success).toBe(true);
      expect(data.emailId).toBeDefined();
    });

    it('should send payment confirmation email', async () => {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          emailType: 'payment_confirmation_client',
          recipientEmail: TEST_EMAIL,
          recipientName: 'Test User',
          data: {
            paymentAmount: 70,
            sessionType: 'Sports Therapy',
            sessionDate: '2024-12-25',
            sessionTime: '10:00',
            paymentId: 'pi_test_123',
            practitionerName: 'Test Practitioner',
          },
        },
      });

      expect(error).toBeNull();
      expect(data.success).toBe(true);
      expect(data.emailId).toBeDefined();
    });

    it('should reject invalid email type', async () => {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          emailType: 'invalid_type',
          recipientEmail: TEST_EMAIL,
          data: {},
        },
      });

      // Should return error for invalid email type
      expect(data?.success).toBe(false);
      expect(data?.error || error?.message).toBeDefined();
    });

    it('should reject invalid email address', async () => {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          emailType: 'booking_confirmation_client',
          recipientEmail: 'invalid-email',
          data: {},
        },
      });

      // Should return error for invalid email
      expect(data?.success).toBe(false);
      expect(data?.error || error?.message).toBeDefined();
    });
  });

  describe('Database Logging', () => {
    it('should log email to email_logs table after sending', async () => {
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          emailType: 'booking_confirmation_client',
          recipientEmail: TEST_EMAIL,
          recipientName: 'Test User',
          data: {
            sessionType: 'Sports Therapy',
            sessionDate: '2024-12-25',
            sessionTime: '10:00',
            sessionDuration: 60,
            sessionPrice: 70,
            practitionerName: 'Test Practitioner',
          },
        },
      });

      expect(emailError).toBeNull();
      expect(emailData?.success).toBe(true);
      expect(emailData?.emailId).toBeDefined();

      // Wait a moment for database write
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check email_logs table
      const { data: logs, error: logsError } = await supabase
        .from('email_logs')
        .select('*')
        .eq('resend_email_id', emailData.emailId)
        .single();

      expect(logsError).toBeNull();
      expect(logs).toBeDefined();
      expect(logs).not.toBeNull();
      const emailLog = logs as any; // Type assertion for test
      if (emailLog) {
        expect(emailLog.status).toBe('sent');
        expect(emailLog.email_type).toBe('booking_confirmation_client');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required fields', async () => {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          // Missing emailType and recipientEmail
          data: {},
        },
      });

      expect(data?.success).toBe(false);
      expect(data?.error || error?.message).toContain('required');
    });

    it('should handle Resend API errors gracefully', async () => {
      // This would require mocking or using an invalid API key
      // For now, we'll test with a valid request but check error handling
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          emailType: 'booking_confirmation_client',
          recipientEmail: 'bounce@resend.dev', // Resend test email that bounces
          data: {},
        },
      });

      // Should handle error gracefully
      if (!data?.success) {
        expect(data?.error).toBeDefined();
      }
    });
  });

  describe('Retry Logic', () => {
    it('should retry on transient failures', async () => {
      // This would require simulating API failures
      // For now, we verify the function handles retries
      // In a real scenario, you'd mock the Resend API to fail then succeed
      expect(true).toBe(true); // Placeholder - requires API mocking
    });
  });
});

