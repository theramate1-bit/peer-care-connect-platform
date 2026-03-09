/**
 * Build script to generate email render functions for Deno Edge Functions
 * This pre-renders React Email templates to HTML string functions
 * 
 * Run: npm run build:emails
 */

import { render } from '@react-email/render';
import * as fs from 'fs';
import * as path from 'path';
import * as React from 'react';
import { EmailData, EmailType } from '../src/emails/utils/types';
import {
  BookingConfirmationClient,
  BookingConfirmationPractitioner,
  Cancellation,
  MessageReceivedGuest,
  PaymentConfirmationClient,
  PaymentReceivedPractitioner,
  PeerBookingCancelledRefunded,
  PeerBookingConfirmedClient,
  PeerBookingConfirmedPractitioner,
  PeerCreditsDeducted,
  PeerCreditsEarned,
  PeerRequestAccepted,
  PeerRequestDeclined,
  PeerRequestReceived,
  PractitionerCancellation,
  Rescheduling,
  ReviewRequestClient,
  SessionReminder1h,
  SessionReminder24h,
  SessionReminder2h,
} from '../src/emails/templates';

interface EmailTemplateFunction {
  (data: EmailData, recipientName?: string, recipientEmail?: string, baseUrl?: string): {
    subject: string;
    html: string;
  };
}

function generateEmailFunction(
  Component: React.ComponentType<any>,
  getSubject: (data: EmailData) => string
): string {
  return `
  (data: EmailData, recipientName?: string, recipientEmail?: string, baseUrl: string = 'https://theramate.co.uk'): { subject: string; html: string } => {
    const props = { recipientName, recipientEmail, data, baseUrl };
    const html = ${render(React.createElement(Component, {
      recipientName: '{{recipientName}}',
      recipientEmail: '{{recipientEmail}}',
      data: {} as EmailData,
      baseUrl: '{{baseUrl}}',
    })).replace(/{{recipientName}}/g, '${recipientName || \'there\'}').replace(/{{recipientEmail}}/g, recipientEmail || '').replace(/{{baseUrl}}/g, baseUrl)};
    return { subject: ${JSON.stringify(getSubject({} as EmailData))}, html };
  }`;
}

async function buildEmailFunctions() {
  console.log('📧 Building email render functions for Deno...\n');

  const outputFile = path.join(__dirname, '../src/emails/generated/render-functions.ts');

  const subjectGetters: Record<EmailType, (data: EmailData) => string> = {
    booking_confirmation_client: (d) => `Booking Confirmed - ${d.sessionType} with ${d.practitionerName}`,
    booking_confirmation_practitioner: (d) => `New Booking - ${d.sessionType} with ${d.clientName}`,
    payment_confirmation_client: (d) => `Payment Confirmed - £${d.paymentAmount} for ${d.sessionType}`,
    payment_received_practitioner: (d) => `Payment Received - £${d.practitionerAmount} from ${d.clientName}`,
    session_reminder_24h: () => `Reminder: Your session is tomorrow`,
    session_reminder_2h: () => `Reminder: Your session starts in 2 hours`,
    session_reminder_1h: () => `Reminder: Your session starts in 1 hour`,
    cancellation: (d) => `Session Cancelled - ${d.sessionType}`,
    practitioner_cancellation: (d) => `Session Cancelled by Practitioner - ${d.sessionType}`,
    rescheduling: () => `Session Rescheduled - New Date/Time`,
    peer_booking_confirmed_client: (d) => `Peer Treatment Booking Confirmed - ${d.sessionType}`,
    peer_booking_confirmed_practitioner: (d) => `New Peer Treatment Booking - ${d.sessionType} with ${d.clientName}`,
    peer_credits_deducted: (d) => `${d.paymentAmount || 0} Credits Deducted - Peer Treatment Booking`,
    peer_credits_earned: (d) => `+${d.paymentAmount || 0} Credits Earned - Peer Treatment`,
    peer_booking_cancelled_refunded: (d) => `Peer Treatment Cancelled - ${d.refundAmount || 0} Credits Refunded`,
    peer_request_received: (d) => `New Peer Treatment Request from ${d.requesterName || 'A Practitioner'}`,
    peer_request_accepted: (d) => `Peer Treatment Request Accepted - ${d.sessionType || 'Session'}`,
    peer_request_declined: () => `Peer Treatment Request Declined`,
    review_request_client: (d) => `How was your session with ${d.practitionerName || 'your practitioner'}?`,
    message_received_guest: (d) => `New Message from ${d.practitionerName || 'your practitioner'}`,
  };

  const templateMap: Record<EmailType, React.ComponentType<any>> = {
    booking_confirmation_client: BookingConfirmationClient,
    booking_confirmation_practitioner: BookingConfirmationPractitioner,
    payment_confirmation_client: PaymentConfirmationClient,
    payment_received_practitioner: PaymentReceivedPractitioner,
    session_reminder_24h: SessionReminder24h,
    session_reminder_2h: SessionReminder2h,
    session_reminder_1h: SessionReminder1h,
    cancellation: Cancellation,
    practitioner_cancellation: PractitionerCancellation,
    rescheduling: Rescheduling,
    peer_booking_confirmed_client: PeerBookingConfirmedClient,
    peer_booking_confirmed_practitioner: PeerBookingConfirmedPractitioner,
    peer_credits_deducted: PeerCreditsDeducted,
    peer_credits_earned: PeerCreditsEarned,
    peer_booking_cancelled_refunded: PeerBookingCancelledRefunded,
    peer_request_received: PeerRequestReceived,
    peer_request_accepted: PeerRequestAccepted,
    peer_request_declined: PeerRequestDeclined,
    review_request_client: ReviewRequestClient,
    message_received_guest: MessageReceivedGuest,
  };

  // Generate render functions that use the renderEmail utility
  const functions: string[] = [];
  
  for (const emailType of Object.keys(templateMap) as EmailType[]) {
    functions.push(`  ${emailType}: (data: EmailData, recipientName?: string, recipientEmail?: string, baseUrl: string = 'https://theramate.co.uk') => {
    return renderEmail({ emailType: '${emailType}', data, recipientName, recipientEmail, baseUrl });
  },`);
  }

  const output = `// Auto-generated email render functions
// DO NOT EDIT - Generated by scripts/build-email-functions.ts
// Run: npm run build:emails

import { EmailData, EmailType } from '../utils/types';
import { renderEmail } from '../render';

export interface EmailTemplateResult {
  subject: string;
  html: string;
}

export function generateEmailTemplate(
  emailType: EmailType,
  data: EmailData,
  recipientName?: string,
  recipientEmail?: string,
  baseUrl?: string
): EmailTemplateResult {
  return renderEmail({ emailType, data, recipientName, recipientEmail, baseUrl });
}
`;

  // Ensure directory exists
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, output);
  console.log(`✅ Generated: ${outputFile}`);
  console.log(`📊 ${Object.keys(templateMap).length} email templates configured\n`);
}

buildEmailFunctions().catch(console.error);

