#!/usr/bin/env node
/**
 * Pre-flight + optional Supabase metrics for production payment smoke.
 *   npm run test:payment-smoke:check
 *   PAYMENT_SMOKE_STRICT=1 npm run test:payment-smoke:check
 *   PAYMENT_SMOKE_WRITE_REPORT=1 npm run test:payment-smoke:check  # writes docs/testing/reports/
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });

const strict = process.env.PAYMENT_SMOKE_STRICT === "1";
const writeReport = process.env.PAYMENT_SMOKE_WRITE_REPORT === "1";
const warnings = [];
const errors = [];
const lines = [];

function log(line) {
  lines.push(line);
  console.log(line);
}

const webUrl =
  process.env.EXPO_PUBLIC_WEB_URL?.trim() ||
  process.env.APP_URL?.trim() ||
  "https://theramate.co.uk";

const supabaseUrl =
  process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

log("Production payment smoke — pre-flight\n");
log(`  Web / APP_URL target: ${webUrl}`);
log("  Manual script: docs/testing/WAVE1_PROD_PAYMENT_SMOKE.md");
log("  Sign-off: docs/testing/WAVE1_QA_RELEASE_SIGNOFF.md (W1-5)\n");

const stripePk =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
  process.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();
if (!stripePk) {
  warnings.push("No EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY / VITE_STRIPE_PUBLISHABLE_KEY in .env");
} else if (!stripePk.startsWith("pk_live_")) {
  warnings.push("Stripe publishable key is not pk_live_* — use live key for prod smoke");
} else {
  log("  Stripe publishable: pk_live_* present in env");
}

if (!serviceKey) {
  warnings.push("SUPABASE_SERVICE_ROLE_KEY unset — skipping payments table probe");
} else if (!supabaseUrl) {
  warnings.push("SUPABASE_URL unset — skipping payments table probe");
} else {
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { count, error } = await supabase
    .from("payments")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since);

  if (error) {
    warnings.push(`payments probe failed: ${error.message}`);
  } else {
    log(`  payments (last 7d): ${count ?? 0}`);
    if ((count ?? 0) === 0) {
      warnings.push(
        "Zero payments in last 7 days — prod device smoke still required before store submit",
      );
    }
  }

  const { count: checkoutCount, error: csErr } = await supabase
    .from("checkout_sessions")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since);

  if (!csErr) {
    log(`  checkout_sessions (last 7d): ${checkoutCount ?? 0}`);
  }
}

if (warnings.length) {
  log("\nWarnings:");
  warnings.forEach((w) => log(`  ⚠ ${w}`));
}
if (errors.length) {
  log("\nErrors:");
  errors.forEach((e) => log(`  ✗ ${e}`));
}

if (writeReport) {
  const dir = path.join(root, "docs/testing/reports");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const out = path.join(dir, `payment-smoke-preflight-${stamp}.md`);
  fs.writeFileSync(
    out,
    `# Payment smoke pre-flight — ${new Date().toISOString()}\n\n\`\`\`\n${lines.join("\n")}\n\`\`\`\n\nManual steps: [WAVE1_PROD_PAYMENT_SMOKE.md](./WAVE1_PROD_PAYMENT_SMOKE.md)\n`,
  );
  log(`\nReport written: ${path.relative(root, out)}`);
}

const failed = errors.length > 0 || (strict && warnings.length > 0);
if (failed) {
  log("\nFix items above before device prod payment smoke.");
  process.exit(1);
}
log("\nPre-flight complete — run device smoke per WAVE1_PROD_PAYMENT_SMOKE.md");
process.exit(0);
