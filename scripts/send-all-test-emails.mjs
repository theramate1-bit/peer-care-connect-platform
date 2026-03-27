#!/usr/bin/env node
/**
 * Sends one test email per send-email edge function template to a single inbox.
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env (repo root) or env.
 *
 * Usage:
 *   node scripts/send-all-test-emails.mjs theramate1@gmail.com
 *   SEND_TEST_EMAIL_DELAY_MS=800 node scripts/send-all-test-emails.mjs you@example.com
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function loadDotEnv() {
  const p = join(process.cwd(), '.env');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadDotEnv();

const RECIPIENT = process.argv[2] || process.env.SEND_ALL_EMAILS_TO;
const DELAY_MS = Number(process.env.SEND_TEST_EMAIL_DELAY_MS) || 700;

const EMAIL_TYPES = [
  'booking_confirmation_client',
  'booking_confirmation_practitioner',
  'payment_confirmation_client',
  'payment_received_practitioner',
  'session_reminder_24h',
  'session_reminder_2h',
  'session_reminder_1h',
  'cancellation',
  'rescheduling',
  'booking_request_practitioner',
  'mobile_request_accepted_client',
  'mobile_request_declined_client',
  'mobile_request_expired_client',
  'peer_booking_confirmed_client',
  'peer_booking_confirmed_practitioner',
  'peer_credits_deducted',
  'peer_credits_earned',
  'peer_booking_cancelled_refunded',
  'message_notification_guest',
  'welcome_client',
  'welcome_practitioner',
];

const baseData = {
  sessionId: 'preview-session-001',
  sessionType: 'Deep Tissue Massage',
  sessionDate: '2026-03-22',
  sessionTime: '14:00',
  sessionPrice: 65,
  sessionDuration: 60,
  sessionLocation: '12 Wellness Street, London EC1A 1BB',
  locationKind: 'clinic',
  clientName: 'Alex Client',
  clientEmail: 'alex.client@example.com',
  practitionerName: 'Dr Jane Smith',
  practitionerEmail: 'jane.smith@example.com',
  paymentAmount: 6500,
  platformFee: 33,
  practitionerAmount: 6467,
  paymentId: 'pi_preview_001',
  bookingUrl: 'https://theramate.co.uk/client/sessions',
  messageUrl: 'https://theramate.co.uk/messages',
  directionsUrl: 'https://maps.apple.com/?q=London',
  cancellationReason: 'Schedule conflict (preview)',
  refundAmount: 65,
  originalDate: '2026-03-20',
  originalTime: '10:00',
  newDate: '2026-03-22',
  newTime: '14:00',
  requestedDate: '2026-03-25',
  requestedTime: '11:30',
  requestUrl: 'https://theramate.co.uk/practice/mobile-requests',
  clientAddress: '45 Client Road, London N1 1AA',
  serviceType: 'Sports massage (mobile)',
  messagePreview: 'Hi Alex — looking forward to our session. Please confirm you can make Tuesday at 2pm.',
  viewMessageUrl: 'https://theramate.co.uk/messages',
};

function dataForType(emailType) {
  const d = { ...baseData };
  if (emailType === 'booking_confirmation_client') {
    d.calendarUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Preview';
  }
  return d;
}

async function main() {
  if (!RECIPIENT || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(RECIPIENT)) {
    console.error('Usage: node scripts/send-all-test-emails.mjs <email@example.com>');
    process.exit(1);
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env or environment).');
    process.exit(1);
  }
  const endpoint = `${url.replace(/\/$/, '')}/functions/v1/send-email`;
  console.log(`Sending ${EMAIL_TYPES.length} production HTML templates to ${RECIPIENT}`);
  console.log(`(Requires deployed send-email with RESEND_API_KEY. Subjects are real.)\n`);

  const results = [];
  for (let i = 0; i < EMAIL_TYPES.length; i++) {
    const emailType = EMAIL_TYPES[i];
    const body = {
      emailType,
      recipientEmail: RECIPIENT,
      recipientName: 'Preview',
      data: dataForType(emailType),
    };
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          apikey: key,
        },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text.slice(0, 200) };
      }
      if (!res.ok) {
        results.push({ emailType, ok: false, status: res.status, ...json });
        console.error(`FAIL ${emailType}: ${res.status}`, json.error || json.details || text.slice(0, 120));
      } else {
        results.push({ emailType, ok: true, emailId: json.emailId });
        console.log(`OK   ${emailType}  id=${json.emailId || '—'}`);
      }
    } catch (e) {
      results.push({ emailType, ok: false, error: String(e.message) });
      console.error(`FAIL ${emailType}:`, e.message);
    }
    if (i < EMAIL_TYPES.length - 1) await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  const ok = results.filter((r) => r.ok).length;
  console.log(`\nDone: ${ok}/${EMAIL_TYPES.length} sent.`);
  if (ok < EMAIL_TYPES.length) process.exit(1);
}

main();
