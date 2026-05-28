#!/usr/bin/env node
/**
 * Script to check payment status and send emails for session 5c38621a-acbb-45be-86b8-5860f5377929
 * 
 * Run with: node scripts/send-booking-emails.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../.env') });
config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://aikqnvltuwwgifuocvto.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SESSION_ID = '5c38621a-acbb-45be-86b8-5860f5377929';
const CHECKOUT_SESSION_ID = 'cs_live_a19I14evdGdSLagcLufQLpVv6RyRdNJ7aTPPSkRAj1xXgYBxvK2KAbsExL';

async function sendBookingEmails() {
  console.log('📧 Checking payment status and sending booking emails...\n');

  try {
    // Fetch session details
    const { data: sessionData, error: sessionError } = await supabase
      .from('client_sessions')
      .select(`
        *,
        client:users!client_sessions_client_id_fkey(id, first_name, last_name, email),
        practitioner:users!client_sessions_therapist_id_fkey(id, first_name, last_name, email)
      `)
      .eq('id', SESSION_ID)
      .single();

    if (sessionError || !sessionData) {
      console.error('❌ Failed to fetch session:', sessionError);
      process.exit(1);
    }

    // Fetch payment details
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('checkout_session_id', CHECKOUT_SESSION_ID)
      .maybeSingle();

    const clientName = sessionData.client 
      ? `${sessionData.client.first_name || ''} ${sessionData.client.last_name || ''}`.trim() 
      : 'Client';
    const clientEmail = sessionData.client?.email || sessionData.client_email || 'rayman196823@gmail.com';
    const practitionerName = sessionData.practitioner
      ? `${sessionData.practitioner.first_name || ''} ${sessionData.practitioner.last_name || ''}`.trim()
      : 'Practitioner';
    const practitionerEmail = sessionData.practitioner?.email || 'theramate1@gmail.com';

    const baseUrl = process.env.APP_URL || 'https://theramate.co.uk';
    const sessionDate = sessionData.session_date || '2025-11-28';
    const sessionTime = sessionData.start_time || '11:00';
    const sessionDuration = sessionData.duration_minutes || 60;
    const sessionType = sessionData.session_type || 'Session';
    const sessionLocation = sessionData.location || '';

    // Generate calendar URL
    const generateCalendarUrl = (title, description, startDate, startTime, durationMinutes, location) => {
      try {
        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);
        
        const formatGC = (date) => {
          return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };
        
        const params = new URLSearchParams({
          action: 'TEMPLATE',
          text: title,
          dates: `${formatGC(startDateTime)}/${formatGC(endDateTime)}`,
          details: description,
        });
        
        if (location && location.trim() !== '') {
          params.append('location', location);
        }
        
        return `https://calendar.google.com/calendar/render?${params.toString()}`;
      } catch (error) {
        console.error('Error generating calendar URL:', error);
        return '#';
      }
    };

    const calendarUrl = generateCalendarUrl(
      `Session with ${practitionerName}`,
      `${sessionType} session`,
      sessionDate,
      sessionTime,
      sessionDuration,
      sessionLocation
    );

    // 1. Booking Confirmation - Client
    console.log('1️⃣ Sending booking confirmation to client...');
    const clientBookingResult = await supabase.functions.invoke('send-email', {
      body: {
        emailType: 'booking_confirmation_client',
        recipientEmail: clientEmail,
        recipientName: clientName,
        data: {
          sessionId: SESSION_ID,
          sessionType: sessionType,
          sessionDate: sessionDate,
          sessionTime: sessionTime,
          sessionPrice: sessionData.price || 0,
          sessionDuration: sessionDuration,
          sessionLocation: sessionLocation,
          practitionerName: practitionerName,
          bookingUrl: `${baseUrl}/booking-success?session_id=${SESSION_ID}&email=${encodeURIComponent(clientEmail)}`,
          calendarUrl: calendarUrl,
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
        recipientEmail: practitionerEmail,
        recipientName: practitionerName,
        data: {
          sessionId: SESSION_ID,
          sessionType: sessionType,
          sessionDate: sessionDate,
          sessionTime: sessionTime,
          sessionPrice: sessionData.price || 0,
          sessionDuration: sessionDuration,
          clientName: clientName,
          clientEmail: clientEmail,
          paymentStatus: paymentData?.payment_status || 'pending',
          bookingUrl: `${baseUrl}/practice/sessions/${SESSION_ID}`,
          messageUrl: `${baseUrl}/messages`,
        }
      }
    });

    if (practitionerBookingResult.error) {
      console.error('❌ Failed to send practitioner booking confirmation:', practitionerBookingResult.error);
    } else {
      console.log('✅ Practitioner booking confirmation sent');
    }

    // 3. Payment Confirmation - Client (if payment exists)
    if (paymentData && paymentData.payment_status === 'succeeded') {
      console.log('\n3️⃣ Sending payment confirmation to client...');
      const clientPaymentResult = await supabase.functions.invoke('send-email', {
        body: {
          emailType: 'payment_confirmation_client',
          recipientEmail: clientEmail,
          recipientName: clientName,
          data: {
            sessionId: SESSION_ID,
            paymentId: paymentData.id,
            paymentAmount: paymentData.amount ? (paymentData.amount / 100) : 0,
            sessionType: sessionType,
            sessionDate: sessionDate,
            sessionTime: sessionTime,
            receiptUrl: `${baseUrl}/payments/${paymentData.id}`,
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
      const platformFee = paymentData.platform_fee_amount ? (paymentData.platform_fee_amount / 100) : 0;
      const practitionerAmount = paymentData.practitioner_amount ? (paymentData.practitioner_amount / 100) : 0;
      
      const practitionerPaymentResult = await supabase.functions.invoke('send-email', {
        body: {
          emailType: 'payment_received_practitioner',
          recipientEmail: practitionerEmail,
          recipientName: practitionerName,
          data: {
            paymentId: paymentData.id,
            totalAmount: paymentData.amount ? (paymentData.amount / 100) : 0,
            platformFee: platformFee,
            practitionerAmount: practitionerAmount,
            sessionType: sessionType,
            sessionDate: sessionDate,
            clientName: clientName,
            payoutUrl: `${baseUrl}/practice/payments`,
          }
        }
      });

      if (practitionerPaymentResult.error) {
        console.error('❌ Failed to send practitioner payment notification:', practitionerPaymentResult.error);
      } else {
        console.log('✅ Practitioner payment notification sent');
      }
    } else {
      console.log('\n⏭️ Skipping payment confirmation emails (payment not completed yet)');
    }

    console.log('\n✅ Booking confirmation emails sent successfully!');
    console.log(`\n📧 Client: ${clientEmail}`);
    console.log(`📧 Practitioner: ${practitionerEmail}`);

  } catch (error) {
    console.error('❌ Error sending emails:', error);
    process.exit(1);
  }
}

sendBookingEmails();

