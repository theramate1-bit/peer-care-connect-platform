/**
 * Comprehensive Email System Audit Script
 * Tests all email types, configuration, and delivery
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
      sessionId: "test-session-123",
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      sessionTime: "14:00",
      sessionDuration: 60,
      sessionPrice: 50,
      sessionLocation: "123 Main St, London",
      practitionerName: "John Doe",
      bookingUrl: "https://theramate.co.uk/my-bookings",
      calendarUrl: "#",
      messageUrl: "https://theramate.co.uk/messages",
      cancellationPolicySummary: "24 hour cancellation policy",
    },
  },
  {
    name: "booking_confirmation_practitioner",
    emailType: "booking_confirmation_practitioner",
    data: {
      sessionId: "test-session-123",
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
  // Payment emails
  {
    name: "payment_confirmation_client",
    emailType: "payment_confirmation_client",
    data: {
      sessionId: "test-session-123",
      paymentAmount: 50,
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      sessionTime: "14:00",
      paymentId: "pi_test123",
      practitionerName: "John Doe",
      sessionLocation: "123 Main St, London",
      bookingUrl: "https://theramate.co.uk/my-bookings",
      cancellationPolicySummary: "24 hour cancellation policy",
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
  // Reminder emails
  {
    name: "session_reminder_24h",
    emailType: "session_reminder_24h",
    data: {
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-16",
      sessionTime: "14:00",
      sessionDuration: 60,
      sessionLocation: "123 Main St, London",
      practitionerName: "John Doe",
      practitionerFirstName: "John",
      clientFirstName: "Test",
      bookingUrl: "https://theramate.co.uk/my-bookings",
      messageUrl: "https://theramate.co.uk/messages",
      directionsUrl: "https://maps.google.com/?q=123+Main+St",
      cancellationPolicySummary: "24 hour cancellation policy",
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
      sessionLocation: "123 Main St, London",
      practitionerName: "John Doe",
      practitionerFirstName: "John",
      clientFirstName: "Test",
      bookingUrl: "https://theramate.co.uk/my-bookings",
      messageUrl: "https://theramate.co.uk/messages",
      directionsUrl: "https://maps.google.com/?q=123+Main+St",
      cancellationPolicySummary: "24 hour cancellation policy",
    },
  },
  // Cancellation emails
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
    name: "practitioner_cancellation",
    emailType: "practitioner_cancellation",
    data: {
      sessionId: "test-session-123",
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      sessionTime: "14:00",
      practitionerName: "John Doe",
      cancellationReason: "Practitioner unavailable",
      refundAmount: 50,
      refundPercent: 100,
    },
  },
  // Rescheduling
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
      sessionId: "test-session-123",
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
      sessionId: "test-session-123",
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      sessionTime: "14:00",
      sessionDuration: 60,
      clientName: "Jane Smith",
      clientEmail: "jane@example.com",
      paymentAmount: 2,
      bookingUrl: "https://theramate.co.uk/practice/sessions/test-session-123",
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
  // Peer request emails
  {
    name: "peer_request_received",
    emailType: "peer_request_received",
    data: {
      requestId: "req-123",
      requesterName: "Jane Smith",
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      sessionTime: "14:00",
      sessionDuration: 60,
      paymentAmount: 2,
      expiresAt: "2025-02-14T12:00:00Z",
      acceptUrl: "https://theramate.co.uk/peer-requests/req-123/accept",
      declineUrl: "https://theramate.co.uk/peer-requests/req-123/decline",
      bookingUrl: "https://theramate.co.uk/peer-requests/req-123",
    },
  },
  {
    name: "peer_request_accepted",
    emailType: "peer_request_accepted",
    data: {
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
    name: "peer_request_declined",
    emailType: "peer_request_declined",
    data: {
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      sessionTime: "14:00",
      sessionDuration: 60,
      practitionerName: "John Doe",
    },
  },
  // Review request
  {
    name: "review_request_client",
    emailType: "review_request_client",
    data: {
      sessionId: "test-session-123",
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      sessionTime: "14:00",
      sessionDuration: 60,
      practitionerName: "John Doe",
    },
  },
  // Guest message
  {
    name: "message_received_guest",
    emailType: "message_received_guest",
    data: {
      conversationId: "conv-123",
      practitionerName: "John Doe",
      messagePreview: "Hello, I wanted to follow up on your session...",
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
      return {
        success: true,
        emailId: result.emailId,
        config: result.config,
      };
    } else {
      console.log(`   ❌ FAILED`);
      console.log(`   Status: ${response.status}`);
      console.log(
        `   Error: ${result.error || result.message || JSON.stringify(result)}`,
      );
      return {
        success: false,
        error: result.error || result.message || JSON.stringify(result),
        status: response.status,
      };
    }
  } catch (error) {
    console.log(`   ❌ ERROR`);
    console.log(`   ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function checkConfiguration() {
  console.log("\n🔧 Checking Configuration...");
  console.log("=".repeat(60));

  // Test basic connectivity
  try {
    const testResponse = await fetch(
      `${SUPABASE_URL}/functions/v1/send-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          emailType: "booking_confirmation_client",
          recipientEmail: "delivered@resend.dev",
          recipientName: "Test",
          data: {
            sessionType: "Test",
            sessionDate: "2025-02-15",
            sessionTime: "14:00",
            sessionPrice: 50,
            sessionDuration: 60,
            practitionerName: "Test",
          },
        }),
      },
    );

    const testResult = await testResponse.json();

    if (testResponse.ok && testResult.success) {
      console.log("✅ Edge Function is accessible");
      console.log(`   Email ID: ${testResult.emailId}`);
      if (testResult.config) {
        console.log(`   From Email: ${testResult.config.from_email_used}`);
        console.log(
          `   RESEND_FROM_EMAIL Secret: ${testResult.config.resend_from_email_set ? "SET" : "NOT SET"}`,
        );
      }
      return true;
    } else {
      console.log("❌ Edge Function returned error");
      console.log(`   Error: ${testResult.error || testResult.message}`);
      return false;
    }
  } catch (error) {
    console.log("❌ Cannot connect to Edge Function");
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log("🚀 Starting Comprehensive Email System Audit");
  console.log(`📬 Test Email: ${TEST_EMAIL}`);
  console.log(`📬 Total Email Types: ${emailTests.length}`);
  console.log("=".repeat(60));

  // Phase 1: Configuration Check
  const configOk = await checkConfiguration();
  if (!configOk) {
    console.log("\n⚠️  Configuration check failed. Some tests may fail.");
  }

  // Phase 2: Test all email types
  console.log("\n📧 Testing All Email Types...");
  console.log("=".repeat(60));

  const results = {
    passed: [],
    failed: [],
    config: null,
  };

  for (const emailTest of emailTests) {
    const result = await testEmail(emailTest);
    if (result.success) {
      results.passed.push({
        name: emailTest.name,
        emailId: result.emailId,
        config: result.config,
      });
    } else {
      results.failed.push({
        name: emailTest.name,
        error: result.error,
        status: result.status,
      });
    }
    // Small delay between tests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Test Results Summary");
  console.log("=".repeat(60));
  console.log(`✅ Passed: ${results.passed.length}/${emailTests.length}`);
  console.log(`❌ Failed: ${results.failed.length}/${emailTests.length}`);
  console.log(
    `📈 Success Rate: ${((results.passed.length / emailTests.length) * 100).toFixed(1)}%`,
  );

  if (results.passed.length > 0) {
    console.log("\n✅ Passed Tests:");
    results.passed.forEach(({ name, emailId }) => {
      console.log(`   - ${name} (ID: ${emailId?.substring(0, 20)}...)`);
    });
  }

  if (results.failed.length > 0) {
    console.log("\n❌ Failed Tests:");
    results.failed.forEach(({ name, error, status }) => {
      console.log(`   - ${name}`);
      console.log(`     Status: ${status || "N/A"}`);
      console.log(`     Error: ${error}`);
    });
  }

  // Configuration summary
  if (results.passed.length > 0 && results.passed[0].config) {
    console.log("\n📧 Email Configuration:");
    const config = results.passed[0].config;
    console.log(`   From Email: ${config.from_email_used}`);
    console.log(
      `   RESEND_FROM_EMAIL Secret: ${config.resend_from_email_set ? "SET ✅" : "NOT SET ⚠️"}`,
    );
  }

  console.log("\n💡 Next Steps:");
  console.log("   1. Check your inbox at " + TEST_EMAIL);
  console.log("   2. Verify emails were received");
  console.log("   3. Check spam folder if emails are missing");
  console.log("   4. Review Resend Dashboard: https://resend.com/emails");
  console.log("   5. Check email_logs table in Supabase for detailed logs");

  return results;
}

runTests().catch(console.error);
