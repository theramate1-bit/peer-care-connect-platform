// Check Resend emails for ray87 via Supabase email_logs and Resend API
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://aikqnvltuwwgifuocvto.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac";
const RESEND_API_URL = "https://api.resend.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkRay87Emails() {
  console.log("=".repeat(70));
  console.log("RESEND EMAIL CHECK FOR ray87 BOOKINGS");
  console.log("=".repeat(70));
  console.log("");

  // Step 1: Get Resend API key
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.log("⚠️  RESEND_API_KEY not in environment");
    console.log("   Will check Supabase email_logs only");
    console.log("");
  } else {
    console.log("✅ Resend API key found");
    console.log("");
  }

  // Step 2: Query Supabase email_logs for ray87
  console.log("📋 Step 1: Checking Supabase email_logs for ray87...");
  console.log("");

  try {
    const { data: emailLogs, error } = await supabase
      .from("email_logs")
      .select("*")
      .or("recipient_email.ilike.%ray87%,recipient_email.ilike.%ray%")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      if (
        error.message.includes("relation") ||
        error.message.includes("does not exist")
      ) {
        console.log("ℹ️  email_logs table does not exist");
        console.log(
          "   This is OK - emails may still be sent but not logged in database",
        );
        console.log("");
        console.log("📧 ALTERNATIVE: Check Resend Dashboard directly:");
        console.log("   https://resend.com/emails");
        console.log("   Search for: ray87");
        console.log("");
        return;
      }
      throw error;
    }

    if (!emailLogs || emailLogs.length === 0) {
      console.log("⚠️  No email logs found for ray87");
      console.log("");
      console.log("This could mean:");
      console.log("  1. No emails have been sent to ray87");
      console.log(
        "  2. Emails are sent but not logged (if email_logs table is new)",
      );
      console.log('  3. Email address doesn\'t contain "ray87"');
      console.log("");
      console.log("📧 Check Resend Dashboard: https://resend.com/emails");
      console.log("");
      return;
    }

    console.log(`✅ Found ${emailLogs.length} email log(s) for ray87:`);
    console.log("");

    // Group by status
    const sent = emailLogs.filter(
      (e) => e.status === "sent" && e.resend_email_id,
    );
    const failed = emailLogs.filter((e) => e.status === "failed");
    const pending = emailLogs.filter((e) => e.status === "pending");

    console.log("📊 Summary:");
    console.log(`   ✅ Sent: ${sent.length}`);
    console.log(`   ❌ Failed: ${failed.length}`);
    console.log(`   ⏳ Pending: ${pending.length}`);
    console.log("");

    // Show details
    emailLogs.forEach((log, i) => {
      const statusIcon =
        log.status === "sent" ? "✅" : log.status === "failed" ? "❌" : "⏳";
      console.log(`${i + 1}. ${statusIcon} ${log.email_type}`);
      console.log(`   To: ${log.recipient_email}`);
      console.log(`   Status: ${log.status}`);
      if (log.resend_email_id) {
        console.log(`   Resend ID: ${log.resend_email_id}`);
      }
      if (log.error_message) {
        console.log(`   Error: ${log.error_message}`);
      }
      console.log(`   Created: ${new Date(log.created_at).toLocaleString()}`);
      if (log.sent_at) {
        console.log(`   Sent: ${new Date(log.sent_at).toLocaleString()}`);
      }
      console.log("");
    });

    // Step 3: Verify specific emails with Resend API if we have the key
    if (resendApiKey && sent.length > 0) {
      console.log("🔍 Step 2: Verifying emails with Resend API...");
      console.log("");

      for (const log of sent.slice(0, 5)) {
        // Check first 5 to avoid rate limits
        if (log.resend_email_id) {
          try {
            console.log(`   Checking: ${log.resend_email_id}...`);
            const response = await fetch(
              `${RESEND_API_URL}/emails/${log.resend_email_id}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${resendApiKey}`,
                  "Content-Type": "application/json",
                },
              },
            );

            if (response.ok) {
              const email = await response.json();
              console.log(`   ✅ Verified in Resend:`);
              console.log(`      To: ${email.to}`);
              console.log(`      From: ${email.from}`);
              console.log(`      Subject: ${email.subject}`);
              console.log(`      Created: ${email.created_at}`);
              console.log(`      Last Event: ${email.last_event || "unknown"}`);
            } else {
              const error = await response.json();
              console.log(
                `   ⚠️  Could not verify: ${error.message || "Unknown error"}`,
              );
            }
          } catch (err) {
            console.log(`   ⚠️  Error checking: ${err.message}`);
          }
          console.log("");
        }
      }
    } else if (!resendApiKey && sent.length > 0) {
      console.log("ℹ️  To verify emails with Resend API:");
      console.log("   Set RESEND_API_KEY environment variable");
      console.log("   Or check Resend Dashboard: https://resend.com/emails");
      console.log("");
    }

    // Step 4: Check for booking-related emails
    const bookingEmails = emailLogs.filter(
      (e) =>
        e.email_type?.includes("booking") || e.email_type?.includes("payment"),
    );

    if (bookingEmails.length > 0) {
      console.log("📬 Booking-related emails found:");
      bookingEmails.forEach((e) => {
        const statusIcon =
          e.status === "sent" ? "✅" : e.status === "failed" ? "❌" : "⏳";
        console.log(`   ${statusIcon} ${e.email_type} - ${e.status}`);
      });
      console.log("");
    } else {
      console.log("⚠️  No booking-related emails found");
      console.log("   This suggests booking emails may not have been sent");
      console.log("");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.message.includes("fetch failed")) {
      console.log("");
      console.log("⚠️  Network error - cannot connect to Supabase");
      console.log("   Please check:");
      console.log("   1. Internet connection");
      console.log("   2. Supabase project is active");
      console.log(
        "   3. Try checking Resend Dashboard directly: https://resend.com/emails",
      );
    }
  }

  console.log("=".repeat(70));
  console.log("📊 FINAL SUMMARY");
  console.log("=".repeat(70));
  console.log("");
  console.log("✅ Checked Supabase email_logs");
  if (resendApiKey) {
    console.log("✅ Verified emails with Resend API");
  } else {
    console.log("⚠️  Could not verify with Resend API (no API key)");
  }
  console.log("");
  console.log("🔗 Quick Links:");
  console.log("   • Resend Dashboard: https://resend.com/emails");
  console.log(
    "   • Supabase Dashboard: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto",
  );
  console.log(
    "   • Edge Function Logs: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/logs/edge-functions",
  );
  console.log("");
}

checkRay87Emails().catch(console.error);
