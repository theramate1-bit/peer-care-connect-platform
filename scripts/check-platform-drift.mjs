#!/usr/bin/env node
/**
 * Compare web (@web src/) vs mobile shared modules for logic drift.
 *   npm run check:platform-drift
 *   DRIFT_STRICT=1 npm run check:platform-drift  # exit 1 on any mismatch
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.env.DRIFT_STRICT === "1";
const ci = process.env.CI === "1";

/** [webPath, mobilePath, label] */
const PAIRS = [
  ["src/lib/booking-flow-type.ts", "theramate-ios-client/lib/booking-flow-type.ts", "booking-flow-type"],
  ["src/lib/platformSubscriptionCheckout.ts", "theramate-ios-client/lib/api/platformSubscriptionCheckout.ts", "platformSubscriptionCheckout"],
  ["src/lib/guestBooking.ts", "theramate-ios-client/lib/api/guestBooking.ts", "guestBooking"],
];

const HOSTED_PATHS_FILES = [
  "src/lib/hostedCheckoutPaths.ts",
  "theramate-ios-client/lib/hostedCheckoutPaths.ts",
  "supabase/functions/_shared/hosted-checkout-paths.ts",
];

const RPC_PAIRS = [
  ["src/lib/practitionerExchange.ts", "theramate-ios-client/lib/api/practitionerExchange.ts", "practitionerExchange RPCs"],
];

const CANONICAL_CHECKOUT_PATHS = [
  "/mobile-booking/success",
  "/booking-success",
  "/subscription-success",
  "/onboarding/stripe-return",
  "/stripe-return",
];

