#!/usr/bin/env node
/**
 * Treatment exchange — staging E2E (two practitioners via Supabase RPC).
 *
 * Covers:
 *  1. Happy path: send → accept → reciprocal book → credits_deducted
 *  2. Reschedule cap: two declines then third decline fails (RESCHEDULE_CAP_EXCEEDED)
 *
 * Required env (.env at repo root):
 *   SUPABASE_URL (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   EXCHANGE_REQUESTER_EMAIL / EXCHANGE_REQUESTER_PASSWORD
 *   EXCHANGE_RECIPIENT_EMAIL / EXCHANGE_RECIPIENT_PASSWORD
 *
 * Optional:
 *   EXCHANGE_E2E_DRY_RUN=1     — validate env + pair eligibility only
 *   EXCHANGE_E2E_CLEANUP=1     — delete test requests/sessions after run (default on)
 *
 * Usage:
 *   node test-scripts/treatment-exchange-staging-e2e.js
 *   npm run test:exchange:e2e
 */

const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://aikqnvltuwwgifuocvto.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const REQUESTER_EMAIL = process.env.EXCHANGE_REQUESTER_EMAIL;
const REQUESTER_PASSWORD = process.env.EXCHANGE_REQUESTER_PASSWORD;
const RECIPIENT_EMAIL = process.env.EXCHANGE_RECIPIENT_EMAIL;
const RECIPIENT_PASSWORD = process.env.EXCHANGE_RECIPIENT_PASSWORD;

const DRY_RUN = process.env.EXCHANGE_E2E_DRY_RUN === "1";
const CLEANUP = process.env.EXCHANGE_E2E_CLEANUP !== "0";

const results = { passed: 0, failed: 0, skipped: 0 };
const cleanupIds = {
  requestIds: [],
  sessionIds: [],
  mutualIds: [],
};

function log(msg, level = "info") {
  const colors = {
    info: "\x1b[36m",
    ok: "\x1b[32m",
    warn: "\x1b[33m",
    err: "\x1b[31m",
    reset: "\x1b[0m",
  };
  const c = colors[level] || colors.info;
  console.log(`${c}${msg}${colors.reset}`);
}

function assert(condition, message) {
  if (condition) {
    results.passed++;
    log(`PASS: ${message}`, "ok");
    return;
  }
  results.failed++;
  log(`FAIL: ${message}`, "err");
  throw new Error(message);
}

function skip(message) {
  results.skipped++;
  log(`SKIP: ${message}`, "warn");
}

async function signIn(email, password) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return client;
}

function ratingTier(avg) {
  const r = avg ?? 0;
  if (r >= 4) return 2;
  if (r >= 2) return 1;
  return 0;
}

async function ensurePairEligible(admin, requesterId, recipientId) {
  const { data: users, error } = await admin
    .from("users")
    .select(
      "id, email, treatment_exchange_opt_in, onboarding_status, is_active, user_role",
    )
    .in("id", [requesterId, recipientId]);
  if (error) throw error;

  const req = users.find((u) => u.id === requesterId);
  const rec = users.find((u) => u.id === recipientId);
  assert(
    req?.treatment_exchange_opt_in === true,
    "requester opted in to exchange",
  );
  assert(
    rec?.treatment_exchange_opt_in === true,
    "recipient opted in to exchange",
  );
  assert(
    req?.onboarding_status === "completed",
    "requester onboarding completed",
  );
  assert(
    rec?.onboarding_status === "completed",
    "recipient onboarding completed",
  );
  assert(rec?.is_active === true, "recipient is active");

  const { data: profiles } = await admin
    .from("therapist_profiles")
    .select("user_id, average_rating")
    .in("user_id", [requesterId, recipientId]);

  const reqTier = ratingTier(
    profiles?.find((p) => p.user_id === requesterId)?.average_rating,
  );
  const recTier = ratingTier(
    profiles?.find((p) => p.user_id === recipientId)?.average_rating,
  );
  assert(
    reqTier === recTier,
    `same rating tier (req=${reqTier}, rec=${recTier})`,
  );

  const { data: credits } = await admin
    .from("credits")
    .select("user_id, current_balance, balance")
    .eq("user_id", requesterId)
    .maybeSingle();

  const balance = credits?.current_balance ?? credits?.balance ?? 0;
  assert(balance >= 60, `requester has >= 60 credits (has ${balance})`);
}

