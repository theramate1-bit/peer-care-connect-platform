/**
 * Build script to render React Email templates to HTML
 * This generates HTML strings that can be used in Deno Edge Functions
 * 
 * Run: npm run build:emails
 * or: npx tsx scripts/render-emails.ts
 */

import { render } from '@react-email/render';
import * as fs from 'fs';
import * as path from 'path';
import { EmailData } from '../src/emails/utils/types';
import { renderEmail } from '../src/emails/render';

// Sample data for testing
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

async function buildEmails() {
  console.log('📧 Building email templates...\n');

  const outputDir = path.join(__dirname, '../src/emails/generated');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let successCount = 0;
  let errorCount = 0;

  for (const emailType of emailTypes) {
    try {
      const result = renderEmail({
        emailType,
        recipientName: 'Test User',
        recipientEmail: 'test@example.com',
        data: sampleData,
      });

      // Save HTML to file for preview
      const htmlFile = path.join(outputDir, `${emailType}.html`);
      fs.writeFileSync(htmlFile, result.html);

      console.log(`✅ ${emailType}`);
      successCount++;
    } catch (error) {
      console.error(`❌ ${emailType}:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Summary: ${successCount} successful, ${errorCount} errors`);
  console.log(`📁 Output directory: ${outputDir}`);
}

buildEmails().catch(console.error);


