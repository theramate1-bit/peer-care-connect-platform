/**
 * Tests that every email template renders successfully
 * Covers all 20 email types defined in render.ts
 */

jest.mock('@react-email/render', () => ({
  render: jest.fn((el: any) => '<html><body>mocked</body></html>'),
}));

import { renderEmail } from '../render';
import type { EmailType, EmailData } from '../utils/types';

const baseData: EmailData = {
  sessionId: 'test-session-123',
  sessionType: 'Sports Therapy',
  sessionDate: '2025-03-15',
  sessionTime: '14:00',
  sessionDuration: 60,
  sessionPrice: 70,
  sessionLocation: '123 Main St, London',
  practitionerName: 'Jane Smith',
  practitionerId: 'pract-1',
  clientName: 'John Client',
  clientEmail: 'client@example.com',
  paymentAmount: 70,
  platformFee: 1.05,
  practitionerAmount: 68.95,
  paymentId: 'pi_test_123',
  cancellationReason: 'Client request',
  refundAmount: 70,
  originalDate: '2025-03-15',
  originalTime: '14:00',
  newDate: '2025-03-16',
  newTime: '15:00',
  bookingUrl: 'https://theramate.co.uk/bookings',
  calendarUrl: 'https://calendar.example.com/add',
  messageUrl: 'https://theramate.co.uk/messages',
  directionsUrl: 'https://maps.google.com',
  cancellationPolicySummary: '24h notice required',
  requesterName: 'Alice Practitioner',
  messagePreview: 'Hello, following up on your session.',
  conversationId: 'conv_123',
};

const emailTypes: EmailType[] = [
  'booking_confirmation_client',
  'booking_confirmation_practitioner',
  'payment_confirmation_client',
  'payment_received_practitioner',
  'session_reminder_24h',
  'session_reminder_2h',
  'session_reminder_1h',
  'cancellation',
  'practitioner_cancellation',
  'rescheduling',
  'peer_booking_confirmed_client',
  'peer_booking_confirmed_practitioner',
  'peer_credits_deducted',
  'peer_credits_earned',
  'peer_booking_cancelled_refunded',
  'peer_request_received',
  'peer_request_accepted',
  'peer_request_declined',
  'review_request_client',
  'message_received_guest',
];

describe('All Email Templates', () => {
  it.each(emailTypes)('%s renders without throwing', (emailType) => {
    const result = renderEmail({
      emailType,
      recipientName: 'Test User',
      recipientEmail: 'test@example.com',
      data: baseData,
    });
    expect(result).toBeDefined();
    expect(result.subject).toBeDefined();
    expect(result.html).toBeDefined();
    expect(typeof result.subject).toBe('string');
    expect(typeof result.html).toBe('string');
    expect(result.html.length).toBeGreaterThan(10);
    expect(result.subject.length).toBeGreaterThan(0);
  });

  it('returns valid HTML structure for booking_confirmation_client', () => {
    const result = renderEmail({
      emailType: 'booking_confirmation_client',
      recipientName: 'John',
      data: baseData,
    });
    expect(result.html).toBeTruthy();
    expect(result.subject).toContain('Booking Confirmed');
    expect(result.subject).toContain('Sports Therapy');
    expect(result.subject).toContain('Jane Smith');
  });

  it('returns valid HTML structure for payment_confirmation_client', () => {
    const result = renderEmail({
      emailType: 'payment_confirmation_client',
      recipientName: 'John',
      data: baseData,
    });
    expect(result.html).toBeTruthy();
    expect(result.subject).toContain('Payment Confirmed');
    expect(result.subject).toContain('70');
  });

  it('returns valid HTML for session_reminder_24h', () => {
    const result = renderEmail({
      emailType: 'session_reminder_24h',
      recipientName: 'John',
      data: baseData,
    });
    expect(result.subject).toContain('tomorrow');
  });

  it('returns valid HTML for session_reminder_1h', () => {
    const result = renderEmail({
      emailType: 'session_reminder_1h',
      recipientName: 'John',
      data: baseData,
    });
    expect(result.subject).toContain('1 hour');
  });

  it('returns valid HTML for cancellation', () => {
    const result = renderEmail({
      emailType: 'cancellation',
      recipientName: 'John',
      data: baseData,
    });
    expect(result.subject).toContain('Cancelled');
  });

  it('returns valid HTML for rescheduling', () => {
    const result = renderEmail({
      emailType: 'rescheduling',
      recipientName: 'John',
      data: baseData,
    });
    expect(result.subject).toContain('Rescheduled');
  });

  it('throws for unknown email type', () => {
    expect(() =>
      renderEmail({
        emailType: 'unknown_type' as EmailType,
        data: baseData,
      })
    ).toThrow('Unknown email type');
  });
});