function futureDate(offsetDays) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function runHappyPath(
  requesterClient,
  recipientClient,
  requesterId,
  recipientId,
) {
  log("\n--- Happy path: send → accept → reciprocal → credits ---", "info");

  const sessionDate = futureDate(90);
  const startTime = "10:00:00";
  const duration = 60;

  const { data: reqId, error: sendErr } = await requesterClient.rpc(
    "create_treatment_exchange_request",
    {
      p_recipient_id: recipientId,
      p_session_date: sessionDate,
      p_start_time: startTime,
      p_duration_minutes: duration,
      p_session_type: "E2E exchange",
      p_requester_notes: "staging e2e happy path",
    },
  );
  if (sendErr) throw sendErr;
  assert(
    typeof reqId === "string",
    "create_treatment_exchange_request returns id",
  );
  cleanupIds.requestIds.push(reqId);
  log(`  request id: ${reqId}`);

  const { data: mesId, error: acceptErr } = await recipientClient.rpc(
    "accept_exchange_request",
    {
      p_request_id: reqId,
      p_recipient_id: recipientId,
    },
  );
  if (acceptErr) throw acceptErr;
  assert(
    typeof mesId === "string",
    "accept_exchange_request returns mutual session id",
  );
  cleanupIds.mutualIds.push(mesId);

  const { data: slots, error: slotsErr } = await recipientClient.rpc(
    "get_exchange_reciprocal_available_slots",
    {
      p_request_id: reqId,
      p_recipient_id: recipientId,
      p_from_date: sessionDate,
      p_day_count: 14,
    },
  );
  if (slotsErr) throw slotsErr;
  assert(
    Array.isArray(slots) && slots.length > 0,
    "reciprocal slots available",
  );

  const pick = slots[0];
  const reciprocalDate =
    typeof pick.session_date === "string"
      ? pick.session_date.slice(0, 10)
      : sessionDate;
  const reciprocalTime =
    typeof pick.start_time === "string"
      ? pick.start_time.slice(0, 8)
      : "14:00:00";

  const { data: leg2Id, error: bookErr } = await recipientClient.rpc(
    "book_exchange_reciprocal_session",
    {
      p_request_id: reqId,
      p_recipient_id: recipientId,
      p_session_date: reciprocalDate,
      p_start_time: reciprocalTime,
      p_duration_minutes: duration,
    },
  );
  if (bookErr) throw bookErr;
  assert(
    typeof leg2Id === "string",
    "book_exchange_reciprocal_session returns session id",
  );
  cleanupIds.sessionIds.push(leg2Id);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: mes } = await admin
    .from("mutual_exchange_sessions")
    .select(
      "id, credits_deducted, practitioner_a_session_id, practitioner_b_session_id, practitioner_b_booked",
    )
    .eq("exchange_request_id", reqId)
    .single();

  assert(
    mes?.practitioner_b_booked === true,
    "mutual session practitioner_b_booked",
  );
  assert(mes?.credits_deducted === true, "mutual session credits_deducted");
  assert(mes?.practitioner_a_session_id != null, "leg-1 session linked");
  assert(mes?.practitioner_b_session_id != null, "leg-2 session linked");

  if (mes.practitioner_a_session_id)
    cleanupIds.sessionIds.push(mes.practitioner_a_session_id);

  const { data: txs } = await admin
    .from("credit_transactions")
    .select("id, session_id, transaction_type")
    .in("session_id", [
      mes.practitioner_a_session_id,
      mes.practitioner_b_session_id,
    ])
    .in("transaction_type", ["session_payment", "spend"]);

  assert(
    (txs?.length ?? 0) >= 2,
    "credit_transactions exist for both peer sessions",
  );
}

