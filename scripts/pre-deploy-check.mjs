#!/usr/bin/env node
/**
 * Full pre-deploy / pre-release checklist (automated portions).
 *   npm run pre-deploy
 *   PRE_DEPLOY_STRICT=1 npm run pre-deploy  — fail on warnings (exchange creds, etc.)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });

const strict = process.env.PRE_DEPLOY_STRICT === "1";
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function run(label, args, extraEnv = {}) {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(npmCmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...extraEnv },
  });
  const ok = r.status === 0;
  console.log(ok ? `✓ ${label}` : `✗ ${label}`);
  return ok;
}

const steps = [
  ["Gitleaks config present", () => {
    const ok = fs.existsSync(path.join(root, ".gitleaks.toml"));
    if (!ok) console.error("Missing .gitleaks.toml");
    return ok;
  }],
  ["Legacy Supabase guard", () =>
    run("supabase:guard-legacy", ["run", "supabase:guard-legacy"], {
      GUARD_BASE_SHA: "HEAD~20",
      GUARD_HEAD_SHA: "HEAD",
    })],
  ["Platform drift (web vs mobile)", () =>
    run("check:platform-drift", ["run", "check:platform-drift"], {
      DRIFT_STRICT: "1",
      CI: "1",
    })],
  ["UI hierarchy (web nav routes)", () =>
    run("check:ui-hierarchy", ["run", "check:ui-hierarchy"], {
      UI_HIERARCHY_STRICT: "1",
      CI: "1",
    })],
  ["Route inventory (mobile ↔ web)", () =>
    run("check:route-inventory", ["run", "check:route-inventory"], {
      ROUTE_INVENTORY_STRICT: "1",
      CI: "1",
    })],
  ["Mobile chrome (shared headers)", () =>
    run("check:mobile-chrome", ["run", "check:mobile-chrome"], {
      MOBILE_CHROME_STRICT: "1",
      CI: "1",
    })],
  ["Deep-link routes (mobile)", () =>
    run("check:deep-link-routes", ["run", "check:deep-link-routes"], {
      DEEP_LINK_STRICT: "1",
      CI: "1",
    })],
  ["Universal Links (AASA local)", () =>
    run("check:universal-links", ["run", "check:universal-links"], {
      UNIVERSAL_LINKS_STRICT: "1",
      CI: "1",
    })],
  ["Migration reconcile (strict)", () =>
    run("supabase:migrations:reconcile", ["run", "supabase:migrations:reconcile"], {
      RECONCILE_STRICT: "1",
    })],
  ["Edge function manifest", () =>
    run("supabase:verify:functions", ["run", "supabase:verify:functions"])],
  ["Web lint", () => run("lint", ["run", "lint"])],
  ["Web typecheck", () =>
    spawnSync(npmCmd, ["exec", "-w", "peer-care-connect", "--", "tsc", "--noEmit"], {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32",
    }).status === 0],
  ["Web unit tests", () => run("test:web", ["run", "test:web"])],
  ["Backend tests", () => run("test:backend", ["run", "test:backend"])],
  ["Mobile typecheck", () => run("typecheck:mobile", ["run", "typecheck:mobile"])],
  ["Mobile unit tests", () => run("test:mobile", ["run", "test:mobile"])],
  ["Exchange dry-run", () => run("test:exchange:e2e:dry", ["run", "test:exchange:e2e:dry"])],
  ["Payment smoke preflight", () => run("test:payment-smoke:check", ["run", "test:payment-smoke:check"])],
  ["Web production build", () => run("build", ["run", "build"])],
];

const results = [];
for (const [label, fn] of steps) {
  results.push({ label, ok: fn() });
}

const failed = results.filter((r) => !r.ok);
console.log("\n--- Pre-deploy summary ---");
for (const r of results) {
  console.log(`${r.ok ? "✓" : "✗"} ${r.label}`);
}

if (failed.length) {
  console.log(`\n${failed.length} step(s) failed. See docs/operations/PRE_DEPLOY_RUNBOOK.md`);
  process.exit(1);
}

if (strict) {
  const exchangeReady =
    process.env.EXCHANGE_REQUESTER_EMAIL &&
    process.env.EXCHANGE_RECIPIENT_EMAIL;
  if (!exchangeReady) {
    console.error("\nPRE_DEPLOY_STRICT: EXCHANGE_* credentials missing");
    process.exit(1);
  }
}

console.log("\nAutomated pre-deploy checks passed.");
console.log("Manual: Maestro (npm run test:maestro:exchange), device payment smoke, supabase db push");
process.exit(0);
