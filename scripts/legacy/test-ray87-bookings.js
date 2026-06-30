// Test script to check ray87 bookings and email status
// This uses direct SQL queries that can be run in Supabase Dashboard

console.log("=".repeat(70));
console.log("RAY87 BOOKING & EMAIL TEST RESULTS");
console.log("=".repeat(70));
console.log("");

console.log("📋 SQL QUERIES TO RUN IN SUPABASE DASHBOARD:");
console.log("");
console.log("1️⃣ Find ray87 user:");
console.log("─".repeat(70));
console.log(`
SELECT id, email, username, first_name, last_name
FROM users 
WHERE email ILIKE '%ray87%' OR username ILIKE '%ray87%'
LIMIT 5;
`);
console.log("");

console.log("2️⃣ Find ray87 bookings:");
console.log("─".repeat(70));
console.log(`
SELECT 
  cs.id,
  cs.client_email,
  cs.status,
  cs.payment_status,
  cs.created_at,
  cs.session_date,
  cs.start_time,
  u.email as user_email,
  u.username
FROM client_sessions cs
LEFT JOIN users u ON cs.client_id = u.id
WHERE cs.client_email ILIKE '%ray87%' 
   OR u.email ILIKE '%ray87%'
   OR u.username ILIKE '%ray87%'
ORDER BY cs.created_at DESC
LIMIT 10;
`);
console.log("");

console.log("3️⃣ Check payments for ray87 bookings:");
console.log("─".repeat(70));
console.log(`
SELECT 
  p.id,
  p.checkout_session_id,
  p.payment_status,
  p.created_at,
  p.metadata->>'session_id' as session_id,
  cs.id as client_session_id,
  cs.client_email,
  cs.status as session_status
FROM payments p
LEFT JOIN client_sessions cs ON p.metadata->>'session_id' = cs.id::text
WHERE p.metadata->>'session_id' IN (
  SELECT id::text FROM client_sessions 
  WHERE client_email ILIKE '%ray87%'
     OR client_id IN (
       SELECT id FROM users 
       WHERE email ILIKE '%ray87%' OR username ILIKE '%ray87%'
     )
)
ORDER BY p.created_at DESC
LIMIT 10;
`);
console.log("");

console.log("4️⃣ Check email logs (if table exists):");
console.log("─".repeat(70));
console.log(`
SELECT 
  email_type,
  recipient_email,
  status,
  resend_email_id,
  error_message,
  created_at,
  sent_at
FROM email_logs
WHERE recipient_email ILIKE '%ray87%'
ORDER BY created_at DESC
LIMIT 20;
`);
console.log("");

console.log("5️⃣ Check webhook logs for recent activity:");
console.log("─".repeat(70));
console.log(
  "Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/logs/edge-functions",
);
console.log("Filter: stripe-webhook");
console.log("Look for:");
console.log("  ✅ [SUCCESS] messages with email IDs");
console.log("  ❌ [CRITICAL] error messages");
console.log('  📅 "Confirming client session after payment"');
console.log("");

console.log("=".repeat(70));
console.log("📊 VERIFICATION CHECKLIST");
console.log("=".repeat(70));
console.log("");
console.log(
  "✅ Webhook function has [CRITICAL]/[SUCCESS] logging: YES (verified in code)",
);
console.log("⏳ Need to verify:");
console.log("  [ ] ray87 user exists");
console.log("  [ ] ray87 has bookings");
console.log("  [ ] Payments have session_id in metadata");
console.log("  [ ] Email logs show sent emails");
console.log("  [ ] Webhook logs show [SUCCESS] messages");
console.log("");

console.log("🔗 QUICK LINKS:");
console.log(
  "  • Supabase Dashboard: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto",
);
console.log(
  "  • SQL Editor: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/sql/new",
);
console.log(
  "  • Edge Function Logs: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/logs/edge-functions",
);
console.log("  • Resend Dashboard: https://resend.com/emails");
console.log("");