async function runRescheduleCap(
  requesterClient,
  recipientClient,
  requesterId,
  recipientId,
) {
  log("\n--- Reschedule cap: 2 declines, 3rd fails ---", "info");

  const baseDay = 120;
  for (let i = 0; i < 3; i++) {
    const sessionDate = futureDate(baseDay + i);
    const startTime = `${10 + i}:00:00`;

    const { data: reqId, error: sendErr } = await requesterClient.rpc(
      "create_treatment_exchange_request",
      {
        p_recipient_id: recipientId,
        p_session_date: sessionDate,
        p_start_time: startTime,
        p_duration_minutes: 30,
        p_requester_notes: `e2e reschedule cap attempt ${i + 1}`,
      },
    );
    if (sendErr) throw sendErr;
    cleanupIds.requestIds.push(reqId);

    const { error: declineErr } = await recipientClient.rpc(
      "decline_exchange_request",
      {
        p_request_id: reqId,
        p_recipient_id: recipientId,
        p_reason: `E2E reschedule ${i + 1}`,
      },
    );

    if (i < 2) {
      if (declineErr) throw declineErr;
      assert(true, `decline ${i + 1} succeeded`);
    } else {
      assert(
        declineErr != null &&
          String(declineErr.message).includes("RESCHEDULE_CAP_EXCEEDED"),
        `third decline blocked with RESCHEDULE_CAP_EXCEEDED (got: ${declineErr?.message ?? "no error"})`,
      );
    }
  }
}

async function cleanup(admin) {
  if (!CLEANUP) {
    skip("cleanup disabled (EXCHANGE_E2E_CLEANUP=0)");
    return;
  }
  log("\n--- Cleanup test data ---", "info");

  for (const sid of cleanupIds.sessionIds) {
    await admin.from("client_sessions").delete().eq("id", sid);
  }
  for (const mid of cleanupIds.mutualIds) {
    await admin.from("mutual_exchange_sessions").delete().eq("id", mid);
  }
  for (const rid of cleanupIds.requestIds) {
    await admin.from("slot_holds").delete().eq("request_id", rid);
    await admin.from("treatment_exchange_requests").delete().eq("id", rid);
  }
  log("Cleanup complete", "ok");
}

async function main() {
  log("Treatment exchange staging E2E", "info");
  log(`URL: ${SUPABASE_URL}`);

  const credsStrict =
    process.env.RELEASE_GATES_STRICT === "1" ||
    process.env.EXCHANGE_E2E_STRICT === "1";

  if (!SUPABASE_ANON_KEY || !SERVICE_KEY) {
    const msg =
      "Skipped: set SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in .env for exchange E2E (see .env.example).";
    if (credsStrict) {
      log("Missing SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY", "err");
      process.exit(1);
    }
    log(msg, "warn");
    process.exit(0);
  }
  if (
    !REQUESTER_EMAIL ||
    !REQUESTER_PASSWORD ||
    !RECIPIENT_EMAIL ||
    !RECIPIENT_PASSWORD
  ) {
    log(
      "Skipped: set EXCHANGE_REQUESTER_EMAIL, EXCHANGE_REQUESTER_PASSWORD, EXCHANGE_RECIPIENT_EMAIL, EXCHANGE_RECIPIENT_PASSWORD in .env (see .env.example).",
      "warn",
    );
    process.exit(0);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const requesterClient = await signIn(REQUESTER_EMAIL, REQUESTER_PASSWORD);
  const recipientClient = await signIn(RECIPIENT_EMAIL, RECIPIENT_PASSWORD);
  const requesterId = (await requesterClient.auth.getUser()).data.user?.id;
  const recipientId = (await recipientClient.auth.getUser()).data.user?.id;
  assert(requesterId && recipientId, "signed in both practitioners");
  assert(
    requesterId !== recipientId,
    "requester and recipient are different users",
  );

  await ensurePairEligible(admin, requesterId, recipientId);

  if (DRY_RUN) {
    skip("EXCHANGE_E2E_DRY_RUN=1 — skipping RPC writes");
    log(
      `\nDone: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped`,
      "info",
    );
    process.exit(0);
  }

  try {
    await runHappyPath(
      requesterClient,
      recipientClient,
      requesterId,
      recipientId,
    );
    await runRescheduleCap(
      requesterClient,
      recipientClient,
      requesterId,
      recipientId,
    );
  } finally {
    try {
      await cleanup(admin);
    } catch (e) {
      log(`Cleanup warning: ${e.message}`, "warn");
    }
  }

  log(
    `\nDone: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped`,
    results.failed > 0 ? "err" : "ok",
  );
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch((e) => {
  log(`Fatal: ${e.message}`, "err");
  process.exit(1);
});
