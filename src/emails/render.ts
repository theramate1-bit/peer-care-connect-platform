import { render } from '@react-email/render';
import * as React from 'react';
import { EmailData, EmailType } from './utils/types';
import {
  ModernBookingConfirmationClient,
  ModernBookingConfirmationPractitioner,
  ModernCancellation,
  ModernMessageReceivedGuest,
  ModernPaymentConfirmationClient,
  ModernPaymentReceivedPractitioner,
  ModernPeerBookingCancelledRefunded,
  ModernPeerBookingConfirmedClient,
  ModernPeerBookingConfirmedPractitioner,
  ModernPeerCreditsDeducted,
  ModernPeerCreditsEarned,
  ModernPeerRequestAccepted,
  ModernPeerRequestDeclined,
  ModernPeerRequestReceived,
  ModernPractitionerCancellation,
  ModernRescheduling,
  ModernReviewRequestClient,
  ModernSessionReminder1h,
  ModernSessionReminder24h,
  ModernSessionReminder2h,
} from './templates';

interface RenderEmailOptions {
  emailType: EmailType;
  recipientName?: string;
  recipientEmail?: string;
  data: EmailData;
  baseUrl?: string;
}

export function renderEmail({
  emailType,
  recipientName,
  recipientEmail,
  data,
  baseUrl = 'https://theramate.co.uk',
}: RenderEmailOptions): { subject: string; html: string } {
  const props = {
    recipientName,
    recipientEmail,
    data,
    baseUrl,
  };

  let Component: React.ComponentType<any>;
  let subject: string;

  switch (emailType) {
    case 'booking_confirmation_client':
      Component = ModernBookingConfirmationClient;
      subject = `Booking Confirmed - ${data.sessionType} with ${data.practitionerName}`;
      break;
    case 'booking_confirmation_practitioner':
      Component = ModernBookingConfirmationPractitioner;
      subject = `New Booking - ${data.sessionType} with ${data.clientName}`;
      break;
    case 'payment_confirmation_client':
      Component = ModernPaymentConfirmationClient;
      subject = `Payment Confirmed - £${data.paymentAmount} for ${data.sessionType}`;
      break;
    case 'payment_received_practitioner':
      Component = ModernPaymentReceivedPractitioner;
      subject = `Payment Received - £${data.practitionerAmount} from ${data.clientName}`;
      break;
    case 'session_reminder_24h':
      Component = ModernSessionReminder24h;
      subject = `Reminder: Your session is tomorrow`;
      break;
    case 'session_reminder_2h':
      Component = ModernSessionReminder2h;
      subject = `Reminder: Your session starts in 2 hours`;
      break;
    case 'session_reminder_1h':
      Component = ModernSessionReminder1h;
      subject = `Reminder: Your session starts in 1 hour`;
      break;
    case 'cancellation':
      Component = ModernCancellation;
      subject = `Session Cancelled - ${data.sessionType}`;
      break;
    case 'practitioner_cancellation':
      Component = ModernPractitionerCancellation;
      subject = `Session Cancelled by Practitioner - ${data.sessionType}`;
      break;
    case 'rescheduling':
      Component = ModernRescheduling;
      subject = `Session Rescheduled - New Date/Time`;
      break;
    case 'peer_booking_confirmed_client':
      Component = ModernPeerBookingConfirmedClient;
      subject = `Peer Treatment Booking Confirmed - ${data.sessionType}`;
      break;
    case 'peer_booking_confirmed_practitioner':
      Component = ModernPeerBookingConfirmedPractitioner;
      subject = `New Peer Treatment Booking - ${data.sessionType} with ${data.clientName}`;
      break;
    case 'peer_credits_deducted':
      Component = ModernPeerCreditsDeducted;
      subject = `${data.paymentAmount || 0} Credits Deducted - Peer Treatment Booking`;
      break;
    case 'peer_credits_earned':
      Component = ModernPeerCreditsEarned;
      subject = `+${data.paymentAmount || 0} Credits Earned - Peer Treatment`;
      break;
    case 'peer_booking_cancelled_refunded':
      Component = ModernPeerBookingCancelledRefunded;
      subject = `Peer Treatment Cancelled - ${data.refundAmount || 0} Credits Refunded`;
      break;
    case 'peer_request_received':
      Component = ModernPeerRequestReceived;
      subject = `New Peer Treatment Request from ${data.requesterName || 'A Practitioner'}`;
      break;
    case 'peer_request_accepted':
      Component = ModernPeerRequestAccepted;
      subject = `Peer Treatment Request Accepted - ${data.sessionType || 'Session'}`;
      break;
    case 'peer_request_declined':
      Component = ModernPeerRequestDeclined;
      subject = `Peer Treatment Request Declined`;
      break;
    case 'review_request_client':
      Component = ModernReviewRequestClient;
      subject = `How was your session with ${data.practitionerName || 'your practitioner'}?`;
      break;
    case 'message_received_guest':
      Component = ModernMessageReceivedGuest;
      subject = `New Message from ${data.practitionerName || 'your practitioner'}`;
      break;
    default:
      throw new Error(`Unknown email type: ${emailType}`);
  }

  const html = render(React.createElement(Component, props));

  return { subject, html };
}


