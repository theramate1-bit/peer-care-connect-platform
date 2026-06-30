// Check why emails aren't being sent from webhook
// This script checks if the conditions for email sending are met

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://aikqnvltuwwgifuocvto.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkWebhookEmailTriggers() {
  console.log("🔍 CHECKING WEBHOOK EMAIL TRIGGERS");
  console.log("=".repeat(70));
  console.log("");

  // Get confirmed sessions that don't have emails
  const { data: sessions, error } = await supabase
    .from("client_sessions")
    .select(
      `
      id,
      client_email,
      status,
      payment_status,
      created_at,
      client_id,
      therapist_id,
      client:users!client_sessions_client_id_fkey(id, first_name, last_name, email),
      practitioner:users!client_sessions_therapist_id_fkey(id, first_name, last_name, email)
    `,
    )
    .eq("status", "confirmed")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.log("❌ Error fetching sessions:", error.message);
    return;
  }

  if (!sessions || sessions.length === 0) {
    console.log("ℹ️  No confirmed sessions found");
    return;
  }

  console.log(`Found ${sessions.length} confirmed sessions to check:\n`);

  for (const session of sessions) {
    console.log(`📅 Session: ${session.id}`);
    console.log(`   Status: ${session.status}`);
    console.log(`   Payment Status: ${session.payment_status}`);
    console.log(`   Created: ${new Date(session.created_at).toLocaleString()}`);
    console.log("");

    // Check if emails were sent
    const { data: emails } = await supabase
      .from("email_logs")
      .select("email_type, status, created_at")
      .or(
        `metadata->>'sessionId'.eq.${session.id},metadata->>'sessionId'.eq.'${session.id}'`,
      )
      .order("created_at", { ascending: false });

    if (emails && emails.length > 0) {
      console.log(`   ✅ ${emails.length} emails found for this session:`);
      emails.forEach((e) => {
        console.log(`      - ${e.email_type}: ${e.status}`);
      });
    } else {
      console.log(`   ❌ NO EMAILS FOUND for this session`);
    }
    console.log("");

    // Check conditions for email sending
    console.log("   🔍 Checking email sending conditions:");

    // Condition 1: Client email
    const clientEmail = session.client?.email || session.client_email;
    if (clientEmail) {
      console.log(`   ✅ Client email: ${clientEmail}`);
    } else {
      console.log(`   ❌ MISSING: Client email`);
    }

    // Condition 2: Practitioner email
    const practitionerEmail = session.practitioner?.email;
    if (practitionerEmail) {
      console.log(`   ✅ Practitioner email: ${practitionerEmail}`);
    } else {
      console.log(`   ❌ MISSING: Practitioner email`);
    }

    // Condition 3: Check payments table for checkout_session_id
    const { data: payments } = await supabase
      .from("payments")
      .select("checkout_session_id, payment_status, created_at")
      .eq("session_id", session.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (payments && payments.length > 0) {
      const payment = payments[0];
      console.log(`   ✅ Payment found: ${payment.checkout_session_id}`);
      console.log(`      Payment status: ${payment.payment_status}`);

      // Check if this checkout session would have session_id in metadata
      // (We can't check Stripe directly, but we can infer)
      console.log(
        `   ℹ️  Webhook would need session_id=${session.id} in metadata`,
      );
    } else {
      console.log(`   ⚠️  No payment record found for this session`);
    }

    console.log("");
    console.log("   Possible reasons emails were not sent:");
    console.log("      1. Webhook not called by Stripe");
    console.log("      2. session_id not in Stripe checkout metadata");
    console.log("      3. Webhook failed silently");
    console.log("      4. Email addresses missing");
    console.log("");
    console.log("=".repeat(70));
    console.log("");
  }

  // Summary
  console.log("📊 SUMMARY");
  console.log("=".repeat(70));
  console.log("");
  console.log("To fix email sending:");
  console.log("1. Check Stripe webhook configuration");
  console.log(
    "2. Verify session_id is in checkout metadata when creating sessions",
  );
  console.log("3. Check Supabase Edge Function logs for stripe-webhook");
  console.log("4. Ensure client_email and practitioner email are populated");
  console.log("");
}

checkWebhookEmailTriggers().catch(console.error);
