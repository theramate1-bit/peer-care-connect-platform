/**
 * Send all email templates to a test inbox via Resend
 * Run: RESEND_API_KEY=re_xxx TEST_EMAIL=your@email.com npx tsx scripts/send-test-emails.ts
 * Or: npm run test:emails:send (after setting env vars)
 */

import { Resend } from 'resend';
import { renderEmail } from '../src/emails/render';
import type { EmailType, EmailData } from '../src/emails/utils/types';

const apiKey = process.env.RESEND_API_KEY;
const testEmail = process.env.TEST_EMAIL || process.env.RESEND_TEST_EMAIL;
const fromEmail = process.env.FROM_EMAIL || 'Theramate <onboarding@resend.dev>';

const sampleData: EmailData = {
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

async function main() {
  if (!apiKey) {
    console.error('❌ RESEND_API_KEY is required. Get one at https://resend.com');
    process.exit(1);
  }
  if (!testEmail) {
    console.error('❌ TEST_EMAIL or RESEND_TEST_EMAIL is required (recipient for test emails)');
    process.exit(1);
  }

  const resend = new Resend(apiKey);
  let sent = 0;
  let failed = 0;

  console.log(`📧 Sending ${emailTypes.length} test emails to ${testEmail}\n`);

  for (const emailType of emailTypes) {
    try {
      const { subject, html } = renderEmail({
        emailType,
        recipientName: 'Test User',
        recipientEmail: testEmail,
        data: sampleData,
      });

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: testEmail,
        subject: `[TEST] ${subject}`,
        html,
      });

      if (error) {
        console.error(`❌ ${emailType}:`, error.message);
        failed++;
      } else {
        console.log(`✅ ${emailType} (ID: ${data?.id})`);
        sent++;
      }
    } catch (err: any) {
      console.error(`❌ ${emailType}:`, err?.message || err);
      failed++;
    }
  }

  console.log(`\n📊 Sent: ${sent}, Failed: ${failed}, Total: ${emailTypes.length}`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
