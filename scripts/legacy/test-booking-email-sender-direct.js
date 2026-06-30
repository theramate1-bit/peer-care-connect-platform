/**
 * Test script to verify what email address booking emails are sent from
 * Using direct HTTP call to Edge Function with service role key
 */

async function testBookingEmailSender() {
  console.log("🧪 Testing Booking Email Sender Address...\n");

  const supabaseUrl = "https://aikqnvltuwwgifuocvto.supabase.co";
  const serviceRoleKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjU5OTA2NiwiZXhwIjoyMDQ4MTc1MDY2fQ.ZAqT8fq8y3d_XqK3qJ4kH5v9ZJ3XqK3qJ4kH5v9ZJ3X"; // This is a placeholder - you'll need the actual service role key

  try {
    // Test sending a booking confirmation email
    const testEmail = "delivered@resend.dev"; // Resend's test email that always works

    console.log("📧 Sending test booking confirmation email...");
    console.log(`   To: ${testEmail}`);
    console.log(`   Function URL: ${supabaseUrl}/functions/v1/send-email`);

    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      body: JSON.stringify({
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
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ Error:", result);
      console.error(`   Status: ${response.status}`);
      return;
    }

    console.log("\n✅ Email sent successfully!");
    console.log("📋 Response:", JSON.stringify(result, null, 2));

    if (result.emailId) {
      console.log(`\n📧 Email ID: ${result.emailId}`);
      console.log("\n📬 Check your email inbox (delivered@resend.dev)");
      console.log(
        '   The "From" address should be: Peer Care Connect <onboarding@resend.dev>',
      );
      console.log("\n💡 To verify the sender:");
      console.log("   1. Go to Resend Dashboard: https://resend.com/emails");
      console.log("   2. Find the email with ID:", result.emailId);
      console.log('   3. Check the "From" field in the email details');
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testBookingEmailSender();
