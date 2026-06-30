const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://aikqnvltuwwgifuocvto.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac";

const TEST_EMAIL = "delivered@resend.dev";

async function testEmail(emailType, data) {
  console.log(`\n📧 Testing: ${emailType}`);

  const payload = {
    emailType,
    recipientEmail: TEST_EMAIL,
    recipientName: "Test User",
    data,
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
      console.log(
        `📬 Email ID: ${responseData.emailId || responseData.data?.id || "N/A"}`,
      );
      return true;
    } else {
      console.log(`❌ FAILED - Status: ${response.status}`);
      console.log(`Error: ${JSON.stringify(responseData, null, 2)}`);
      return false;
    }
  } catch (err) {
    console.log(`❌ EXCEPTION: ${err.message}`);
    return false;
  }
}

async function runTests() {
  console.log("🧪 Testing Email Types That Previously Worked");
  console.log("=".repeat(60));

  // Test email types that appear in email_logs as successful
  const tests = [
    {
      type: "payment_received_practitioner",
      data: {
        paymentAmount: 50,
        platformFee: 2.5,
        practitionerAmount: 47.5,
        paymentId: "test_123",
        clientName: "Test Client",
        sessionType: "Massage Therapy",
        sessionDate: "2025-12-20",
      },
    },
    {
      type: "payment_confirmation_client",
      data: {
        paymentAmount: 50,
        paymentId: "test_123",
        sessionType: "Massage Therapy",
        sessionDate: "2025-12-20",
        sessionTime: "14:00",
        practitionerName: "John Doe",
      },
    },
    {
      type: "booking_confirmation_practitioner",
      data: {
        sessionType: "Massage Therapy",
        sessionDate: "2025-12-20",
        sessionTime: "14:00",
        sessionPrice: 50,
        sessionDuration: 60,
        clientName: "Jane Smith",
        clientEmail: "client@example.com",
      },
    },
  ];

  let successCount = 0;
  for (const test of tests) {
    const result = await testEmail(test.type, test.data);
    if (result) successCount++;
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second between tests
  }

  console.log("\n" + "=".repeat(60));
  console.log(`📊 Results: ${successCount}/${tests.length} successful`);

  if (successCount > 0) {
    console.log("\n✅ Email system is working!");
    console.log("📧 Check Resend Dashboard: https://resend.com/emails");
  } else {
    console.log("\n❌ All tests failed. Possible issues:");
    console.log("   1. RESEND_API_KEY secret not set in Supabase");
    console.log("   2. Edge Function needs to be redeployed");
    console.log("   3. Check Edge Function logs in Supabase Dashboard");
  }
}

runTests().catch(console.error);
