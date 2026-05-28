/**
 * Send a booking confirmation email to a specific address.
 * Uses React Email render + Resend API. No Supabase required.
 *
 * Usage:
 *   npx tsx scripts/send-booking-email-to.ts rayman196823@gmail.com
 *
 * Requires .env or environment: RESEND_API_KEY
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { renderEmail } from '../src/emails/render';
import { EmailData } from '../src/emails/utils/types';

const resendKey = process.env.RESEND_API_KEY;
if (!resendKey) {
  console.error('Missing RESEND_API_KEY. Add to .env in peer-care-connect or project root.');
  process.exit(1);
}

const sampleData: EmailData = {
  sessionType: 'Massage Therapy',
  sessionDate: '2025-02-15',
  sessionTime: '14:00',
  sessionDuration: 60,
  sessionPrice: 50,
  sessionLocation: 'Address to be confirmed',
  practitionerName: 'Jane Smith',
  clientName: 'Ray',
  clientEmail: 'rayman196823@gmail.com',
  paymentAmount: 50,
  sessionId: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
};

async function main() {
  const to = process.argv[2] || 'rayman196823@gmail.com';
  const recipientName = 'Ray';

  console.log('\n📧 Rendering booking confirmation...');
  const { subject, html } = await renderEmail({
    emailType: 'booking_confirmation_client',
    recipientName,
    recipientEmail: to,
    data: sampleData,
  });

  const text = `Booking Confirmed - Massage Therapy with Jane Smith\n\nYour session is scheduled for 15 February 2025 at 14:00.\n\nView booking: https://theramate.co.uk/booking-success`;
  const from = 'TheraMate <onboarding@resend.dev>';

  console.log(`   To: ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log('   Sending...\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({ to, from, subject, text, html }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('❌ Send failed:', err?.message || res.statusText);
    if (err?.message) console.error('   ', err.message);
    process.exit(1);
  }

  const data = await res.json();
  console.log('✅ Email sent successfully');
  console.log(`   Resend ID: ${data.id}`);
  console.log(`\n📬 Check ${to} for the booking confirmation.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
