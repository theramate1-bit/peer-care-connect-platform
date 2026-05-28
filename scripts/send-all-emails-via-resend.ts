/**
 * Render all 20 email templates and send to a given address via Resend API.
 * Requires RESEND_API_KEY in environment.
 *
 * Run: npx tsx scripts/send-all-emails-via-resend.ts rayman196823@gmail.com
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { renderEmail } from '../src/emails/render';
import { EmailData } from '../src/emails/utils/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sampleData: EmailData = {
  sessionType: 'Massage Therapy',
  sessionDate: '2025-02-15',
  sessionTime: '14:00',
  sessionDuration: 60,
  sessionPrice: 50,
  sessionLocation: '123 Main St, London',
  practitionerName: 'Jane Smith',
  clientName: 'John Doe',
  clientEmail: 'john@example.com',
  paymentAmount: 50,
  platformFee: 0.25,
  practitionerAmount: 49.75,
  paymentId: 'pi_test123',
  sessionId: 'test-session-id',
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

async function sendAll(to: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('Missing RESEND_API_KEY. Set it in .env or environment.');
    process.exit(1);
  }

  console.log(`\n📧 Sending all 20 TheraMate emails to ${to}...\n`);

  for (const emailType of emailTypes) {
    try {
      const { subject, html } = await renderEmail({
        emailType,
        recipientName: 'Test User',
        recipientEmail: to,
        data: sampleData,
      });

      const text = `[Preview - ${emailType}] This email is best viewed in an HTML-capable email client.`;
      const from = 'notifications@theramate.co.uk';

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ to, from, subject, text, html }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || res.statusText || String(res.status));
      }

      const data = await res.json();
      console.log(`✅ ${emailType} → ${data.id || 'sent'}`);
    } catch (e) {
      console.error(`❌ ${emailType}:`, e instanceof Error ? e.message : e);
    }
  }

  console.log(`\n📬 Done. Check ${to} for all 20 emails.\n`);
}

const to = process.argv[2] || 'rayman196823@gmail.com';
sendAll(to).catch(console.error);
