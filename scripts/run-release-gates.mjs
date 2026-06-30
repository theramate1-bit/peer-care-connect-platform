#!/usr/bin/env node
/**
 * Release readiness gates — run from repo root:
 *   npm run test:readiness
 *
 * Optional:
 *   RELEASE_GATES_STRICT=1  — fail if exchange E2E creds missing (default: warn only)
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(root, ".env") });

const strict = process.env.RELEASE_GATES_STRICT === "1";
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function run(label, args, opts = {}) {
  console.log(`\n▶ ${label}`);
  const { env: extraEnv, ...rest } = opts;
  const r = spawnSync(npmCmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...extraEnv },
    ...rest,
  });
  const ok = r.status === 0;
  console.log(ok ? `✓ ${label}` : `✗ ${label} (exit ${r.status})`);
  return ok;
}

function checkEnv() {
  const warnings = [];
  const errors = [];

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    warnings.push("SUPABASE_SERVICE_ROLE_KEY missing — exchange dry-run will fail");
  }

  const exchangeReady =
    process.env.EXCHANGE_REQUESTER_EMAIL &&
    process.env.EXCHANGE_REQUESTER_PASSWORD &&
    process.env.EXCHANGE_RECIPIENT_EMAIL &&
    process.env.EXCHANGE_RECIPIENT_PASSWORD;

  if (!exchangeReady) {
    const msg =
      "EXCHANGE_* credentials missing — full exchange E2E skipped (see .env.example)";
    if (strict) errors.push(msg);
    else warnings.push(msg);
  }

  const webUrl =
    process.env.EXPO_PUBLIC_WEB_URL || "https://theramate.co.uk (mobile default)";
  console.log(`\nℹ EXPO_PUBLIC_WEB_URL (mobile): ${webUrl}`);
  console.log("ℹ Supabase APP_URL must match Stripe return URLs for checkout");

  for (const w of warnings) console.warn(`⚠ ${w}`);
  for (const e of errors) console.error(`✗ ${e}`);
  return errors.length === 0;
}

const results = [];

if (!checkEnv() && strict) {
  process.exit(1);
}

results.push(
  run("check:platform-drift", ["run", "check:platform-drift"], {
    env: { DRIFT_STRICT: "1", CI: "1" },
  }),
);
results.push(
  run("check:ui-hierarchy", ["run", "check:ui-hierarchy"], {
    env: { UI_HIERARCHY_STRICT: "1", CI: "1" },
  }),
);
results.push(
  run("check:route-inventory", ["run", "check:route-inventory"], {
    env: { ROUTE_INVENTORY_STRICT: "1", CI: "1" },
  }),
);
results.push(
  run("check:mobile-chrome", ["run", "check:mobile-chrome"], {
    env: { MOBILE_CHROME_STRICT: "1", CI: "1" },
  }),
);
results.push(
  run("check:deep-link-routes", ["run", "check:deep-link-routes"], {
    env: { DEEP_LINK_STRICT: "1", CI: "1" },
  }),
);
results.push(
  run("check:universal-links", ["run", "check:universal-links"], {
    env: { UNIVERSAL_LINKS_STRICT: "1", CI: "1" },
  }),
);
results.push(run("typecheck:mobile", ["run", "typecheck:mobile"]));
results.push(run("test:mobile", ["run", "test:mobile"]));
results.push(run("test:exchange:e2e:dry", ["run", "test:exchange:e2e:dry"]));
results.push(run("test:payment-smoke:check", ["run", "test:payment-smoke:check"]));
results.push(run("supabase:migrations:compare", ["run", "supabase:migrations:compare"]));
results.push(
  run("supabase:migrations:reconcile", ["run", "supabase:migrations:reconcile"], {
    env: { RECONCILE_STRICT: "1" },
  }),
);
results.push(run("supabase:verify:functions", ["run", "supabase:verify:functions"]));

const failed = results.filter((x) => !x).length;
console.log(
  `\n${failed === 0 ? "All automated release gates passed." : `${failed} gate(s) failed.`}`,
);
process.exit(failed > 0 ? 1 : 0);
