// Comprehensive Booking Email Diagnostic Script
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://aikqnvltuwwgifuocvto.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRecentBookings() {
  console.log("📋 Checking Recent Bookings...\n");

  try {
    // Check recent confirmed bookings
    const { data: sessions, error } = await supabase
      .from("client_sessions")
      .select(
        `
        id,
        status,
        payment_status,
        created_at,
        client_email,
        therapist_id,
        session_date,
        start_time
      `,
      )
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.log(`❌ Error querying bookings: ${error.message}`);
      return;
    }

    if (sessions && sessions.length > 0) {
      console.log(`✅ Found ${sessions.length} recent confirmed bookings:\n`);
      sessions.forEach((session, index) => {
        console.log(`${index + 1}. Booking ID: ${session.id}`);
        console.log(`   Client Email: ${session.client_email || "N/A"}`);
        console.log(`   Status: ${session.status}`);
        console.log(`   Payment Status: ${session.payment_status}`);
        console.log(
          `   Created: ${new Date(session.created_at).toLocaleString()}`,
        );
        console.log(`   Session Date: ${session.session_date || "N/A"}`);
        console.log("");
      });
    } else {
      console.log("ℹ️  No confirmed bookings found in last period");
    }

    return sessions;
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
  }
}

async function checkEmailLogs() {
  console.log("📧 Checking Email Logs...\n");

  try {
    const { data: logs, error } = await supabase
      .from("email_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.log(`❌ Error querying email_logs: ${error.message}`);
      if (
        error.message.includes("relation") ||
        error.message.includes("does not exist")
      ) {
        console.log(
          "⚠️  email_logs table may not exist - this is OK, emails may still be sending",
        );
      }
      return;
    }

    if (logs && logs.length > 0) {
      console.log(`✅ Found ${logs.length} recent email logs:\n`);

      const bookingEmails = logs.filter(
        (log) =>
          log.email_type?.includes("booking") ||
          log.email_type?.includes("payment"),
      );

      if (bookingEmails.length > 0) {
        console.log(`📬 Booking-related emails: ${bookingEmails.length}\n`);
        bookingEmails.forEach((log, index) => {
          console.log(`${index + 1}. ${log.email_type}`);
          console.log(`   To: ${log.recipient_email}`);
          console.log(`   Status: ${log.status}`);
          console.log(`   Resend ID: ${log.resend_email_id || "N/A"}`);
          console.log(`   Error: ${log.error_message || "None"}`);
          console.log(
            `   Created: ${new Date(log.created_at).toLocaleString()}`,
          );
          console.log("");
        });
      } else {
        console.log("⚠️  No booking-related emails found in logs");
        console.log("   This suggests emails may not be sending at all\n");
      }

      // Summary
      const successCount = logs.filter((l) => l.status === "sent").length;
      const failedCount = logs.filter((l) => l.status === "failed").length;
      const pendingCount = logs.filter((l) => l.status === "pending").length;

      console.log("📊 Email Summary:");
      console.log(`   ✅ Sent: ${successCount}`);
      console.log(`   ❌ Failed: ${failedCount}`);
      console.log(`   ⏳ Pending: ${pendingCount}`);
      console.log("");
    } else {
      console.log("⚠️  No email logs found");
      console.log("   This could mean:");
      console.log("   1. Emails are not being triggered");
      console.log("   2. Email logging is disabled");
      console.log("   3. Table does not exist\n");
    }
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
  }
}

async function testEmailFunction() {
  console.log("🧪 Testing Email Function Directly...\n");

  const testPayload = {
    emailType: "booking_confirmation_client",
    recipientEmail: "delivered@resend.dev",
    recipientName: "Test User",
    data: {
      sessionId: "test-diagnostic-123",
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

    const { data, error } = await supabase.functions.invoke("send-email", {
      body: testPayload,
    });

    if (error) {
      console.log(`❌ Function Error: ${error.message}`);
      console.log(`   Details: ${JSON.stringify(error, null, 2)}`);

      if (error.message.includes("RESEND_API_KEY")) {
        console.log("\n🔴 CRITICAL ISSUE FOUND:");
        console.log("   RESEND_API_KEY secret is missing or invalid!");
        console.log("   Fix: Add secret in Supabase Dashboard");
        console.log("   Location: Settings → Edge Functions → Secrets");
        console.log("   Name: RESEND_API_KEY");
        console.log("   Value: re_PtKC1CKr_Lt2ais9fSf729cJ2Vx7fTjtQ");
      }
      return;
    }

    if (data) {
      if (data.success) {
        console.log("✅ Email Function Works!");
        console.log(`   Email ID: ${data.emailId}`);
        console.log("   ✅ Function is properly configured");
      } else {
        console.log("❌ Email Function Returned Failure");
        console.log(
          `   Error: ${data.error || data.details || JSON.stringify(data)}`,
        );
      }
    } else {
      console.log("⚠️  No response data received");
    }
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
    console.log(`   Stack: ${err.stack}`);
  }
}

async function checkRecentPayments() {
  console.log("\n💳 Checking Recent Payments...\n");

  try {
    const { data: payments, error } = await supabase
      .from("payments")
      .select(
        `
        id,
        payment_status,
        amount,
        created_at,
        stripe_payment_intent_id
      `,
      )
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.log(`❌ Error querying payments: ${error.message}`);
      return;
    }

    if (payments && payments.length > 0) {
      console.log(`✅ Found ${payments.length} recent payments:\n`);
      payments.forEach((payment, index) => {
        console.log(`${index + 1}. Payment ID: ${payment.id}`);
        console.log(`   Status: ${payment.payment_status}`);
        console.log(`   Amount: £${(payment.amount / 100).toFixed(2)}`);
        console.log(
          `   Stripe ID: ${payment.stripe_payment_intent_id || "N/A"}`,
        );
        console.log(
          `   Created: ${new Date(payment.created_at).toLocaleString()}`,
        );
        console.log("");
      });
    } else {
      console.log("ℹ️  No recent payments found");
    }
  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
  }
}

async function runDiagnostics() {
  console.log("🔍 BOOKING EMAIL DIAGNOSTIC TOOL");
  console.log("=".repeat(50));
  console.log("");

  // 1. Check recent bookings
  await checkRecentBookings();

  // 2. Check email logs
  await checkEmailLogs();

  // 3. Check recent payments
  await checkRecentPayments();

  // 4. Test email function
  await testEmailFunction();

  console.log("\n" + "=".repeat(50));
  console.log("📋 DIAGNOSTIC SUMMARY");
  console.log("=".repeat(50));
  console.log("");
  console.log("Next Steps:");
  console.log("1. If email function test failed → Check RESEND_API_KEY secret");
  console.log("2. If no email logs → Emails may not be triggering");
  console.log("3. If logs show failures → Check error messages");
  console.log(
    "4. Deploy fixed webhook function → supabase functions deploy stripe-webhook",
  );
  console.log("");
}

runDiagnostics().catch(console.error);
