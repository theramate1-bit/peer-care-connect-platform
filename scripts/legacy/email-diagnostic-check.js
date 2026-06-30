/**
 * Email System Diagnostic Check
 * Checks configuration and connectivity without sending emails
 */

const SUPABASE_URL = "https://aikqnvltuwwgifuocvto.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1OTkwNjYsImV4cCI6MjA0ODE3NTA2Nn0.XuXUrqDKzj0vZzNCp_3KMqJ4KjZs1LfS3NOMCJ5WGgk";

async function checkEdgeFunctionAccess() {
  console.log("🔍 Checking Edge Function Access...\n");

  // Test 1: Check if function exists and is accessible
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "OPTIONS",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (response.ok) {
      console.log("✅ Edge Function is accessible (CORS preflight OK)");
    } else {
      console.log(`⚠️  Edge Function CORS check returned: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Cannot reach Edge Function: ${error.message}`);
    return false;
  }

  // Test 2: Try with minimal request to check authentication
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
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
    });

    const result = await response.json();

    if (response.status === 401) {
      console.log("❌ Authentication failed: Invalid JWT");
      console.log("   This suggests:");
      console.log("   - Anon key might be expired");
      console.log("   - Edge Function might require service role key");
      console.log("   - Function might have verify_jwt enabled");
      return false;
    } else if (response.status === 400) {
      console.log(
        "✅ Edge Function is accessible (validation error is expected)",
      );
      console.log(`   Response: ${result.error || JSON.stringify(result)}`);
      return true;
    } else if (response.ok && result.success) {
      console.log("✅ Edge Function is working correctly!");
      console.log(`   Email ID: ${result.emailId}`);
      if (result.config) {
        console.log(`   From Email: ${result.config.from_email_used}`);
        console.log(
          `   RESEND_FROM_EMAIL: ${result.config.resend_from_email_set ? "SET ✅" : "NOT SET ⚠️"}`,
        );
      }
      return true;
    } else {
      console.log(`⚠️  Edge Function returned: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(result)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error testing Edge Function: ${error.message}`);
    return false;
  }
}

async function checkSupabaseConnection() {
  console.log("\n🔍 Checking Supabase Connection...\n");

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (response.ok || response.status === 404) {
      console.log("✅ Supabase API is accessible");
      return true;
    } else {
      console.log(`⚠️  Supabase API returned: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Cannot reach Supabase: ${error.message}`);
    return false;
  }
}

async function provideRecommendations() {
  console.log("\n💡 Recommendations:\n");
  console.log("1. Check Supabase Dashboard:");
  console.log(
    "   - Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/settings/functions",
  );
  console.log("   - Verify RESEND_API_KEY secret is set");
  console.log("   - Check Edge Function logs for errors");
  console.log("");
  console.log("2. Check Edge Function Configuration:");
  console.log("   - Verify function is deployed");
  console.log(
    "   - Check if verify_jwt is enabled (might need service role key)",
  );
  console.log(
    "   - Review function logs: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/logs/edge-functions",
  );
  console.log("");
  console.log("3. Test via Supabase Dashboard:");
  console.log(
    "   - Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/functions/send-email",
  );
  console.log('   - Click "Invoke" button');
  console.log("   - Use test payload from EMAIL_TESTING_GUIDE.md");
  console.log("");
  console.log("4. Check Resend Dashboard:");
  console.log("   - Go to: https://resend.com/emails");
  console.log("   - Review recent email sends");
  console.log("   - Check API key status: https://resend.com/api-keys");
}

async function runDiagnostics() {
  console.log("🚀 Email System Diagnostic Check");
  console.log("=".repeat(60));
  console.log(`📡 Supabase URL: ${SUPABASE_URL}`);
  console.log("=".repeat(60));

  const supabaseOk = await checkSupabaseConnection();
  const functionOk = await checkEdgeFunctionAccess();

  console.log("\n" + "=".repeat(60));
  console.log("📊 Diagnostic Summary");
  console.log("=".repeat(60));
  console.log(`Supabase Connection: ${supabaseOk ? "✅ OK" : "❌ FAILED"}`);
  console.log(`Edge Function Access: ${functionOk ? "✅ OK" : "❌ FAILED"}`);

  if (!functionOk) {
    await provideRecommendations();
  }
}

runDiagnostics().catch(console.error);
