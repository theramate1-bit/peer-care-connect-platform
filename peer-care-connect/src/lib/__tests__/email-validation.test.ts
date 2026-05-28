/**
 * Unit tests for email validation and formatting
 */

import { describe, it, expect } from '@jest/globals';

/**
 * Validate email address format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate email request data
 */
function validateEmailRequest(data: {
  emailType: string;
  recipientEmail: string;
  recipientName?: string;
  data?: any;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.emailType || typeof data.emailType !== 'string') {
    errors.push('emailType is required and must be a string');
  }

  if (!data.recipientEmail || typeof data.recipientEmail !== 'string') {
    errors.push('recipientEmail is required and must be a string');
  } else if (!isValidEmail(data.recipientEmail)) {
    errors.push('recipientEmail must be a valid email address');
  }

  if (data.recipientName && (typeof data.recipientName !== 'string' || data.recipientName.length > 200)) {
    errors.push('recipientName must be a string with max 200 characters');
  }

  const validEmailTypes = [
    'booking_confirmation_client',
    'booking_confirmation_practitioner',
    'payment_confirmation_client',
    'payment_received_practitioner',
    'session_reminder_24h',
    'session_reminder_1h',
    'cancellation',
    'rescheduling',
    'peer_booking_confirmed_client',
    'peer_booking_confirmed_practitioner',
    'peer_credits_deducted',
    'peer_credits_earned',
    'peer_booking_cancelled_refunded'
  ];

  if (data.emailType && !validEmailTypes.includes(data.emailType)) {
    errors.push(`Invalid emailType. Must be one of: ${validEmailTypes.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

describe('Email Validation', () => {
  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
      expect(isValidEmail('user space@example.com')).toBe(false);
    });
  });

  describe('validateEmailRequest', () => {
    it('should validate correct email request', () => {
      const request = {
        emailType: 'booking_confirmation_client',
        recipientEmail: 'client@example.com',
        recipientName: 'John Client',
        data: {
          sessionType: 'Sports Therapy',
          sessionDate: '2024-12-25'
        }
      };

      const result = validateEmailRequest(request);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing emailType', () => {
      const request = {
        emailType: '',
        recipientEmail: 'client@example.com'
      };

      const result = validateEmailRequest(request);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('emailType is required and must be a string');
    });

    it('should reject missing recipientEmail', () => {
      const request = {
        emailType: 'booking_confirmation_client',
        recipientEmail: ''
      };

      const result = validateEmailRequest(request);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('recipientEmail is required and must be a string');
    });

    it('should reject invalid email format', () => {
      const request = {
        emailType: 'booking_confirmation_client',
        recipientEmail: 'invalid-email'
      };

      const result = validateEmailRequest(request);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('recipientEmail must be a valid email address');
    });

    it('should reject invalid emailType', () => {
      const request = {
        emailType: 'invalid_type',
        recipientEmail: 'client@example.com'
      };

      const result = validateEmailRequest(request);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid emailType'))).toBe(true);
    });

    it('should reject recipientName that is too long', () => {
      const longName = 'a'.repeat(201);
      const request = {
        emailType: 'booking_confirmation_client',
        recipientEmail: 'client@example.com',
        recipientName: longName
      };

      const result = validateEmailRequest(request);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('recipientName must be a string with max 200 characters');
    });

    it('should accept valid recipientName', () => {
      const request = {
        emailType: 'booking_confirmation_client',
        recipientEmail: 'client@example.com',
        recipientName: 'John Client'
      };

      const result = validateEmailRequest(request);

      expect(result.valid).toBe(true);
    });

    it('should accept request without recipientName', () => {
      const request = {
        emailType: 'booking_confirmation_client',
        recipientEmail: 'client@example.com'
      };

      const result = validateEmailRequest(request);

      expect(result.valid).toBe(true);
    });
  });

  describe('Email Type Validation', () => {
    const validTypes = [
      'booking_confirmation_client',
      'booking_confirmation_practitioner',
      'payment_confirmation_client',
      'payment_received_practitioner',
      'session_reminder_24h',
      'session_reminder_1h',
      'cancellation',
      'rescheduling',
      'peer_booking_confirmed_client',
      'peer_booking_confirmed_practitioner',
      'peer_credits_deducted',
      'peer_credits_earned',
      'peer_booking_cancelled_refunded'
    ];

    validTypes.forEach(emailType => {
      it(`should accept valid email type: ${emailType}`, () => {
        const request = {
          emailType,
          recipientEmail: 'test@example.com'
        };

        const result = validateEmailRequest(request);

        expect(result.valid).toBe(true);
      });
    });
  });
});

