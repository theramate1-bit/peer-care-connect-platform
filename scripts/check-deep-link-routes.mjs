#!/usr/bin/env node
/**
 * Deep-link pathnames from deepLinking.ts must resolve to Expo app/ screen files.
 *   npm run check:deep-link-routes
 *   DEEP_LINK_STRICT=1 npm run check:deep-link-routes
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(root, "theramate-ios-client/app");
const strict = process.env.DEEP_LINK_STRICT === "1";
const ci = process.env.CI === "1";

/** Deep-link pathname → Expo file suffix (under app/). */
const DEEP_LINK_TARGETS = [
  ["/booking-success", "booking-success.tsx"],
  ["/mobile-booking/success", "mobile-booking/success.tsx"],
  ["/mobile-booking/pending", "mobile-booking/pending.tsx"],
  ["/review", "review.tsx"],
  ["/notifications", "notifications.tsx"],
  ["/onboarding/stripe-return", "onboarding/stripe-return.tsx"],
  ["/verify-email", "(auth)/verify-email.tsx"],
  ["/registration-success", "(auth)/registration-success.tsx"],
  ["/role-selection", "(auth)/role-selection.tsx"],
  ["/oauth-completion", "(auth)/oauth-completion.tsx"],
  ["/onboarding", "(auth)/onboarding.tsx"],
  ["/reset-password-confirm", "(auth)/reset-password-confirm.tsx"],
  ["/settings/subscription", "settings/subscription.tsx"],
  ["/guest/mobile-requests", "guest/mobile-requests.tsx"],
  ["/book/[slug]", "book/[slug].tsx"],
  ["/therapist/[id]/public", "therapist/[id]/public.tsx"],
  ["/booking/find", "booking/find.tsx"],
  ["/booking/view/[sessionId]", "booking/view/[sessionId].tsx"],
  ["/(practitioner)/exchange/[id]", "(practitioner)/exchange/[id].tsx"],
  ["/(practitioner)/exchange", "(practitioner)/exchange/index.tsx"],
];

function main() {
  const missing = [];
  for (const [pathname, fileSuffix] of DEEP_LINK_TARGETS) {
    const full = path.join(appDir, fileSuffix);
    if (!fs.existsSync(full)) {
      missing.push({ pathname, fileSuffix });
    }
  }

  console.log("Deep-link route check (deepLinking.ts → Expo app/)");
  console.log(`  Targets: ${DEEP_LINK_TARGETS.length}`);

  if (missing.length === 0) {
    console.log("  ✓ All deep-link pathnames resolve to screen files");
    return;
  }

  for (const { pathname, fileSuffix } of missing) {
    console.log(`  ✗ ${pathname} → missing app/${fileSuffix}`);
  }

  if (strict || ci) process.exit(1);
  console.log("\n  Run with DEEP_LINK_STRICT=1 to fail.");
}

main();
