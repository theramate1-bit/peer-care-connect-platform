/**
 * Email Test Helpers
 * Utilities for testing email functionality
 */

export interface MockEmailRequest {
  emailType: string;
  recipientEmail: string;
  recipientName?: string;
  data: Record<string, any>;
}

export interface MockEmailResponse {
  success: boolean;
  emailId?: string;
  error?: string;
  message?: string;
}

export class EmailTestHelpers {
  /**
   * Create a mock email request
   */
  static createMockEmailRequest(overrides: Partial<MockEmailRequest> = {}): MockEmailRequest {
    return {
      emailType: overrides.emailType || 'booking_confirmation_client',
      recipientEmail: overrides.recipientEmail || 'test@example.com',
      recipientName: overrides.recipientName || 'Test User',
      data: overrides.data || {
        sessionType: 'Sports Therapy',
        sessionDate: '2024-12-25',
        sessionTime: '10:00',
        sessionDuration: 60,
        sessionPrice: 70,
        practitionerName: 'John Practitioner',
      },
    };
  }

  /**
   * Create a mock successful email response
   */
  static createMockEmailResponse(overrides: Partial<MockEmailResponse> = {}): MockEmailResponse {
    return {
      success: true,
      emailId: overrides.emailId || `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...overrides,
    };
  }

  /**
   * Create a mock failed email response
   */
  static createMockEmailError(message: string = 'Email sending failed'): MockEmailResponse {
    return {
      success: false,
      error: message,
      message,
    };
  }

  /**
   * Validate email address format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get valid email types
   */
  static getValidEmailTypes(): string[] {
    return [
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
      'peer_booking_cancelled_refunded',
    ];
  }

  /**
   * Create mock booking confirmation data
   */
  static createBookingConfirmationData(overrides: Record<string, any> = {}) {
    return {
      sessionId: 'session-123',
      sessionType: 'Sports Therapy',
      sessionDate: '2024-12-25',
      sessionTime: '10:00',
      sessionDuration: 60,
      sessionPrice: 70,
      sessionLocation: 'London',
      practitionerName: 'John Practitioner',
      ...overrides,
    };
  }

  /**
   * Create mock payment confirmation data
   */
  static createPaymentConfirmationData(overrides: Record<string, any> = {}) {
    return {
      paymentAmount: 70,
      platformFee: 1.05,
      practitionerAmount: 68.95,
      sessionType: 'Sports Therapy',
      sessionDate: '2024-12-25',
      sessionTime: '10:00',
      paymentId: 'pi_test_123',
      practitionerName: 'John Practitioner',
      ...overrides,
    };
  }

  /**
   * Create mock session reminder data
   */
  static createSessionReminderData(overrides: Record<string, any> = {}) {
    return {
      sessionType: 'Massage Therapy',
      sessionDate: '2024-12-25',
      sessionTime: '10:00',
      sessionDuration: 60,
      practitionerName: 'Jane Practitioner',
      sessionLocation: 'London',
      ...overrides,
    };
  }

  /**
   * Create mock cancellation data
   */
  static createCancellationData(overrides: Record<string, any> = {}) {
    return {
      sessionType: 'Osteopathy',
      sessionDate: '2024-12-25',
      sessionTime: '10:00',
      practitionerName: 'John Practitioner',
      cancellationReason: 'Client request',
      refundAmount: 70,
      ...overrides,
    };
  }

  /**
   * Create mock rescheduling data
   */
  static createReschedulingData(overrides: Record<string, any> = {}) {
    return {
      sessionType: 'Sports Therapy',
      originalDate: '2024-12-25',
      originalTime: '10:00',
      newDate: '2024-12-26',
      newTime: '14:00',
      practitionerName: 'John Practitioner',
      ...overrides,
    };
  }

  /**
   * Mock Supabase Edge Function invoke for emails
   */
  static mockEmailInvoke(success: boolean = true, emailId?: string) {
    return jest.fn().mockResolvedValue({
      data: success
        ? { success: true, emailId: emailId || `email_${Date.now()}` }
        : { success: false, error: 'Email sending failed' },
      error: success ? null : { message: 'Email sending failed' },
    });
  }
}

