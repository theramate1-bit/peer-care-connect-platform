/**
 * Modern Email Template Renderer for Deno Edge Functions
 * Uses React Email via esm.sh CDN for Deno compatibility
 */

import { render } from 'https://esm.sh/@react-email/render@0.0.20';
import * as React from 'https://esm.sh/react@18.2.0';

// Import modern templates
import { ModernBookingConfirmationClient } from '../../src/emails/templates/ModernBookingConfirmationClient.tsx';
import { ModernBookingConfirmationPractitioner } from '../../src/emails/templates/ModernBookingConfirmationPractitioner.tsx';
import { ModernPaymentConfirmationClient } from '../../src/emails/templates/ModernPaymentConfirmationClient.tsx';
import { ModernPaymentReceivedPractitioner } from '../../src/emails/templates/ModernPaymentReceivedPractitioner.tsx';
import { ModernSessionReminder24h } from '../../src/emails/templates/ModernSessionReminder24h.tsx';
import { ModernSessionReminder2h } from '../../src/emails/templates/ModernSessionReminder2h.tsx';
import { ModernSessionReminder1h } from '../../src/emails/templates/ModernSessionReminder1h.tsx';
import { ModernCancellation } from '../../src/emails/templates/ModernCancellation.tsx';
import { ModernPractitionerCancellation } from '../../src/emails/templates/ModernPractitionerCancellation.tsx';
import { ModernRescheduling } from '../../src/emails/templates/ModernRescheduling.tsx';
import { ModernPeerBookingConfirmedClient } from '../../src/emails/templates/ModernPeerBookingConfirmedClient.tsx';
import { ModernPeerBookingConfirmedPractitioner } from '../../src/emails/templates/ModernPeerBookingConfirmedPractitioner.tsx';
import { ModernPeerCreditsDeducted } from '../../src/emails/templates/ModernPeerCreditsDeducted.tsx';
import { ModernPeerCreditsEarned } from '../../src/emails/templates/ModernPeerCreditsEarned.tsx';
import { ModernPeerBookingCancelledRefunded } from '../../src/emails/templates/ModernPeerBookingCancelledRefunded.tsx';
import { ModernPeerRequestReceived } from '../../src/emails/templates/ModernPeerRequestReceived.tsx';
import { ModernPeerRequestAccepted } from '../../src/emails/templates/ModernPeerRequestAccepted.tsx';
import { ModernPeerRequestDeclined } from '../../src/emails/templates/ModernPeerRequestDeclined.tsx';
import { ModernReviewRequestClient } from '../../src/emails/templates/ModernReviewRequestClient.tsx';
import { ModernMessageReceivedGuest } from '../../src/emails/templates/ModernMessageReceivedGuest.tsx';

interface EmailTemplate {
  subject: string;
  html: string;
}

type EmailType = 
  | 'booking_confirmation_client' | 'booking_confirmation_practitioner'
  | 'payment_confirmation_client' | 'payment_received_practitioner'
  | 'session_reminder_24h' | 'session_reminder_2h' | 'session_reminder_1h'
  | 'cancellation' | 'practitioner_cancellation' | 'rescheduling'
  | 'peer_booking_confirmed_client' | 'peer_booking_confirmed_practitioner'
  | 'peer_credits_deducted' | 'peer_credits_earned' | 'peer_booking_cancelled_refunded'
  | 'peer_request_received' | 'peer_request_accepted' | 'peer_request_declined'
  | 'review_request_client' | 'message_received_guest';

interface EmailData {
  [key: string]: any;
}

export async function renderModernEmail(
  emailType: EmailType,
  data: EmailData,
  recipientName?: string,
  recipientEmail?: string,
  baseUrl: string = 'https://theramate.co.uk'
): Promise<EmailTemplate> {
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

  const html = await render(React.createElement(Component, props));

  return { subject, html };
}
