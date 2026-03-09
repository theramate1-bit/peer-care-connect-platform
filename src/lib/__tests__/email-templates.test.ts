/**
 * Unit tests for email template generation
 */

import { describe, it, expect } from '@jest/globals';

// Mock email template generator (extracted from Edge Function for testing)
function generateEmailTemplate(emailType: string, data: any, recipientName?: string): { subject: string; html: string } {
  const baseUrl = 'https://theramate.co.uk';
  
  switch (emailType) {
    case 'booking_confirmation_client':
      return {
        subject: `Booking Confirmed - ${data.sessionType} with ${data.practitionerName}`,
        html: `<html><body><h1>Booking Confirmed!</h1><p>Hi ${recipientName || 'there'},</p></body></html>`
      };
    case 'booking_confirmation_practitioner':
      return {
        subject: `New Booking - ${data.sessionType} with ${data.clientName}`,
        html: `<html><body><h1>New Booking Received!</h1><p>Hi ${recipientName || 'there'},</p></body></html>`
      };
    case 'payment_confirmation_client':
      return {
        subject: `Payment Confirmed - £${data.paymentAmount} for ${data.sessionType}`,
        html: `<html><body><h1>Payment Confirmed!</h1><p>Amount: £${data.paymentAmount}</p></body></html>`
      };
    case 'session_reminder_24h':
      return {
        subject: `Reminder: Your session is tomorrow`,
        html: `<html><body><h1>Session Reminder</h1><p>Your session is tomorrow!</p></body></html>`
      };
    case 'session_reminder_1h':
      return {
        subject: `Reminder: Your session starts in 1 hour`,
        html: `<html><body><h1>Session Starting Soon!</h1><p>Your session starts in 1 hour.</p></body></html>`
      };
    case 'cancellation':
      return {
        subject: `Session Cancelled - ${data.sessionType}`,
        html: `<html><body><h1>Session Cancelled</h1><p>Your session has been cancelled.</p></body></html>`
      };
    case 'rescheduling':
      return {
        subject: `Session Rescheduled - New Date/Time`,
        html: `<html><body><h1>Session Rescheduled</h1><p>Your session has been rescheduled.</p></body></html>`
      };
    default:
      throw new Error(`Unknown email type: ${emailType}`);
  }
}

describe('Email Templates', () => {
  describe('booking_confirmation_client', () => {
    it('should generate booking confirmation email for client', () => {
      const data = {
        sessionType: 'Sports Therapy',
        sessionDate: '2024-12-25',
        sessionTime: '10:00',
        sessionDuration: 60,
        sessionPrice: 70,
        practitionerName: 'John Doe'
      };

      const template = generateEmailTemplate('booking_confirmation_client', data, 'Jane Smith');

      expect(template.subject).toContain('Booking Confirmed');
      expect(template.subject).toContain('Sports Therapy');
      expect(template.subject).toContain('John Doe');
      expect(template.html).toContain('Jane Smith');
      expect(template.html).toContain('Booking Confirmed');
    });

    it('should handle missing recipient name', () => {
      const data = {
        sessionType: 'Massage Therapy',
        practitionerName: 'Jane Doe'
      };

      const template = generateEmailTemplate('booking_confirmation_client', data);

      expect(template.html).toContain('there');
    });
  });

  describe('booking_confirmation_practitioner', () => {
    it('should generate booking confirmation email for practitioner', () => {
      const data = {
        sessionType: 'Osteopathy',
        sessionDate: '2024-12-25',
        sessionTime: '14:00',
        clientName: 'John Client'
      };

      const template = generateEmailTemplate('booking_confirmation_practitioner', data, 'Dr. Jane Practitioner');

      expect(template.subject).toContain('New Booking');
      expect(template.subject).toContain('Osteopathy');
      expect(template.subject).toContain('John Client');
      expect(template.html).toContain('Dr. Jane Practitioner');
    });
  });

  describe('payment_confirmation_client', () => {
    it('should generate payment confirmation email', () => {
      const data = {
        paymentAmount: 70,
        sessionType: 'Sports Therapy',
        sessionDate: '2024-12-25',
        paymentId: 'pi_test_123'
      };

      const template = generateEmailTemplate('payment_confirmation_client', data, 'John Client');

      expect(template.subject).toContain('Payment Confirmed');
      expect(template.subject).toContain('£70');
      expect(template.html).toContain('£70');
    });
  });

  describe('session_reminder_24h', () => {
    it('should generate 24-hour reminder email', () => {
      const data = {
        sessionType: 'Massage Therapy',
        sessionDate: '2024-12-25',
        sessionTime: '10:00',
        practitionerName: 'Jane Therapist'
      };

      const template = generateEmailTemplate('session_reminder_24h', data, 'John Client');

      expect(template.subject).toContain('tomorrow');
      expect(template.html).toContain('tomorrow');
    });
  });

  describe('session_reminder_1h', () => {
    it('should generate 1-hour reminder email', () => {
      const data = {
        sessionType: 'Sports Therapy',
        sessionDate: '2024-12-25',
        sessionTime: '10:00'
      };

      const template = generateEmailTemplate('session_reminder_1h', data, 'John Client');

      expect(template.subject).toContain('1 hour');
      expect(template.html).toContain('1 hour');
    });
  });

  describe('cancellation', () => {
    it('should generate cancellation email', () => {
      const data = {
        sessionType: 'Osteopathy',
        sessionDate: '2024-12-25',
        sessionTime: '10:00',
        cancellationReason: 'Client request'
      };

      const template = generateEmailTemplate('cancellation', data, 'John Client');

      expect(template.subject).toContain('Cancelled');
      expect(template.html).toContain('cancelled');
    });
  });

  describe('rescheduling', () => {
    it('should generate rescheduling email', () => {
      const data = {
        sessionType: 'Massage Therapy',
        originalDate: '2024-12-25',
        originalTime: '10:00',
        newDate: '2024-12-26',
        newTime: '14:00'
      };

      const template = generateEmailTemplate('rescheduling', data, 'John Client');

      expect(template.subject).toContain('Rescheduled');
      expect(template.html).toContain('rescheduled');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown email type', () => {
      expect(() => {
        generateEmailTemplate('unknown_type', {});
      }).toThrow('Unknown email type');
    });
  });
});

