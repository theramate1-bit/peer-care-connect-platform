/**
 * Send real emails using data from an actual session in your database.
 * Uses real client names, practitioner names, and session details.
 *
 * Prerequisites:
 *   - .env with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
 *
 * Usage:
 *   npx tsx scripts/send-real-emails-from-session.ts your@email.com
 *   npx tsx scripts/send-real-emails-from-session.ts your@email.com <session_id>
 *
 * With no session_id: picks the most recent confirmed/scheduled session from DB.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });
import { createClient } from '@supabase/supabase-js';
import { renderEmail } from '../src/emails/render';
import { EmailData } from '../src/emails/utils/types';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const resendKey = process.env.RESEND_API_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add to .env');
  process.exit(1);
}
if (!resendKey) {
  console.error('Missing RESEND_API_KEY. Add to .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchSessionData(sessionId?: string) {
  let sessionQuery = supabase
    .from('client_sessions')
    .select('id, therapist_id, session_date, start_time, duration_minutes, session_type, status, client_name, client_email, visit_address')
    .in('status', ['confirmed', 'scheduled', 'completed'])
    .order('session_date', { ascending: false })
    .order('start_time', { ascending: false })
    .limit(1);

  if (sessionId) {
    sessionQuery = supabase
      .from('client_sessions')
      .select('id, therapist_id, session_date, start_time, duration_minutes, session_type, status, client_name, client_email, visit_address')
      .eq('id', sessionId);
  }

  const { data: session, error } = sessionId ? await sessionQuery.single() : await sessionQuery.maybeSingle();

  if (error || !session) {
    throw new Error(error?.message || 'No session found. Create a test booking first, or pass a session_id.');
  }

  let practitionerName = 'Practitioner';
  let clinicAddr = 'Clinic address';

  if (session.therapist_id) {
    const { data: practitioner } = await supabase
      .from('users')
      .select('first_name, last_name, email, clinic_address')
      .eq('id', session.therapist_id)
      .single();

    if (practitioner) {
      practitionerName = [practitioner.first_name, practitioner.last_name].filter(Boolean).join(' ') || practitioner.email || practitionerName;
      clinicAddr = practitioner.clinic_address || clinicAddr;
    }
  }
  const sessionDate = session.session_date;
  const startTime = (session.start_time || '14:00').toString().slice(0, 5);
  const duration = session.duration_minutes || 60;
  const sessionType = session.session_type || 'Session';
  const clientName = session.client_name || 'Client';
  const clientEmail = session.client_email || 'client@example.com';
  const location = session.visit_address || clinicAddr;

  const emailData: EmailData = {
    sessionId: session.id,
    sessionType,
    sessionDate,
    sessionTime: startTime,
    sessionDuration: duration,
    sessionPrice: 50,
    sessionLocation: location,
    practitionerName,
    clientName,
    clientEmail,
    paymentAmount: 50,
    platformFee: 0.25,
    practitionerAmount: 49.75,
    paymentId: 'pi_real',
    cancellationPolicySummary: 'Cancellations must be made 24 hours in advance.',
    requesterName: practitionerName,
    messagePreview: 'Hello! I wanted to follow up on your session.',
    conversationId: 'conv_real',
    refundAmount: 25,
  };

  return {
    sessionId: session.id,
    recipientName: clientName,
    recipientEmail: clientEmail,
    practitionerName,
    emailData,
  };
}

async function main() {
  const to = process.argv[2] || 'rayman196823@gmail.com';
  const sessionId = process.argv[3];

  console.log('\n📧 Fetching real session data...\n');
  const { sessionId: sid, recipientName, practitionerName, emailData } = await fetchSessionData(sessionId);
  console.log(`   Session: ${sid}`);
  console.log(`   Client: ${recipientName} (${emailData.clientEmail})`);
  console.log(`   Practitioner: ${practitionerName}`);
  console.log(`   Sending to: ${to}\n`);

  const emailTypes = [
    'booking_confirmation_client',
    'booking_confirmation_practitioner',
  ] as const;

  for (const emailType of emailTypes) {
    const recipient = emailType.includes('client') ? recipientName : practitionerName;
    const { subject, html } = await renderEmail({
      emailType,
      recipientName: recipient,
      recipientEmail: to,
      data: emailData,
    });

    const text = `[TheraMate] ${subject}. View in HTML for full content.`;
    const from = 'notifications@theramate.co.uk';

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
      console.error(`❌ ${emailType}:`, err?.message || res.statusText);
    } else {
      const data = await res.json();
      console.log(`✅ ${emailType} → ${data.id || 'sent'}`);
    }
  }

  console.log(`\n📬 Done. Check ${to} for emails with real names and session data.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
