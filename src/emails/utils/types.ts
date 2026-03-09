export interface EmailData {
  // Session data
  sessionId?: string;
  sessionType?: string;
  sessionDate?: string;
  sessionTime?: string;
  sessionPrice?: number;
  sessionDuration?: number;
  sessionLocation?: string;

  // User data
  clientName?: string;
  clientEmail?: string;
  practitionerName?: string;
  practitionerEmail?: string;
  practitionerId?: string; // For profile links

  // Payment data
  paymentAmount?: number;
  platformFee?: number;
  practitionerAmount?: number;
  paymentId?: string;

  // Additional data
  cancellationReason?: string;
  refundAmount?: number;
  refundPercent?: number;
  originalDate?: string;
  originalTime?: string;
  newDate?: string;
  newTime?: string;
  bookingUrl?: string;
  calendarUrl?: string;
  messageUrl?: string;
  directionsUrl?: string;
  cancellationPolicySummary?: string;
  clientFirstName?: string;
  practitionerFirstName?: string;
  // Exchange request data
  requestId?: string;
  requesterName?: string;
  recipientName?: string;
  expiresAt?: string;
  acceptUrl?: string;
  declineUrl?: string;
  // Guest messaging data
  messagePreview?: string;
  conversationId?: string;
  paymentStatus?: string;
  // Mobile/Hybrid therapist data
  therapistType?: 'clinic_based' | 'mobile' | 'hybrid';
  serviceType?: 'clinic' | 'mobile' | 'both';
}

export type EmailType =
  | 'booking_confirmation_client'
  | 'booking_confirmation_practitioner'
  | 'payment_confirmation_client'
  | 'payment_received_practitioner'
  | 'session_reminder_24h'
  | 'session_reminder_2h'
  | 'session_reminder_1h'
  | 'cancellation'
  | 'practitioner_cancellation'
  | 'rescheduling'
  | 'peer_booking_confirmed_client'
  | 'peer_booking_confirmed_practitioner'
  | 'peer_credits_deducted'
  | 'peer_credits_earned'
  | 'peer_booking_cancelled_refunded'
  | 'peer_request_received'
  | 'peer_request_accepted'
  | 'peer_request_declined'
  | 'review_request_client'
  | 'message_received_guest';