function normalize(source) {
  return source
    .replace(/from\s+["'][^"']+["']/g, 'from "CANONICAL"')
    .replace(/\/\*\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}

function hash(filePath) {
  const rel = path.relative(root, filePath);
  if (!fs.existsSync(filePath)) {
    return { rel, missing: true };
  }
  const body = normalize(fs.readFileSync(filePath, "utf8"));
  return {
    rel,
    missing: false,
    digest: crypto.createHash("sha256").update(body).digest("hex").slice(0, 16),
  };
}

function extractHostedPathsBlock(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const text = fs.readFileSync(filePath, "utf8");
  const m = text.match(
    /HOSTED_CHECKOUT_PATHS\s*=\s*\{([\s\S]*?)\}\s*(?:as const)?;?/,
  );
  return m ? normalize(m[1]) : null;
}

function extractRpcNames(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, "utf8");
  const names = new Set();
  const re = /\.rpc\(\s*["']([a-z0-9_]+)["']/g;
  let m;
  while ((m = re.exec(text))) names.add(m[1]);
  return [...names].sort();
}

const CONNECT_HOSTED_INVOKE_FILES = [
  "src/lib/stripeConnectHosted.ts",
  "theramate-ios-client/lib/api/stripeConnect.ts",
];

const CONNECT_HOSTED_RETURN_FILES = [
  ...CONNECT_HOSTED_INVOKE_FILES,
  "theramate-ios-client/lib/openConnectHostedOnboarding.ts",
];

function checkConnectHostedOnboardingParity() {
  const action = "create-connect-hosted-onboarding-link";
  for (const rel of CONNECT_HOSTED_INVOKE_FILES) {
    const filePath = path.join(root, rel);
    if (!fs.existsSync(filePath)) {
      console.error(`✗ connect hosted: missing ${rel}`);
      return false;
    }
    const text = fs.readFileSync(filePath, "utf8");
    if (!text.includes(action)) {
      console.error(`✗ connect hosted: ${rel} must invoke ${action}`);
      return false;
    }
  }
  for (const rel of CONNECT_HOSTED_RETURN_FILES) {
    const filePath = path.join(root, rel);
    const text = fs.readFileSync(filePath, "utf8");
    if (!text.includes("HOSTED_CHECKOUT_PATHS")) {
      console.error(`✗ connect hosted: ${rel} must use HOSTED_CHECKOUT_PATHS`);
      return false;
    }
    if (text.includes('"/onboarding/stripe-return"')) {
      console.error(
        `✗ connect hosted: ${rel} hardcodes return path — use HOSTED_CHECKOUT_PATHS.connectStripeReturn`,
      );
      return false;
    }
  }
  console.log("✓ connect hosted onboarding (web + mobile)");
  return true;
}

function checkStripePaymentUsesSharedPaths() {
  const stripePath = path.join(root, "supabase/functions/stripe-payment/index.ts");
  if (!fs.existsSync(stripePath)) {
    console.error("✗ stripe-payment: file missing");
    return false;
  }
  const text = fs.readFileSync(stripePath, "utf8");
  if (!text.includes("hosted-checkout-paths.ts")) {
    console.error("✗ stripe-payment must import hosted-checkout-paths.ts");
    return false;
  }
  for (const p of CANONICAL_CHECKOUT_PATHS) {
    if (text.includes(`"${p}"`) || text.includes(`'${p}'`)) {
      console.error(`✗ stripe-payment hardcodes path ${p} — use HOSTED_CHECKOUT_PATHS`);
      return false;
    }
  }
  console.log("✓ stripe-payment uses shared checkout paths");
  return true;
}

console.log("Platform drift check (web src/ vs theramate-ios-client + edge)\n");

let failed = 0;

for (const [webRel, mobRel, label] of PAIRS) {
  const web = hash(path.join(root, webRel));
  const mob = hash(path.join(root, mobRel));
  if (web.missing || mob.missing) {
    console.error(`✗ ${label}: missing file (${web.missing ? webRel : mobRel})`);
    failed++;
    continue;
  }
  if (web.digest === mob.digest) {
    console.log(`✓ ${label}`);
  } else {
    console.error(`✗ ${label} — logic drift (${webRel} ${web.digest} vs ${mobRel} ${mob.digest})`);
    failed++;
  }
}

const pathBlocks = HOSTED_PATHS_FILES.map((rel) => ({
  rel,
  block: extractHostedPathsBlock(path.join(root, rel)),
}));
if (pathBlocks.some((p) => p.block == null)) {
  console.error("✗ hostedCheckoutPaths: missing block in one or more files");
  failed++;
} else {
  const digests = new Set(pathBlocks.map((p) =>
    crypto.createHash("sha256").update(p.block).digest("hex").slice(0, 16),
  ));
  if (digests.size === 1) {
    console.log("✓ hostedCheckoutPaths (web + mobile + edge)");
  } else {
    console.error("✗ hostedCheckoutPaths — web/mobile/edge path constants differ");
    pathBlocks.forEach((p) => console.error(`    ${p.rel}`));
    failed++;
  }
}

if (!checkStripePaymentUsesSharedPaths()) failed++;
if (!checkConnectHostedOnboardingParity()) failed++;

for (const [webRel, mobRel, label] of RPC_PAIRS) {
  const webRpc = new Set(extractRpcNames(path.join(root, webRel)));
  const mobRpc = new Set(extractRpcNames(path.join(root, mobRel)));
  const onlyWeb = [...webRpc].filter((n) => !mobRpc.has(n));
  const onlyMob = [...mobRpc].filter((n) => !webRpc.has(n));
  if (onlyWeb.length || onlyMob.length) {
    console.error(`✗ ${label} RPC set mismatch`);
    if (onlyWeb.length) console.error(`    web only: ${onlyWeb.join(", ")}`);
    if (onlyMob.length) console.error(`    mobile only: ${onlyMob.join(", ")}`);
    failed++;
  } else {
    console.log(`✓ ${label} (${webRpc.size} RPCs)`);
  }
}

console.log("");
if (failed) {
  console.error(`${failed} drift(s). Sync pairs per docs/product/APP_WEB_MOBILE_DRIFT_AUDIT.md`);
  process.exit(strict || ci ? 1 : 0);
}
console.log("No drift in checked shared modules.");
process.exit(0);
