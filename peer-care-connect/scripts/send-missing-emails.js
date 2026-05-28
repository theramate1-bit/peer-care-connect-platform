#!/usr/bin/env node
/**
 * Script to send missing emails for payment pi_3SPWNAFk77knaVva0EAaqbKl
 * 
 * Run with: node scripts/send-missing-emails.js
 * 
 * Requires SUPABASE_SERVICE_ROLE_KEY environment variable
 * You can set it by running:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="your-key-here"; node scripts/send-missing-emails.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../.env') });
config({ path: join(__dirname, '../.env.local') });
config({ path: join(__dirname, '../.env.production') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aikqnvltuwwgifuocvto.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

async function sendEmails() {
  console.log('📧 Sending missing emails for payment pi_3SPWNAFk77knaVva0EAaqbKl...\n');

  try {
    // 1. Booking Confirmation - Client
    console.log('1️⃣ Sending booking confirmation to client...');
    const clientBookingResult = await supabase.functions.invoke('send-email', {
      body: {
        emailType: 'booking_confirmation_client',
        recipientEmail: 'rayman196823@gmail.com',
        recipientName: 'Ray Dhillon',
        data: {
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
      }
    });

    if (clientBookingResult.error) {
      console.error('❌ Failed to send client booking confirmation:', clientBookingResult.error);
    } else {
      console.log('✅ Client booking confirmation sent');
    }

    // 2. Booking Confirmation - Practitioner
    console.log('\n2️⃣ Sending booking confirmation to practitioner...');
    const practitionerBookingResult = await supabase.functions.invoke('send-email', {
      body: {
        emailType: 'booking_confirmation_practitioner',
        recipientEmail: 'theramate1@gmail.com',
        recipientName: 'Ray',
        data: {
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
      }
    });

    if (practitionerBookingResult.error) {
      console.error('❌ Failed to send practitioner booking confirmation:', practitionerBookingResult.error);
    } else {
      console.log('✅ Practitioner booking confirmation sent');
    }

    // 3. Payment Confirmation - Client
    console.log('\n3️⃣ Sending payment confirmation to client...');
    const clientPaymentResult = await supabase.functions.invoke('send-email', {
      body: {
        emailType: 'payment_confirmation_client',
        recipientEmail: 'rayman196823@gmail.com',
        recipientName: 'Ray Dhillon',
        data: {
          paymentId: sessionData.paymentId,
          paymentAmount: sessionData.paymentAmount,
          sessionType: sessionData.sessionType,
          sessionDate: sessionData.sessionDate,
          sessionTime: sessionData.sessionTime,
          receiptUrl: `${baseUrl}/payments/${sessionData.paymentId}`,
        }
      }
    });

    if (clientPaymentResult.error) {
      console.error('❌ Failed to send client payment confirmation:', clientPaymentResult.error);
    } else {
      console.log('✅ Client payment confirmation sent');
    }

    // 4. Payment Received - Practitioner
    console.log('\n4️⃣ Sending payment received notification to practitioner...');
    const practitionerPaymentResult = await supabase.functions.invoke('send-email', {
      body: {
        emailType: 'payment_received_practitioner',
        recipientEmail: 'theramate1@gmail.com',
        recipientName: 'Ray',
        data: {
          paymentId: sessionData.paymentId,
          totalAmount: sessionData.paymentAmount,
          platformFee: sessionData.platformFee,
          practitionerAmount: sessionData.practitionerAmount,
          sessionType: sessionData.sessionType,
          sessionDate: sessionData.sessionDate,
          clientName: 'Ray Dhillon',
          payoutUrl: `${baseUrl}/practice/payments`,
        }
      }
    });

    if (practitionerPaymentResult.error) {
      console.error('❌ Failed to send practitioner payment notification:', practitionerPaymentResult.error);
    } else {
      console.log('✅ Practitioner payment notification sent');
    }

    console.log('\n✅ All emails sent successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Client booking confirmation: ${clientBookingResult.error ? '❌ Failed' : '✅ Sent'}`);
    console.log(`   - Practitioner booking confirmation: ${practitionerBookingResult.error ? '❌ Failed' : '✅ Sent'}`);
    console.log(`   - Client payment confirmation: ${clientPaymentResult.error ? '❌ Failed' : '✅ Sent'}`);
    console.log(`   - Practitioner payment notification: ${practitionerPaymentResult.error ? '❌ Failed' : '✅ Sent'}`);

  } catch (error) {
    console.error('❌ Error sending emails:', error);
    process.exit(1);
  }
}

sendEmails();

