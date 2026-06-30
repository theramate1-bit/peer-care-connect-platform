#!/usr/bin/env node
/**
 * Mobile navigation chrome guard: AppScreen/TabScreen routes must use shared headers.
 *   npm run check:mobile-chrome
 *   MOBILE_CHROME_STRICT=1 npm run check:mobile-chrome
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(root, "theramate-ios-client/app");
const strict = process.env.MOBILE_CHROME_STRICT === "1";
const ci = process.env.CI === "1";

const HEADER_MARKERS = [
  "AppStackHeader",
  "MainTabHeader",
  "AuthBackHeader",
  "LegalDocumentScreen",
];

const ROOT_MARKERS = ["AppScreen", "TabScreen"];

/** Screens that intentionally omit a shared header. */
const ALLOWLIST = new Set([
  "booking-success.tsx",
  "subscription-success.tsx",
  "mobile-booking/success.tsx",
  "onboarding/stripe-return.tsx",
  "oauth-callback.tsx",
  "+not-found.tsx",
  "(auth)/hero.tsx",
  "auth/callback.tsx",
  "(practitioner)/index.tsx",
  "(practitioner)/stripe-connect/embedded.tsx",
  "index.tsx",
  "(tabs)/profile/privacy-security.tsx",
  "(practitioner)/(ptabs)/profile/privacy-security.tsx",
]);

function walkScreens(dir, base = "") {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (fs.statSync(full).isDirectory()) {
      out.push(...walkScreens(full, rel));
      continue;
    }
    if (!name.endsWith(".tsx") || name === "_layout.tsx") continue;
    out.push(rel);
  }
  return out.sort();
}

function isReExport(text) {
  return /export\s*\{\s*default\s*\}\s*from/.test(text);
}

function isRedirectOnly(text) {
  const hasRedirect = text.includes("<Redirect") || text.includes("Redirect href");
  const hasUi =
    text.includes("<View") ||
    text.includes("<ScrollView") ||
    text.includes("<TabScreen") ||
    text.includes("<AppScreen");
  return hasRedirect && !hasUi;
}

function hasHandRolledTitle(text) {
  return /text-2xl font-bold/.test(text) && !HEADER_MARKERS.some((m) => text.includes(m));
}

function main() {
  const issues = [];
  const screens = walkScreens(appDir);

  for (const rel of screens) {
    if (ALLOWLIST.has(rel)) continue;
    const text = fs.readFileSync(path.join(appDir, rel), "utf8");
    if (isReExport(text) || isRedirectOnly(text)) continue;

    const usesRoot = ROOT_MARKERS.some((m) => text.includes(m));
    if (!usesRoot) continue;

    const hasHeader = HEADER_MARKERS.some((m) => text.includes(m));
    if (!hasHeader) {
      issues.push({ rel, kind: "missing-header" });
      continue;
    }
    if (hasHandRolledTitle(text)) {
      issues.push({ rel, kind: "duplicate-title" });
    }
  }

  console.log("Mobile chrome check (theramate-ios-client/app)");
  console.log(`  Screens scanned: ${screens.length}`);
  console.log(`  Allowlisted: ${ALLOWLIST.size}`);

  if (issues.length === 0) {
    console.log("  ✓ All AppScreen/TabScreen routes use shared headers");
    return;
  }

  for (const { rel, kind } of issues) {
    const label =
      kind === "duplicate-title"
        ? "duplicate page title (use AppStackHeader)"
        : "missing AppStackHeader / MainTabHeader / AuthBackHeader";
    console.log(`  ✗ ${rel} — ${label}`);
  }

  if (strict || ci) process.exit(1);
  console.log("\n  Run with MOBILE_CHROME_STRICT=1 to fail.");
}

main();
