/**
 * Test script to verify what email address booking emails are sent from
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://aikqnvltuwwgifuocvto.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1OTkwNjYsImV4cCI6MjA0ODE3NTA2Nn0.XuXUrqDKzj0vZzNCp_3KMqJ4KjZs1LfS3NOMCJ5WGgk";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testBookingEmailSender() {
  console.log("🧪 Testing Booking Email Sender Address...\n");

  try {
    // Test sending a booking confirmation email
    const testEmail = "delivered@resend.dev"; // Resend's test email that always works

    console.log("📧 Sending test booking confirmation email...");
    console.log(`   To: ${testEmail}`);

    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        emailType: "booking_confirmation_client",
        recipientEmail: testEmail,
        recipientName: "Test User",
        data: {
          sessionId: "test-session-123",
          sessionType: "Massage Therapy",
          sessionDate: "2025-02-15",
          sessionTime: "14:00",
          sessionPrice: 75,
          sessionDuration: 60,
          practitionerName: "Test Practitioner",
          bookingUrl: "https://theramate.co.uk/bookings",
          calendarUrl: "#",
          messageUrl: "https://theramate.co.uk/messages",
          directionsUrl: "#",
          cancellationPolicySummary: "24 hour cancellation policy",
        },
      },
    });

    if (error) {
      console.error("❌ Error:", error);
      return;
    }

    console.log("\n✅ Email sent successfully!");
    console.log("📋 Response:", JSON.stringify(data, null, 2));

    if (data.emailId) {
      console.log(`\n📧 Email ID: ${data.emailId}`);
      console.log("\n📬 Check your email inbox (delivered@resend.dev)");
      console.log(
        '   The "From" address should be: Peer Care Connect <onboarding@resend.dev>',
      );
      console.log("\n💡 To check the actual sender:");
      console.log("   1. Open the email");
      console.log('   2. Look at the "From" field in your email client');
      console.log("   3. Or check Resend Dashboard: https://resend.com/emails");
    }

    // Also check if we can query email_logs to see what was logged
    console.log("\n📊 Checking email logs...");
    const { data: logs, error: logsError } = await supabase
      .from("email_logs")
      .select("*")
      .eq("resend_email_id", data.emailId)
      .single();

    if (!logsError && logs) {
      console.log("✅ Email logged in database");
      console.log(`   Status: ${logs.status}`);
      console.log(`   Email Type: ${logs.email_type}`);
      console.log(`   Recipient: ${logs.recipient_email}`);
      console.log(`   Subject: ${logs.subject}`);
      if (logs.metadata && logs.metadata.resend_response) {
        console.log("\n📧 Resend Response Metadata:");
        console.log(JSON.stringify(logs.metadata.resend_response, null, 2));
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testBookingEmailSender();
