// End-to-End Email Test for ray87 bookings
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://aikqnvltuwwgifuocvto.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testEmailSystem() {
  console.log("🔍 END-TO-END EMAIL SYSTEM TEST");
  console.log("=".repeat(70));
  console.log("");

  // Test 1: Test email function directly
  console.log("📧 Test 1: Testing send-email function directly...");
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        emailType: "booking_confirmation_client",
        recipientEmail: "delivered@resend.dev", // Resend test address
        recipientName: "Test User (ray87)",
        data: {
          sessionId: "test-session-123",
          sessionType: "Massage Therapy",
          sessionDate: "2025-02-15",
          sessionTime: "14:00",
          sessionPrice: 50,
          sessionDuration: 60,
          practitionerName: "Test Practitioner",
          bookingUrl: "https://theramate.co.uk/my-bookings",
          calendarUrl: "#",
          messageUrl: "https://theramate.co.uk/messages",
        },
      },
    });

    if (error) {
      console.log("   ❌ Error:", error.message);
    } else if (data?.success) {
      console.log("   ✅ Email function works!");
      console.log("   Email ID:", data.emailId);
    } else {
      console.log("   ❌ Failed:", data?.error || "Unknown error");
    }
  } catch (err) {
    console.log("   ❌ Exception:", err.message);
  }
  console.log("");

  // Test 2: Check if we can query recent bookings (simpler query)
  console.log("📋 Test 2: Checking recent bookings...");
  try {
    const { data: sessions, error } = await supabase
      .from("client_sessions")
      .select("id, client_email, status, payment_status, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.log("   ⚠️  Could not query sessions:", error.message);
    } else if (sessions && sessions.length > 0) {
      console.log(`   ✅ Found ${sessions.length} recent sessions:`);
      sessions.forEach((s, i) => {
        const isRay87 = s.client_email?.toLowerCase().includes("ray87");
        const icon = isRay87 ? "👤" : "  ";
        console.log(
          `   ${icon} ${i + 1}. ${s.client_email} - ${s.status} (${s.payment_status}) - ${new Date(s.created_at).toLocaleDateString()}`,
        );
      });
    } else {
      console.log("   ℹ️  No recent sessions found");
    }
  } catch (err) {
    console.log("   ⚠️  Exception:", err.message);
  }
  console.log("");

  // Test 3: Check email logs (if table exists)
  console.log("📧 Test 3: Checking email logs...");
  try {
    const { data: emails, error } = await supabase
      .from("email_logs")
      .select("email_type, recipient_email, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      if (
        error.message.includes("relation") ||
        error.message.includes("does not exist")
      ) {
        console.log("   ℹ️  email_logs table does not exist (this is OK)");
      } else {
        console.log("   ⚠️  Error:", error.message);
      }
    } else if (emails && emails.length > 0) {
      console.log(`   ✅ Found ${emails.length} recent email logs:`);
      emails.forEach((e, i) => {
        const isRay87 = e.recipient_email?.toLowerCase().includes("ray87");
        const icon = isRay87 ? "👤" : "  ";
        const statusIcon =
          e.status === "sent" ? "✅" : e.status === "failed" ? "❌" : "⏳";
        console.log(
          `   ${icon} ${i + 1}. ${statusIcon} ${e.email_type} to ${e.recipient_email} - ${e.status}`,
        );
      });
    } else {
      console.log("   ℹ️  No email logs found");
    }
  } catch (err) {
    console.log("   ⚠️  Exception:", err.message);
  }
  console.log("");

  // Test 4: Verify webhook function is deployed with fixes
  console.log("🔧 Test 4: Verifying webhook deployment...");
  console.log("   ℹ️  Check Supabase Dashboard to verify:");
  console.log(
    "   1. Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/functions/stripe-webhook",
  );
  console.log("   2. Search for: [CRITICAL] or [SUCCESS]");
  console.log("   3. If found: ✅ Fixes are deployed");
  console.log("   4. If not found: ❌ Needs deployment");
  console.log("");

  // Summary
  console.log("=".repeat(70));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(70));
  console.log("");
  console.log("Next Steps:");
  console.log(
    "1. Deploy webhook function with fixes (if not already deployed)",
  );
  console.log("2. Create a test booking to verify end-to-end flow");
  console.log("3. Check webhook logs for [SUCCESS] messages");
  console.log("4. Verify emails arrive in inboxes");
  console.log("5. Check Resend Dashboard: https://resend.com/emails");
  console.log("");
}

testEmailSystem().catch(console.error);
