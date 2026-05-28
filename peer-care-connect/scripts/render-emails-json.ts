/**
 * Render email(s) to JSON. Writes to outDir to avoid stdout size limits.
 * Run: npx tsx scripts/render-emails-json.ts [outDir]
 * Or: npx tsx scripts/render-emails-json.ts <emailType> [outDir]
 */
import * as fs from 'fs';
import * as path from 'path';
import { renderEmail } from '../src/emails/render';
import { EmailData } from '../src/emails/utils/types';

const sampleData: EmailData = {
  sessionType: 'Massage Therapy',
  sessionDate: '2025-02-15',
  sessionTime: '14:00',
  sessionDuration: 60,
  sessionPrice: 50,
  sessionLocation: 'Address to be confirmed',
  practitionerName: 'Jane Smith',
  clientName: 'John Doe',
  clientEmail: 'john@example.com',
  paymentAmount: 50,
  platformFee: 0.25,
  practitionerAmount: 49.75,
  paymentId: 'pi_test123',
  sessionId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
  cancellationPolicySummary: 'Cancellations must be made 24 hours in advance.',
  requesterName: 'Alice Practitioner',
  messagePreview: 'Hello! I wanted to follow up on your session.',
  conversationId: 'conv_test123',
  refundAmount: 25,
};

const emailTypes = [
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
] as const;

async function main() {
  const arg1 = process.argv[2];
  const arg2 = process.argv[3];
  const to = 'rayman196823@gmail.com';

  const outDir = arg1 && !emailTypes.includes(arg1 as any) ? arg1 : arg2 || './.email-renders';
  const singleType = arg1 && emailTypes.includes(arg1 as any) ? arg1 : null;

  fs.mkdirSync(outDir, { recursive: true });

  const typesToRender = singleType ? [singleType] : [...emailTypes];

  for (const emailType of typesToRender) {
    const { subject, html } = await renderEmail({
      emailType: emailType as (typeof emailTypes)[number],
      recipientName: 'Test User',
      recipientEmail: to,
      data: sampleData,
    });
    const file = path.join(outDir, `${emailType}.json`);
    fs.writeFileSync(file, JSON.stringify({ emailType, subject, html }, null, 0));
    if (singleType) {
      process.stdout.write(file);
    }
  }
  if (!singleType) {
    process.stdout.write(outDir);
  }
}

main().catch(console.error);
