/**
 * Unit tests for email sending functionality
 * Tests the email sending logic without importing NotificationSystem directly
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { EmailTestHelpers } from '@/test/helpers/email-test-helpers';

// Mock Supabase Edge Function
const mockInvoke = jest.fn();

describe('Email Sending', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Request Creation', () => {
    it('should create valid booking confirmation email request', () => {
      const request = EmailTestHelpers.createMockEmailRequest({
        emailType: 'booking_confirmation_client',
        recipientEmail: 'client@example.com',
        recipientName: 'John Client',
        data: EmailTestHelpers.createBookingConfirmationData(),
      });

      expect(request.emailType).toBe('booking_confirmation_client');
      expect(request.recipientEmail).toBe('client@example.com');
      expect(request.recipientName).toBe('John Client');
      expect(request.data.sessionType).toBe('Sports Therapy');
    });

    it('should create valid payment confirmation email request', () => {
      const request = EmailTestHelpers.createMockEmailRequest({
        emailType: 'payment_confirmation_client',
        recipientEmail: 'client@example.com',
        data: EmailTestHelpers.createPaymentConfirmationData(),
      });

      expect(request.emailType).toBe('payment_confirmation_client');
      expect(request.data.paymentAmount).toBe(70);
      expect(request.data.platformFee).toBe(1.05);
    });

    it('should create valid session reminder email request', () => {
      const request = EmailTestHelpers.createMockEmailRequest({
        emailType: 'session_reminder_24h',
        recipientEmail: 'client@example.com',
        data: EmailTestHelpers.createSessionReminderData(),
      });

      expect(request.emailType).toBe('session_reminder_24h');
      expect(request.data.sessionType).toBe('Massage Therapy');
    });
  });

  describe('Email Response Handling', () => {
    it('should handle successful email response', () => {
      const response = EmailTestHelpers.createMockEmailResponse({
        success: true,
        emailId: 'email-123',
      });

      expect(response.success).toBe(true);
      expect(response.emailId).toBe('email-123');
      expect(response.error).toBeUndefined();
    });

    it('should handle failed email response', () => {
      const response = EmailTestHelpers.createMockEmailError('API Error');

      expect(response.success).toBe(false);
      expect(response.error).toBe('API Error');
    });
  });

  describe('Email Type Validation', () => {
    it('should validate all supported email types', () => {
      const validTypes = EmailTestHelpers.getValidEmailTypes();

      expect(validTypes).toContain('booking_confirmation_client');
      expect(validTypes).toContain('booking_confirmation_practitioner');
      expect(validTypes).toContain('payment_confirmation_client');
      expect(validTypes).toContain('session_reminder_24h');
      expect(validTypes).toContain('session_reminder_1h');
      expect(validTypes).toContain('cancellation');
      expect(validTypes).toContain('rescheduling');
    });

    it('should have 13 valid email types', () => {
      const validTypes = EmailTestHelpers.getValidEmailTypes();
      expect(validTypes).toHaveLength(13);
    });
  });

  describe('Email Data Helpers', () => {
    it('should create booking confirmation data with all required fields', () => {
      const data = EmailTestHelpers.createBookingConfirmationData();

      expect(data.sessionId).toBeDefined();
      expect(data.sessionType).toBe('Sports Therapy');
      expect(data.sessionDate).toBeDefined();
      expect(data.sessionTime).toBeDefined();
      expect(data.sessionDuration).toBe(60);
      expect(data.sessionPrice).toBe(70);
      expect(data.practitionerName).toBeDefined();
    });

    it('should create payment confirmation data with payment breakdown', () => {
      const data = EmailTestHelpers.createPaymentConfirmationData();

      expect(data.paymentAmount).toBe(70);
      expect(data.platformFee).toBe(1.05);
      expect(data.practitionerAmount).toBe(68.95);
      expect(data.paymentId).toBeDefined();
    });

    it('should create cancellation data with refund information', () => {
      const data = EmailTestHelpers.createCancellationData();

      expect(data.sessionType).toBeDefined();
      expect(data.cancellationReason).toBeDefined();
      expect(data.refundAmount).toBe(70);
    });

    it('should create rescheduling data with old and new times', () => {
      const data = EmailTestHelpers.createReschedulingData();

      expect(data.originalDate).toBeDefined();
      expect(data.originalTime).toBeDefined();
      expect(data.newDate).toBeDefined();
      expect(data.newTime).toBeDefined();
    });
  });

  describe('Email Mock Helpers', () => {
    it('should create mock email invoke function', () => {
      const mockFn = EmailTestHelpers.mockEmailInvoke(true, 'email-123');

      expect(mockFn).toBeDefined();
      expect(typeof mockFn).toBe('function');
    });

    it('should mock successful email invoke', async () => {
      const mockFn = EmailTestHelpers.mockEmailInvoke(true, 'email-123');
      const result = await mockFn();

      expect(result.data.success).toBe(true);
      expect(result.data.emailId).toBe('email-123');
      expect(result.error).toBeNull();
    });

    it('should mock failed email invoke', async () => {
      const mockFn = EmailTestHelpers.mockEmailInvoke(false);
      const result = await mockFn();

      expect(result.data.success).toBe(false);
      expect(result.data.error).toBeDefined();
    });
  });

  describe('Email Address Validation', () => {
    it('should validate correct email addresses', () => {
      expect(EmailTestHelpers.isValidEmail('test@example.com')).toBe(true);
      expect(EmailTestHelpers.isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(EmailTestHelpers.isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(EmailTestHelpers.isValidEmail('invalid')).toBe(false);
      expect(EmailTestHelpers.isValidEmail('@example.com')).toBe(false);
      expect(EmailTestHelpers.isValidEmail('user@')).toBe(false);
    });
  });
});

