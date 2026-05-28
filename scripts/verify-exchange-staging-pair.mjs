#!/usr/bin/env node
/**
 * Verify two practitioner accounts are eligible for treatment exchange E2E.
 * Does not create requests. Usage: npm run verify:exchange:staging
 */

import { createClient } from "@supabase/supabase-js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://aikqnvltuwwgifuocvto.supabase.co";
const ANON =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const emails = {
  requester: process.env.EXCHANGE_REQUESTER_EMAIL,
  recipient: process.env.EXCHANGE_RECIPIENT_EMAIL,
};
const passwords = {
  requester: process.env.EXCHANGE_REQUESTER_PASSWORD,
  recipient: process.env.EXCHANGE_RECIPIENT_PASSWORD,
};

function tier(avg) {
  const r = avg ?? 0;
  if (r >= 4) return 2;
  if (r >= 2) return 1;
  return 0;
}

async function main() {
  console.log("Exchange staging pair verification\n");

  const missing = [];
  if (!emails.requester) missing.push("EXCHANGE_REQUESTER_EMAIL");
  if (!passwords.requester) missing.push("EXCHANGE_REQUESTER_PASSWORD");
  if (!emails.recipient) missing.push("EXCHANGE_RECIPIENT_EMAIL");
  if (!passwords.recipient) missing.push("EXCHANGE_RECIPIENT_PASSWORD");
  if (!ANON) missing.push("SUPABASE_ANON_KEY");

  if (missing.length) {
    console.error("Missing:", missing.join(", "));
    console.error("Copy from .env.example and fill practitioner staging accounts.");
    process.exit(1);
  }

  const signIn = async (email, password) => {
    const c = createClient(SUPABASE_URL, ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await c.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`${email}: ${error.message}`);
    return data.user.id;
  };

  const requesterId = await signIn(emails.requester, passwords.requester);
  const recipientId = await signIn(emails.recipient, passwords.recipient);

  const admin = createClient(
    SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || ANON,
  );

  const { data: users, error: uErr } = await admin
    .from("users")
    .select(
      "id, email, treatment_exchange_opt_in, onboarding_status, is_active, user_role",
    )
    .in("id", [requesterId, recipientId]);
  if (uErr) throw uErr;

  const req = users.find((u) => u.id === requesterId);
  const rec = users.find((u) => u.id === recipientId);

  const checks = [
    ["different users", requesterId !== recipientId],
    ["requester opted in", req?.treatment_exchange_opt_in === true],
    ["recipient opted in", rec?.treatment_exchange_opt_in === true],
    ["requester onboarding done", req?.onboarding_status === "completed"],
    ["recipient active", rec?.is_active === true],
  ];

  const { data: profiles } = await admin
    .from("therapist_profiles")
    .select("user_id, average_rating")
    .in("user_id", [requesterId, recipientId]);

  const reqTier = tier(
    profiles?.find((p) => p.user_id === requesterId)?.average_rating,
  );
  const recTier = tier(
    profiles?.find((p) => p.user_id === recipientId)?.average_rating,
  );
  checks.push(["same rating tier", reqTier === recTier]);

  const { data: credits } = await admin
    .from("credits")
    .select("current_balance, balance")
    .eq("user_id", requesterId)
    .maybeSingle();
  const balance = credits?.current_balance ?? credits?.balance ?? 0;
  checks.push(["requester credits >= 60", balance >= 60]);

  let failed = 0;
  for (const [label, ok] of checks) {
    console.log(`${ok ? "✓" : "✗"} ${label}`);
    if (!ok) failed++;
  }

  console.log(`\nRequester: ${emails.requester} (${requesterId})`);
  console.log(`Recipient: ${emails.recipient} (${recipientId})`);
  console.log(`Credits (requester): ${balance}`);

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed — fix accounts before E2E/Maestro.`);
    process.exit(1);
  }
  console.log("\nPair is eligible. Run: npm run test:exchange:e2e");
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
