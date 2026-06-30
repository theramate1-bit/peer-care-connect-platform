// Comprehensive test of booking email flow
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://aikqnvltuwwgifuocvto.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAllBookingEmailTypes() {
  console.log("🧪 TESTING ALL BOOKING EMAIL TYPES");
  console.log("=".repeat(60));
  console.log("");

  const emailTypes = [
    {
      name: "Client Booking Confirmation",
      type: "booking_confirmation_client",
      data: {
        sessionId: "test-" + Date.now(),
        sessionType: "Massage Therapy",
        sessionDate: "2025-02-15",
        sessionTime: "14:00",
        sessionPrice: 50,
        sessionDuration: 60,
        practitionerName: "John Doe",
        bookingUrl: "https://theramate.co.uk/my-bookings",
        calendarUrl: "#",
        messageUrl: "https://theramate.co.uk/messages",
      },
    },
    {
      name: "Practitioner Booking Confirmation",
      type: "booking_confirmation_practitioner",
      data: {
        sessionId: "test-" + Date.now(),
        sessionType: "Massage Therapy",
        sessionDate: "2025-02-15",
        sessionTime: "14:00",
        sessionPrice: 50,
        sessionDuration: 60,
        clientName: "Jane Smith",
        clientEmail: "jane@example.com",
        paymentStatus: "completed",
        bookingUrl: "https://theramate.co.uk/practice/sessions/test-123",
        messageUrl: "https://theramate.co.uk/messages",
      },
    },
    {
      name: "Client Payment Confirmation",
      type: "payment_confirmation_client",
      data: {
        sessionId: "test-" + Date.now(),
        paymentId: "pay_test_" + Date.now(),
        paymentAmount: 50,
        sessionType: "Massage Therapy",
        sessionDate: "2025-02-15",
        sessionTime: "14:00",
        sessionLocation: "123 Main St",
        practitionerName: "John Doe",
        bookingUrl: "https://theramate.co.uk/my-bookings",
      },
    },
    {
      name: "Practitioner Payment Received",
      type: "payment_received_practitioner",
      data: {
        paymentAmount: 50,
        platformFee: 0.25,
        practitionerAmount: 49.75,
        clientName: "Jane Smith",
        sessionType: "Massage Therapy",
        sessionDate: "2025-02-15",
        paymentId: "pay_test_" + Date.now(),
      },
    },
  ];

  const results = [];

  for (const emailTest of emailTypes) {
    console.log(`📧 Testing: ${emailTest.name}`);
    console.log(`   Type: ${emailTest.type}`);

    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          emailType: emailTest.type,
          recipientEmail: "delivered@resend.dev", // Resend test address
          recipientName: "Test User",
          data: emailTest.data,
        },
      });

      if (error) {
        console.log(`   ❌ FAILED: ${error.message}`);
        results.push({
          type: emailTest.type,
          status: "FAILED",
          error: error.message,
        });
      } else if (data?.success) {
        console.log(`   ✅ SUCCESS`);
        console.log(`   Email ID: ${data.emailId}`);
        results.push({
          type: emailTest.type,
          status: "SUCCESS",
          emailId: data.emailId,
        });
      } else {
        console.log(`   ❌ FAILED: ${data?.error || "Unknown error"}`);
        results.push({
          type: emailTest.type,
          status: "FAILED",
          error: data?.error,
        });
      }
    } catch (err) {
      console.log(`   ❌ EXCEPTION: ${err.message}`);
      results.push({
        type: emailTest.type,
        status: "FAILED",
        error: err.message,
      });
    }

    console.log("");

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("=".repeat(60));
  console.log("📊 TEST RESULTS SUMMARY");
  console.log("=".repeat(60));
  console.log("");

  const successCount = results.filter((r) => r.status === "SUCCESS").length;
  const failedCount = results.filter((r) => r.status === "FAILED").length;

  results.forEach((result) => {
    const icon = result.status === "SUCCESS" ? "✅" : "❌";
    console.log(`${icon} ${result.type}: ${result.status}`);
    if (result.emailId) {
      console.log(`   Email ID: ${result.emailId}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log("");
  console.log(
    `Total: ${results.length} | Success: ${successCount} | Failed: ${failedCount}`,
  );
  console.log("");

  if (successCount === results.length) {
    console.log("🎉 ALL EMAIL TYPES WORKING!");
    console.log("✅ Booking emails should work correctly");
    console.log("📧 Check Resend Dashboard: https://resend.com/emails");
  } else {
    console.log("⚠️  SOME EMAIL TYPES FAILED");
    console.log("   Check error messages above");
    console.log("   Verify RESEND_API_KEY secret is set correctly");
  }

  return results;
}

async function checkRecentEmailLogs() {
  console.log("\n📋 Checking Recent Email Activity...\n");

  try {
    const { data: logs, error } = await supabase
      .from("email_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      if (
        error.message.includes("relation") ||
        error.message.includes("does not exist")
      ) {
        console.log("ℹ️  email_logs table does not exist (this is OK)");
        console.log("   Emails may still be sending, just not logged");
      } else {
        console.log(`⚠️  Error querying logs: ${error.message}`);
      }
      return;
    }

    if (logs && logs.length > 0) {
      console.log(`✅ Found ${logs.length} recent email logs:\n`);
      logs.forEach((log, index) => {
        const icon =
          log.status === "sent" ? "✅" : log.status === "failed" ? "❌" : "⏳";
        console.log(`${index + 1}. ${icon} ${log.email_type}`);
        console.log(`   To: ${log.recipient_email}`);
        console.log(`   Status: ${log.status}`);
        if (log.resend_email_id) {
          console.log(`   Resend ID: ${log.resend_email_id}`);
        }
        if (log.error_message) {
          console.log(`   Error: ${log.error_message}`);
        }
        console.log(`   Created: ${new Date(log.created_at).toLocaleString()}`);
        console.log("");
      });
    } else {
      console.log("ℹ️  No email logs found");
      console.log("   This could mean:");
      console.log("   - Logging is disabled");
      console.log("   - No recent emails sent");
      console.log("   - Table doesn't exist");
    }
  } catch (err) {
    console.log(`⚠️  Exception: ${err.message}`);
  }
}

async function runFullTest() {
  console.log("🔍 COMPREHENSIVE BOOKING EMAIL TEST");
  console.log("=".repeat(60));
  console.log("");

  // Test all email types
  const results = await testAllBookingEmailTypes();

  // Check email logs
  await checkRecentEmailLogs();

  console.log("=".repeat(60));
  console.log("✅ TEST COMPLETE");
  console.log("=".repeat(60));
  console.log("");
  console.log("Next Steps:");
  console.log("1. If all tests passed → Emails are working!");
  console.log("2. Create a test booking to verify end-to-end");
  console.log("3. Check webhook logs for [SUCCESS] messages");
  console.log("4. Verify emails arrive in inboxes");
  console.log("");
}

runFullTest().catch(console.error);
