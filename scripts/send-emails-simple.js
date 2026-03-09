#!/usr/bin/env node
/**
 * Send missing emails directly using fetch
 */

const sessionData = {
  sessionId: 'b25662bc-6d96-4465-b5fa-f56df10fe200',
  sessionType: 'test',
  sessionDate: '2025-11-08',
  sessionTime: '16:00',
  sessionPrice: 1.00,
  sessionDuration: 60,
  paymentId: '7f6ff1c3-3269-4aff-9cc0-bf26cf4843a2',
  paymentAmount: 1.00,
  platformFee: 0.04,
  practitionerAmount: 0.96,
};

const baseUrl = 'https://theramate.co.uk';
const supabaseUrl = 'https://aikqnvltuwwgifuocvto.supabase.co';

async function sendEmail(emailType, recipientEmail, recipientName, data) {
  try {
    // Use Supabase keys from server environment (never VITE_* here)
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const authKey = serviceKey || anonKey;

    if (!authKey) {
      console.error('❌ No Supabase key found. Trying without auth...');
      // Some Edge Functions might work without auth if verify_jwt is false
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authKey && { 'Authorization': `Bearer ${authKey}` }),
        ...(authKey && { 'apikey': authKey }),
      },
      body: JSON.stringify({
        emailType,
        recipientEmail,
        recipientName,
        data,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(result)}`);
    }

    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function sendAllEmails() {
  console.log('📧 Sending missing emails for payment pi_3SPWNAFk77knaVva0EAaqbKl...\n');

  // 1. Client Booking Confirmation
  console.log('1️⃣ Sending booking confirmation to client...');
  const clientBooking = await sendEmail(
    'booking_confirmation_client',
    'rayman196823@gmail.com',
    'Ray Dhillon',
    {
      sessionId: sessionData.sessionId,
      sessionType: sessionData.sessionType,
      sessionDate: sessionData.sessionDate,
      sessionTime: sessionData.sessionTime,
      sessionPrice: sessionData.sessionPrice,
      sessionDuration: sessionData.sessionDuration,
      sessionLocation: '',
      practitionerName: 'Ray',
      bookingUrl: `${baseUrl}/client/sessions`,
      calendarUrl: '#',
      messageUrl: `${baseUrl}/messages`,
    }
  );
  console.log(clientBooking.success ? '✅ Sent' : `❌ Failed: ${clientBooking.error}`);

  // 2. Practitioner Booking Confirmation
  console.log('\n2️⃣ Sending booking confirmation to practitioner...');
  const practitionerBooking = await sendEmail(
    'booking_confirmation_practitioner',
    'theramate1@gmail.com',
    'Ray',
    {
      sessionId: sessionData.sessionId,
      sessionType: sessionData.sessionType,
      sessionDate: sessionData.sessionDate,
      sessionTime: sessionData.sessionTime,
      sessionPrice: sessionData.sessionPrice,
      sessionDuration: sessionData.sessionDuration,
      clientName: 'Ray Dhillon',
      clientEmail: 'rayman196823@gmail.com',
      paymentStatus: 'completed',
      bookingUrl: `${baseUrl}/practice/sessions/${sessionData.sessionId}`,
      messageUrl: `${baseUrl}/messages`,
    }
  );
  console.log(practitionerBooking.success ? '✅ Sent' : `❌ Failed: ${practitionerBooking.error}`);

  // 3. Client Payment Confirmation
  console.log('\n3️⃣ Sending payment confirmation to client...');
  const clientPayment = await sendEmail(
    'payment_confirmation_client',
    'rayman196823@gmail.com',
    'Ray Dhillon',
    {
      paymentId: sessionData.paymentId,
      paymentAmount: sessionData.paymentAmount,
      sessionType: sessionData.sessionType,
      sessionDate: sessionData.sessionDate,
      sessionTime: sessionData.sessionTime,
      receiptUrl: `${baseUrl}/payments/${sessionData.paymentId}`,
    }
  );
  console.log(clientPayment.success ? '✅ Sent' : `❌ Failed: ${clientPayment.error}`);

  // 4. Practitioner Payment Notification
  console.log('\n4️⃣ Sending payment received notification to practitioner...');
  const practitionerPayment = await sendEmail(
    'payment_received_practitioner',
    'theramate1@gmail.com',
    'Ray',
    {
      paymentId: sessionData.paymentId,
      totalAmount: sessionData.paymentAmount,
      platformFee: sessionData.platformFee,
      practitionerAmount: sessionData.practitionerAmount,
      sessionType: sessionData.sessionType,
      sessionDate: sessionData.sessionDate,
      clientName: 'Ray Dhillon',
      payoutUrl: `${baseUrl}/practice/payments`,
    }
  );
  console.log(practitionerPayment.success ? '✅ Sent' : `❌ Failed: ${practitionerPayment.error}`);

  console.log('\n📋 Summary:');
  console.log(`   Client booking: ${clientBooking.success ? '✅' : '❌'}`);
  console.log(`   Practitioner booking: ${practitionerBooking.success ? '✅' : '❌'}`);
  console.log(`   Client payment: ${clientPayment.success ? '✅' : '❌'}`);
  console.log(`   Practitioner payment: ${practitionerPayment.success ? '✅' : '❌'}`);
}

sendAllEmails().catch(console.error);

