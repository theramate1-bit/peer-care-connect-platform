// Test email function with service role key (bypasses auth issues)
const { createClient } = require("@supabase/supabase-js");

// Note: Service role key should be kept secret, but we need it for testing
// In production, Edge Functions use this automatically via Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const SUPABASE_URL = "https://aikqnvltuwwgifuocvto.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTYxOTk0OCwiZXhwIjoyMDcxMTk1OTQ4fQ.7VqJ8K9L2mN3oP4Q5R6S7T8U9V0W1X2Y3Z4A5B6C7D8E9F0G1H2I3J4K5L6M";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testEmailFunction() {
  console.log("🧪 Testing Email Function with Service Role Key...\n");
  console.log(
    "⚠️  This bypasses authentication and tests the function directly\n",
  );

  const testPayload = {
    emailType: "booking_confirmation_client",
    recipientEmail: "delivered@resend.dev", // Resend test address
    recipientName: "Test User",
    data: {
      sessionId: "test-diagnostic-" + Date.now(),
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
  };

  try {
    console.log("📤 Invoking send-email function...");
    console.log("Payload:", JSON.stringify(testPayload, null, 2));
    console.log("");

    const { data, error } = await supabase.functions.invoke("send-email", {
      body: testPayload,
    });

    console.log("Response Status:", error ? "ERROR" : "SUCCESS");
    console.log("");

    if (error) {
      console.log("❌ Function Error:");
      console.log("   Message:", error.message);
      console.log("   Details:", JSON.stringify(error, null, 2));

      if (error.message.includes("RESEND_API_KEY")) {
        console.log("\n🔴 ISSUE FOUND:");
        console.log("   RESEND_API_KEY secret is missing or not accessible!");
        console.log(
          "   Even though you said it's set, the function can't access it.",
        );
        console.log("\n   Possible causes:");
        console.log(
          "   1. Secret name is wrong (should be exactly: RESEND_API_KEY)",
        );
        console.log(
          "   2. Function needs to be redeployed after adding secret",
        );
        console.log("   3. Secret is set but function can't read it");
        console.log("\n   Fix:");
        console.log(
          "   1. Verify secret exists: Settings → Edge Functions → Secrets",
        );
        console.log(
          "   2. Redeploy function: supabase functions deploy send-email",
        );
        console.log("   3. Test again");
      } else if (
        error.message.includes("Invalid JWT") ||
        error.message.includes("401")
      ) {
        console.log("\n⚠️  Authentication Issue:");
        console.log("   Function requires authentication");
        console.log("   This test uses service role key, so auth should work");
        console.log("   Check if function has verify_jwt enabled");
      } else if (
        error.message.includes("fetch failed") ||
        error.message.includes("network")
      ) {
        console.log("\n⚠️  Network Issue:");
        console.log("   Cannot reach Supabase Edge Functions");
        console.log("   Check internet connection or Supabase status");
      }
      return;
    }

    if (data) {
      if (data.success) {
        console.log("✅ EMAIL FUNCTION WORKS!");
        console.log("   Email ID:", data.emailId);
        console.log("   Message:", data.message);
        console.log("\n✅ Function is properly configured");
        console.log("✅ RESEND_API_KEY secret is accessible");
        console.log("✅ Email was sent successfully");
        console.log("\n📧 Check Resend Dashboard: https://resend.com/emails");
        console.log("   You should see the email in the dashboard");
      } else {
        console.log("❌ Email Function Returned Failure:");
        console.log(
          "   Error:",
          data.error || data.details || JSON.stringify(data),
        );

        if (data.error && data.error.includes("RESEND_API_KEY")) {
          console.log("\n🔴 ISSUE: RESEND_API_KEY not accessible to function");
        }
      }
    } else {
      console.log("⚠️  No response data received");
      console.log("   Function may have timed out or crashed");
    }
  } catch (err) {
    console.log("❌ Exception:", err.message);
    console.log("   Stack:", err.stack);

    if (err.message.includes("fetch")) {
      console.log("\n⚠️  Network/Connection Issue:");
      console.log("   Cannot reach Supabase Edge Functions endpoint");
      console.log("   This might be a network/firewall issue");
    }
  }
}

async function checkFunctionStatus() {
  console.log("📋 Checking Function Status...\n");

  try {
    // Try to invoke with minimal payload to check if function exists
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: { test: true },
    });

    if (error) {
      if (
        error.message.includes("not found") ||
        error.message.includes("404")
      ) {
        console.log("❌ Function not found or not deployed");
        console.log("   Deploy with: supabase functions deploy send-email");
      } else if (error.message.includes("RESEND_API_KEY")) {
        console.log("⚠️  Function exists but RESEND_API_KEY issue detected");
      } else {
        console.log("⚠️  Function exists but returned error:", error.message);
      }
    } else {
      console.log("✅ Function exists and is accessible");
    }
  } catch (err) {
    console.log("⚠️  Could not check function status:", err.message);
  }

  console.log("");
}

async function runTest() {
  console.log("🔍 EMAIL FUNCTION DIAGNOSTIC TEST");
  console.log("=".repeat(60));
  console.log("");

  await checkFunctionStatus();
  await testEmailFunction();

  console.log("\n" + "=".repeat(60));
  console.log("📋 SUMMARY");
  console.log("=".repeat(60));
  console.log("");
  console.log("If test failed:");
  console.log("1. Verify RESEND_API_KEY secret exists in Supabase");
  console.log("2. Redeploy send-email function");
  console.log("3. Check function logs in Supabase Dashboard");
  console.log("4. Verify webhook function is also deployed with fixes");
  console.log("");
}

runTest().catch(console.error);
