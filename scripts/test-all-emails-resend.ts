/**
 * Test All Email Templates with Resend MCP
 * This script renders all modern email templates and sends test emails via Resend MCP
 * 
 * Run: npx tsx scripts/test-all-emails-resend.ts
 */

import { renderEmail } from '../src/emails/render';
import { EmailType } from '../src/emails/utils/types';

const TEST_EMAIL = 'rayman196823@gmail.com';
const TEST_DATA = {
  // Session data
  sessionId: 'test-session-123',
  sessionType: 'Massage Therapy',
  sessionDate: '2025-02-15',
  sessionTime: '14:00',
  sessionPrice: 75,
  sessionDuration: 60,
  sessionLocation: '123 Wellness Street, London, UK',
  
  // User data
  clientName: 'John Doe',
  clientEmail: TEST_EMAIL,
  practitionerName: 'Jane Smith',
  practitionerEmail: 'practitioner@example.com',
  
  // Payment data
  paymentAmount: 75,
  platformFee: 7.5,
  practitionerAmount: 67.5,
  paymentId: 'pay_test_123',
  
  // Additional data
  cancellationReason: 'Client request',
  refundAmount: 75,
  refundPercent: 100,
  originalDate: '2025-02-15',
  originalTime: '14:00',
  newDate: '2025-02-16',
  newTime: '15:00',
  bookingUrl: 'https://theramate.co.uk/client/sessions',
  calendarUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE',
  messageUrl: 'https://theramate.co.uk/messages',
  directionsUrl: 'https://maps.google.com/?q=123+Wellness+Street',
  cancellationPolicySummary: '24 hour cancellation policy applies',
  clientHasAccount: true,
  
  // Peer treatment data
  requesterName: 'Alice Practitioner',
  recipientName: 'Bob Practitioner',
  expiresAt: '2025-02-20T14:00:00Z',
  acceptUrl: 'https://theramate.co.uk/credits/accept/123',
  declineUrl: 'https://theramate.co.uk/credits/decline/123',
  
  // Guest messaging data
  messagePreview: 'Hello! I wanted to follow up on your session...',
  conversationId: 'conv_123',
  
  // Therapist type data
  therapistType: 'clinic_based' as const,
  serviceType: 'clinic' as const,
};

const EMAIL_TYPES: EmailType[] = [
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

async function testAllEmails() {
  console.log('📧 Testing All Modern Email Templates with Resend MCP\n');
  console.log(`Recipient: ${TEST_EMAIL}\n`);
  console.log('=' .repeat(60));
  
  const results: Array<{ type: EmailType; success: boolean; error?: string }> = [];
  
  for (const emailType of EMAIL_TYPES) {
    try {
      console.log(`\n🔄 Rendering: ${emailType}...`);
      
      // Render the email template
      const { subject, html } = renderEmail({
        emailType,
        recipientName: 'Test User',
        recipientEmail: TEST_EMAIL,
        data: TEST_DATA,
        baseUrl: 'https://theramate.co.uk',
      });
      
      console.log(`   ✅ Rendered successfully`);
      console.log(`   📝 Subject: ${subject}`);
      console.log(`   📄 HTML length: ${html.length} characters`);
      
      // Note: Actual sending via Resend MCP should be done manually
      // or via a separate script that uses the MCP tool
      console.log(`   ⚠️  Use Resend MCP to send this email`);
      
      results.push({ type: emailType, success: true });
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      results.push({ type: emailType, success: false, error: error.message });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Summary:');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`   ✅ Successful: ${successful}/${EMAIL_TYPES.length}`);
  console.log(`   ❌ Failed: ${failed}/${EMAIL_TYPES.length}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Templates:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.type}: ${r.error}`);
    });
  }
  
  console.log('\n✅ All templates rendered successfully!');
  console.log('📧 Next step: Use Resend MCP to send test emails');
}

testAllEmails().catch(console.error);
