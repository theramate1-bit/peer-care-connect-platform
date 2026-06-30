/**
 * Test script to verify all email types are working
 * Run with: node test-all-email-types.js
 */

const SUPABASE_URL = "https://aikqnvltuwwgifuocvto.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1OTkwNjYsImV4cCI6MjA0ODE3NTA2Nn0.XuXUrqDKzj0vZzNCp_3KMqJ4KjZs1LfS3NOMCJ5WGgk";
const TEST_EMAIL = "rayman196823@gmail.com";

// All email types to test
const emailTests = [
  // Regular booking emails
  {
    name: "booking_confirmation_client",
    emailType: "booking_confirmation_client",
    data: {
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      sessionTime: "14:00",
      sessionDuration: 60,
      sessionPrice: 50,
      practitionerName: "John Doe",
      bookingUrl: "https://theramate.co.uk/my-bookings",
      calendarUrl: "#",
      messageUrl: "https://theramate.co.uk/messages",
    },
  },
  {
    name: "booking_confirmation_practitioner",
    emailType: "booking_confirmation_practitioner",
    data: {
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      sessionTime: "14:00",
      sessionDuration: 60,
      sessionPrice: 50,
      clientName: "Jane Smith",
      clientEmail: "jane@example.com",
      paymentStatus: "Paid",
      bookingUrl: "https://theramate.co.uk/practice/sessions",
      messageUrl: "https://theramate.co.uk/messages",
    },
  },
  {
    name: "payment_confirmation_client",
    emailType: "payment_confirmation_client",
    data: {
      paymentAmount: 50,
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      sessionTime: "14:00",
      paymentId: "pi_test123",
      practitionerName: "John Doe",
      bookingUrl: "https://theramate.co.uk/my-bookings",
    },
  },
  {
    name: "payment_received_practitioner",
    emailType: "payment_received_practitioner",
    data: {
      paymentAmount: 50,
      platformFee: 1.95,
      practitionerAmount: 48.05,
      clientName: "Jane Smith",
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      paymentId: "pi_test123",
    },
  },
  {
    name: "session_reminder_24h",
    emailType: "session_reminder_24h",
    data: {
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-16",
      sessionTime: "14:00",
      sessionDuration: 60,
      practitionerName: "John Doe",
      practitionerFirstName: "John",
      bookingUrl: "https://theramate.co.uk/my-bookings",
      messageUrl: "https://theramate.co.uk/messages",
    },
  },
  {
    name: "session_reminder_1h",
    emailType: "session_reminder_1h",
    data: {
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-16",
      sessionTime: "14:00",
      sessionDuration: 60,
      practitionerName: "John Doe",
      practitionerFirstName: "John",
      bookingUrl: "https://theramate.co.uk/my-bookings",
      messageUrl: "https://theramate.co.uk/messages",
    },
  },
  {
    name: "cancellation",
    emailType: "cancellation",
    data: {
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      sessionTime: "14:00",
      practitionerName: "John Doe",
      cancellationReason: "Client request",
    },
  },
  {
    name: "rescheduling",
    emailType: "rescheduling",
    data: {
      sessionType: "Massage Therapy",
      originalDate: "2025-02-15",
      originalTime: "14:00",
      newDate: "2025-02-16",
      newTime: "15:00",
      practitionerName: "John Doe",
      bookingUrl: "https://theramate.co.uk/my-bookings",
      calendarUrl: "#",
    },
  },
  // Peer booking emails
  {
    name: "peer_booking_confirmed_client",
    emailType: "peer_booking_confirmed_client",
    data: {
      sessionId: "test-session-id",
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      sessionTime: "14:00",
      sessionDuration: 60,
      practitionerName: "John Doe",
      paymentAmount: 2,
      bookingUrl: "https://theramate.co.uk/credits#peer-treatment",
      calendarUrl: "#",
    },
  },
  {
    name: "peer_credits_deducted",
    emailType: "peer_credits_deducted",
    data: {
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      sessionTime: "14:00",
      practitionerName: "John Doe",
      paymentAmount: 2,
    },
  },
  {
    name: "peer_booking_confirmed_practitioner",
    emailType: "peer_booking_confirmed_practitioner",
    data: {
      sessionId: "test-session-id",
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      sessionTime: "14:00",
      sessionDuration: 60,
      clientName: "Jane Smith",
      clientEmail: "jane@example.com",
      paymentAmount: 2,
      bookingUrl: "https://theramate.co.uk/practice/sessions/test-session-id",
    },
  },
  {
    name: "peer_credits_earned",
    emailType: "peer_credits_earned",
    data: {
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      sessionTime: "14:00",
      clientName: "Jane Smith",
      paymentAmount: 2,
    },
  },
  {
    name: "peer_booking_cancelled_refunded",
    emailType: "peer_booking_cancelled_refunded",
    data: {
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      sessionTime: "14:00",
      practitionerName: "John Doe",
      clientName: "Jane Smith",
      refundAmount: 2,
      cancellationReason: "Practitioner request",
    },
  },
];

async function testEmail(emailTest) {
  try {
    console.log(`\n📧 Testing: ${emailTest.name}`);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        emailType: emailTest.emailType,
        recipientEmail: TEST_EMAIL,
        recipientName: "Test User",
        data: emailTest.data,
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log(`   ✅ SUCCESS`);
      console.log(`   Email ID: ${result.emailId}`);
      if (result.config) {
        console.log(`   From: ${result.config.from_email_used}`);
        console.log(
          `   Secret Set: ${result.config.resend_from_email_set ? "Yes" : "No"}`,
        );
      }
      return { success: true, emailId: result.emailId };
    } else {
      console.log(`   ❌ FAILED`);
      console.log(
        `   Error: ${result.error || result.message || JSON.stringify(result)}`,
      );
      return { success: false, error: result.error || result.message };
    }
  } catch (error) {
    console.log(`   ❌ ERROR`);
    console.log(`   ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log("🚀 Starting Email Type Tests");
  console.log(`📬 Sending to: ${TEST_EMAIL}`);
  console.log(`📬 Total tests: ${emailTests.length}`);
  console.log("=".repeat(60));

  const results = {
    passed: [],
    failed: [],
  };

  for (const emailTest of emailTests) {
    const result = await testEmail(emailTest);
    if (result.success) {
      results.passed.push(emailTest.name);
    } else {
      results.failed.push({ name: emailTest.name, error: result.error });
    }
    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 Test Results Summary");
  console.log("=".repeat(60));
  console.log(`✅ Passed: ${results.passed.length}/${emailTests.length}`);
  console.log(`❌ Failed: ${results.failed.length}/${emailTests.length}`);

  if (results.passed.length > 0) {
    console.log("\n✅ Passed Tests:");
    results.passed.forEach((name) => console.log(`   - ${name}`));
  }

  if (results.failed.length > 0) {
    console.log("\n❌ Failed Tests:");
    results.failed.forEach(({ name, error }) => {
      console.log(`   - ${name}: ${error}`);
    });
  }

  console.log(
    "\n💡 Check your inbox at " +
      TEST_EMAIL +
      " to verify emails were received!",
  );
}

runTests().catch(console.error);
