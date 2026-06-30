const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://aikqnvltuwwgifuocvto.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test email address - using Resend's test address
const TEST_EMAIL = "delivered@resend.dev";

async function testEmailSending(emailType, testData) {
  console.log(`\n📧 Testing: ${emailType}`);
  console.log("─".repeat(50));

  const payload = {
    emailType,
    recipientEmail: TEST_EMAIL,
    recipientName: testData.recipientName || "Test User",
    data: testData,
  };

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    if (response.ok) {
      console.log(`✅ SUCCESS - Status: ${response.status}`);
      if (responseData.emailId || responseData.data?.id) {
        console.log(
          `📬 Email ID: ${responseData.emailId || responseData.data?.id}`,
        );
      }
      if (responseData.message) {
        console.log(`💬 Message: ${responseData.message}`);
      }
      return {
        success: true,
        emailId: responseData.emailId || responseData.data?.id,
      };
    } else {
      console.log(`❌ FAILED - Status: ${response.status}`);
      console.log(`🔴 Error: ${JSON.stringify(responseData, null, 2)}`);

      // Check for specific error types
      if (
        responseData.details &&
        responseData.details.includes("RESEND_API_KEY")
      ) {
        console.log("\n🚨 CRITICAL: RESEND_API_KEY secret is missing!");
        console.log(
          "   Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/settings/functions",
        );
        console.log("   Add secret: RESEND_API_KEY");
      }

      if (
        responseData.details &&
        responseData.details.includes("Unknown email type")
      ) {
        console.log(
          `\n⚠️  Email type "${emailType}" not recognized by Edge Function`,
        );
        console.log(
          "   This may indicate the Edge Function needs to be redeployed",
        );
      }

      return { success: false, error: responseData };
    }
  } catch (err) {
    console.log(`❌ EXCEPTION: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function checkEmailLogs() {
  console.log("\n📊 Checking email_logs table...");
  console.log("─".repeat(50));

  try {
    const { data, error } = await supabase
      .from("email_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.log(`❌ Error querying email_logs: ${error.message}`);
      return;
    }

    if (data && data.length > 0) {
      console.log(`✅ Found ${data.length} recent email logs:`);
      data.forEach((log, index) => {
        console.log(`\n${index + 1}. ${log.email_type}`);
        console.log(`   To: ${log.recipient_email}`);
        console.log(`   Status: ${log.status}`);
        console.log(`   Resend ID: ${log.resend_email_id || "N/A"}`);
        console.log(`   Created: ${new Date(log.created_at).toLocaleString()}`);
      });
    } else {
      console.log("ℹ️  No email logs found in database");
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }
}

async function runTests() {
  console.log("🧪 COMPREHENSIVE EMAIL SYSTEM TEST");
  console.log("=".repeat(50));
  console.log(`🌐 Supabase URL: ${SUPABASE_URL}`);
  console.log(`📧 Test Email: ${TEST_EMAIL}`);
  console.log(`⏰ Test Time: ${new Date().toLocaleString()}`);
  console.log("=".repeat(50));

  const results = [];

  // Test 1: Booking Confirmation (Client)
  const bookingClientResult = await testEmailSending(
    "booking_confirmation_client",
    {
      sessionType: "Massage Therapy",
      sessionDate: "2025-12-20",
      sessionTime: "14:00",
      sessionPrice: 50,
      sessionDuration: 60,
      practitionerName: "John Doe",
      bookingUrl: "https://theramate.co.uk/my-bookings",
      messageUrl: "https://theramate.co.uk/messages",
    },
  );
  results.push({ type: "booking_confirmation_client", ...bookingClientResult });

  // Test 2: Booking Confirmation (Practitioner)
  const bookingPractitionerResult = await testEmailSending(
    "booking_confirmation_practitioner",
    {
      sessionType: "Massage Therapy",
      sessionDate: "2025-12-20",
      sessionTime: "14:00",
      sessionPrice: 50,
      sessionDuration: 60,
      clientName: "Jane Smith",
      bookingUrl: "https://theramate.co.uk/practice/sessions",
    },
  );
  results.push({
    type: "booking_confirmation_practitioner",
    ...bookingPractitionerResult,
  });

  // Test 3: Payment Confirmation (Client)
  const paymentClientResult = await testEmailSending(
    "payment_confirmation_client",
    {
      paymentAmount: 50,
      paymentId: "test_payment_123",
      sessionType: "Massage Therapy",
      sessionDate: "2025-12-20",
      sessionTime: "14:00",
      practitionerName: "John Doe",
    },
  );
  results.push({ type: "payment_confirmation_client", ...paymentClientResult });

  // Test 4: Session Reminder (24h)
  const reminder24hResult = await testEmailSending("session_reminder_24h", {
    sessionType: "Massage Therapy",
    sessionDate: "2025-12-20",
    sessionTime: "14:00",
    sessionDuration: 60,
    practitionerName: "John Doe",
    clientName: "Jane Smith",
    bookingUrl: "https://theramate.co.uk/my-bookings",
  });
  results.push({ type: "session_reminder_24h", ...reminder24hResult });

  // Test 5: Cancellation
  const cancellationResult = await testEmailSending("cancellation", {
    sessionType: "Massage Therapy",
    sessionDate: "2025-12-20",
    sessionTime: "14:00",
    cancellationReason: "Test cancellation",
    refundAmount: 50,
    bookingUrl: "https://theramate.co.uk/my-bookings",
  });
  results.push({ type: "cancellation", ...cancellationResult });

  // Summary
  console.log("\n\n📊 TEST SUMMARY");
  console.log("=".repeat(50));
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);

  if (failed > 0) {
    console.log("\n❌ Failed Tests:");
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`   - ${r.type}`);
      });
  }

  if (successful > 0) {
    console.log("\n✅ Successful Tests:");
    results
      .filter((r) => r.success)
      .forEach((r) => {
        console.log(`   - ${r.type} (ID: ${r.emailId || "N/A"})`);
      });
  }

  // Check email logs
  await checkEmailLogs();

  console.log("\n\n💡 Next Steps:");
  console.log("─".repeat(50));
  if (failed > 0) {
    console.log("1. Check Supabase Edge Function logs for errors");
    console.log("2. Verify RESEND_API_KEY secret is set in Supabase Dashboard");
    console.log("3. Check Resend Dashboard: https://resend.com/emails");
    console.log("4. Verify Edge Function is deployed with latest code");
  } else {
    console.log(
      "✅ All tests passed! Check Resend Dashboard to verify email delivery:",
    );
    console.log("   https://resend.com/emails");
  }

  console.log("\n📧 Test emails sent to: delivered@resend.dev");
  console.log(
    "   (This is Resend's test address - emails are delivered but not to a real inbox)",
  );
}

runTests().catch(console.error);
