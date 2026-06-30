// Comprehensive Email System Diagnostic Script
// This script checks all common reasons why emails might not be sending

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://aikqnvltuwwgifuocvto.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnoseEmailIssues() {
  console.log("🔍 EMAIL SYSTEM DIAGNOSTIC");
  console.log("=".repeat(70));
  console.log("");

  const issues = [];
  const warnings = [];
  const successes = [];

  // Test 1: Check if send-email function exists and is accessible
  console.log("📧 Test 1: Testing send-email Edge Function...");
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        emailType: "booking_confirmation_client",
        recipientEmail: "delivered@resend.dev", // Resend test address that always works
        recipientName: "Test User",
        data: {
          sessionId: "test-diagnostic-123",
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
      console.log("   ❌ ERROR:", error.message);
      issues.push(`Edge Function Error: ${error.message}`);

      // Check for specific error types
      if (error.message.includes("RESEND_API_KEY")) {
        issues.push(
          "🔴 CRITICAL: RESEND_API_KEY secret is missing from Edge Function secrets",
        );
        console.log(
          "   💡 Fix: Add RESEND_API_KEY to Supabase Dashboard → Settings → Edge Functions → Secrets",
        );
      }
      if (error.message.includes("CORS") || error.message.includes("origin")) {
        issues.push(
          "⚠️  CORS issue detected - check ALLOWED_ORIGINS configuration",
        );
      }
      if (error.message.includes("timeout")) {
        issues.push(
          "⚠️  Request timeout - Resend API may be slow or unreachable",
        );
      }
    } else if (data) {
      if (data.success) {
        console.log("   ✅ Email function works!");
        console.log("   📧 Email ID:", data.emailId);
        successes.push("Edge Function is working and can send emails");
      } else {
        console.log(
          "   ❌ Email function returned error:",
          data.error || data.message,
        );
        issues.push(
          `Edge Function returned error: ${data.error || data.message}`,
        );
      }
    } else {
      console.log("   ⚠️  No data returned from function");
      warnings.push("Edge Function returned no data");
    }
  } catch (err) {
    console.log("   ❌ EXCEPTION:", err.message);
    issues.push(`Exception calling Edge Function: ${err.message}`);
  }
  console.log("");

  // Test 2: Check recent email logs
  console.log("📋 Test 2: Checking email logs (last 20)...");
  try {
    const { data: emails, error } = await supabase
      .from("email_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      if (
        error.message.includes("relation") ||
        error.message.includes("does not exist")
      ) {
        console.log("   ⚠️  email_logs table does not exist");
        warnings.push("email_logs table missing - emails may not be logged");
      } else {
        console.log("   ❌ Error querying email_logs:", error.message);
        issues.push(`Cannot query email_logs: ${error.message}`);
      }
    } else if (emails && emails.length > 0) {
      console.log(`   ✅ Found ${emails.length} email logs`);

      // Analyze email statuses
      const sent = emails.filter((e) => e.status === "sent").length;
      const failed = emails.filter((e) => e.status === "failed").length;
      const pending = emails.filter((e) => e.status === "pending").length;

      console.log(
        `   📊 Status breakdown: ${sent} sent, ${failed} failed, ${pending} pending`,
      );

      if (failed > 0) {
        console.log("   ⚠️  Found failed emails - checking details...");
        const failedEmails = emails
          .filter((e) => e.status === "failed")
          .slice(0, 3);
        failedEmails.forEach((email, i) => {
          console.log(
            `   ${i + 1}. ${email.email_type} to ${email.recipient_email}`,
          );
          if (email.error_message) {
            console.log(`      Error: ${email.error_message}`);
            issues.push(
              `Failed email: ${email.email_type} - ${email.error_message}`,
            );
          }
          if (email.metadata?.resend_response) {
            const resendError = email.metadata.resend_response;
            if (resendError.message) {
              console.log(`      Resend: ${resendError.message}`);
            }
          }
        });
      }

      if (sent > 0) {
        successes.push(`${sent} emails successfully sent recently`);
      }

      // Check for missing resend_email_id (emails that didn't reach Resend)
      const noId = emails.filter(
        (e) => !e.resend_email_id && e.status !== "pending",
      );
      if (noId.length > 0) {
        console.log(
          `   ⚠️  ${noId.length} emails without Resend ID (may not have reached Resend)`,
        );
        warnings.push(
          `${noId.length} emails logged but no Resend ID - may not have been sent`,
        );
      }
    } else {
      console.log("   ⚠️  No email logs found");
      warnings.push(
        "No email logs found - either no emails sent recently or logging is broken",
      );
    }
  } catch (err) {
    console.log("   ❌ Exception:", err.message);
    issues.push(`Exception checking email logs: ${err.message}`);
  }
  console.log("");

  // Test 3: Check recent bookings that should have triggered emails
  console.log("📅 Test 3: Checking recent confirmed bookings...");
  try {
    const { data: sessions, error } = await supabase
      .from("client_sessions")
      .select("id, client_email, status, payment_status, created_at")
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.log("   ⚠️  Error querying sessions:", error.message);
      warnings.push(`Cannot query sessions: ${error.message}`);
    } else if (sessions && sessions.length > 0) {
      console.log(`   ✅ Found ${sessions.length} confirmed sessions`);

      // Check if emails were sent for these sessions
      for (const session of sessions.slice(0, 3)) {
        const { data: sessionEmails } = await supabase
          .from("email_logs")
          .select("email_type, status, created_at")
          .or(
            `metadata->>'sessionId'.eq.${session.id},metadata->>'sessionId'.eq.'${session.id}'`,
          )
          .order("created_at", { ascending: false })
          .limit(5);

        if (!sessionEmails || sessionEmails.length === 0) {
          console.log(
            `   ⚠️  Session ${session.id} (${session.client_email}) - NO EMAILS FOUND`,
          );
          issues.push(
            `Confirmed session ${session.id} has no email logs - emails may not have been sent`,
          );
        } else {
          const sentCount = sessionEmails.filter(
            (e) => e.status === "sent",
          ).length;
          console.log(`   ✅ Session ${session.id} - ${sentCount} emails sent`);
        }
      }
    } else {
      console.log(
        "   ℹ️  No confirmed sessions found (this is OK if no recent bookings)",
      );
    }
  } catch (err) {
    console.log("   ❌ Exception:", err.message);
    warnings.push(`Exception checking sessions: ${err.message}`);
  }
  console.log("");

  // Test 4: Check webhook function (if it exists)
  console.log("🔗 Test 4: Checking webhook function status...");
  try {
    // Try to invoke webhook function to see if it exists
    const { data: webhookData, error: webhookError } =
      await supabase.functions.invoke("stripe-webhook", {
        body: { test: true },
      });

    if (webhookError) {
      if (
        webhookError.message.includes("not found") ||
        webhookError.message.includes("404")
      ) {
        console.log(
          "   ⚠️  stripe-webhook function not found or not accessible",
        );
        warnings.push("stripe-webhook function may not be deployed");
      } else {
        console.log(
          "   ℹ️  Webhook function exists (error is expected for test call)",
        );
        successes.push("stripe-webhook function is deployed");
      }
    } else {
      console.log("   ✅ Webhook function is accessible");
      successes.push("stripe-webhook function is deployed and accessible");
    }
  } catch (err) {
    console.log("   ℹ️  Could not test webhook function (this is OK)");
  }
  console.log("");

  // Summary
  console.log("=".repeat(70));
  console.log("📊 DIAGNOSTIC SUMMARY");
  console.log("=".repeat(70));
  console.log("");

  if (successes.length > 0) {
    console.log("✅ WORKING:");
    successes.forEach((s) => console.log(`   ✅ ${s}`));
    console.log("");
  }

  if (warnings.length > 0) {
    console.log("⚠️  WARNINGS:");
    warnings.forEach((w) => console.log(`   ⚠️  ${w}`));
    console.log("");
  }

  if (issues.length > 0) {
    console.log("🔴 ISSUES FOUND:");
    issues.forEach((i) => console.log(`   🔴 ${i}`));
    console.log("");
  }

  // Recommendations
  console.log("💡 RECOMMENDATIONS:");
  console.log("");

  if (issues.some((i) => i.includes("RESEND_API_KEY"))) {
    console.log("1. 🔴 CRITICAL: Add RESEND_API_KEY secret:");
    console.log(
      "   - Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/settings/functions",
    );
    console.log('   - Click "Secrets" tab');
    console.log("   - Add: RESEND_API_KEY = your_resend_api_key");
    console.log("   - Get key from: https://resend.com/api-keys");
    console.log("");
  }

  if (issues.some((i) => i.includes("email logs") || i.includes("no emails"))) {
    console.log("2. Check if emails are actually being triggered:");
    console.log("   - Check webhook logs in Supabase Dashboard");
    console.log("   - Verify booking flow completes successfully");
    console.log("   - Check browser console for errors");
    console.log("");
  }

  if (warnings.some((w) => w.includes("email_logs table"))) {
    console.log("3. Create email_logs table if missing:");
    console.log("   - Check migrations in supabase/migrations/");
    console.log("   - Or create manually in Supabase SQL Editor");
    console.log("");
  }

  console.log("4. Check Edge Function logs:");
  console.log(
    "   - Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/logs/edge-functions",
  );
  console.log('   - Filter for "send-email" function');
  console.log("   - Look for error messages or RESEND_API_KEY warnings");
  console.log("");

  console.log("5. Test with Resend Dashboard:");
  console.log("   - Visit: https://resend.com/emails");
  console.log("   - Check if any emails appear there");
  console.log("   - If yes: Emails are being sent but may be going to spam");
  console.log("   - If no: Emails are not reaching Resend API");
  console.log("");

  if (issues.length === 0 && warnings.length === 0) {
    console.log("✅ No critical issues found! Emails should be working.");
    console.log("   If emails still not arriving, check:");
    console.log("   - Spam/junk folders");
    console.log("   - Email address is correct");
    console.log("   - Resend domain verification (if using custom domain)");
  }

  console.log("");
}

diagnoseEmailIssues().catch(console.error);
