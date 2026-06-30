#!/usr/bin/env node
/**
 * Mobile Expo routes ↔ web AppContent parity inventory.
 *   npm run check:route-inventory
 *   ROUTE_INVENTORY_STRICT=1 npm run check:route-inventory
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.env.ROUTE_INVENTORY_STRICT === "1";
const ci = process.env.CI === "1";

const APP_DIR = path.join(root, "theramate-ios-client/app");
const APP_CONTENT = path.join(
  root,
  "peer-care-connect/src/components/AppContent.tsx",
);

/**
 * Curated product parity: mobile file suffix → web route pattern.
 * Dynamic segments use :param (web) / [param] (mobile file names).
 */
const PARITY = [
  // Auth & onboarding
  ["(auth)/login.tsx", "/login"],
  ["(auth)/register.tsx", "/register"],
  ["(auth)/forgot-password.tsx", "/reset-password"],
  ["(auth)/reset-password-confirm.tsx", "/auth/reset-password-confirm"],
  ["(auth)/registration-success.tsx", "/auth/registration-success"],
  ["(auth)/verify-email.tsx", "/auth/verify-email"],
  ["(auth)/role-selection.tsx", "/auth/role-selection"],
  ["(auth)/oauth-completion.tsx", "/auth/oauth-completion"],
  ["(auth)/onboarding.tsx", "/onboarding"],
  ["(auth)/practitioner-onboarding.tsx", "/onboarding"],
  ["auth/callback.tsx", "/auth/callback"],
  ["onboarding/stripe-return.tsx", "/onboarding/stripe-return"],
  ["subscription-success.tsx", "/subscription-success"],

  // Guest / public booking
  ["book/[slug].tsx", "/book/:slug"],
  ["guest/mobile-requests.tsx", "/guest/mobile-requests"],
  ["booking/find.tsx", "/booking/find"],
  ["booking/view/[sessionId].tsx", "/booking/view/:sessionId"],
  ["booking-success.tsx", "/booking-success"],
  ["mobile-booking/success.tsx", "/mobile-booking/success"],
  ["review.tsx", "/review"],
  ["therapist/[id]/public.tsx", "/therapist/:therapistId/public"],

  // Marketing / legal
  ["how-it-works.tsx", "/how-it-works"],
  ["contact.tsx", "/contact"],
  ["help.tsx", "/help"],
  ["terms.tsx", "/terms"],
  ["privacy.tsx", "/privacy"],
  ["cookies.tsx", "/cookies"],
  ["dpa.tsx", "/dpa"],
  ["pricing.tsx", "/pricing"],
  ["find-therapists.tsx", "/find-therapists"],
  // Client tabs
  ["(tabs)/index.tsx", "/client/dashboard"],
  ["(tabs)/explore/index.tsx", "/marketplace"],
  ["(tabs)/explore/[id].tsx", "/marketplace"],
  ["(tabs)/bookings/index.tsx", "/client/sessions"],
  ["(tabs)/bookings/[id].tsx", "/client/sessions"],
  ["(tabs)/messages/index.tsx", "/client/messages"],
  ["(tabs)/messages/[id].tsx", "/client/messages"],
  ["(tabs)/profile/index.tsx", "/client/profile"],
  ["(tabs)/profile/progress-goals.tsx", "/client/progress"],
  ["(tabs)/profile/exercises/index.tsx", "/client/exercises"],
  ["(tabs)/profile/exercises/[id].tsx", "/client/exercises"],
  ["(tabs)/profile/favorites.tsx", "/client/favorites"],
  ["(tabs)/profile/treatment-plans/index.tsx", "/client/treatment-plans"],
  ["(tabs)/profile/treatment-plans/[id].tsx", "/client/treatment-plans"],
  ["(tabs)/profile/mobile-requests/index.tsx", "/client/mobile-requests"],
  ["(tabs)/profile/mobile-requests/[id].tsx", "/client/mobile-requests"],
  ["(tabs)/profile/credits.tsx", "/credits"],
  ["(tabs)/profile/notifications.tsx", "/notifications"],
  ["(tabs)/profile/settings.tsx", "/settings"],
  ["(tabs)/profile/privacy-security.tsx", "/settings/privacy"],
  ["(tabs)/profile/edit-profile.tsx", "/client/profile"],
  ["(tabs)/profile/help-centre.tsx", "/help"],
  ["(tabs)/profile/my-reviews.tsx", "/review"],
  ["(tabs)/profile/payment-methods.tsx", "/payments"],
  ["settings/subscription.tsx", "/settings/subscription"],
  ["settings/privacy.tsx", "/settings/privacy"],
  ["notifications.tsx", "/notifications"],

  // Booking flows (signed-in)
  ["booking/index.tsx", "/client/booking"],
  ["booking/mobile-request.tsx", "/client/booking"],
  ["booking/choose-mode.tsx", "/client/booking"],

  // Practitioner tab roots
  ["(practitioner)/(ptabs)/index.tsx", "/dashboard"],
  ["(practitioner)/(ptabs)/schedule/index.tsx", "/practice/schedule"],
  ["(practitioner)/(ptabs)/bookings/index.tsx", "/bookings"],
  ["(practitioner)/(ptabs)/bookings/[id].tsx", "/bookings"],
  ["(practitioner)/(ptabs)/bookings/new.tsx", "/practice/manual-booking"],
  ["(practitioner)/(ptabs)/profile/index.tsx", "/profile"],
  ["(practitioner)/(ptabs)/profile/edit-profile.tsx", "/profile"],
  ["(practitioner)/(ptabs)/profile/direct-booking-link.tsx", "/profile"],
  ["(practitioner)/(ptabs)/profile/practice-locations.tsx", "/profile"],
  ["(practitioner)/(ptabs)/profile/qualifications.tsx", "/profile"],
  ["(practitioner)/(ptabs)/profile/qualification-documents.tsx", "/profile"],
  ["(practitioner)/(ptabs)/profile/professional-details.tsx", "/profile"],
  ["(practitioner)/(ptabs)/profile/privacy-security.tsx", "/settings/privacy"],
  ["(practitioner)/(ptabs)/profile/settings.tsx", "/settings"],
  ["(practitioner)/(ptabs)/profile/notifications.tsx", "/notifications"],
  ["(practitioner)/(ptabs)/profile/payment-methods.tsx", "/practice/payment-preferences"],
  ["(practitioner)/(ptabs)/profile/help-centre.tsx", "/help"],
  ["(practitioner)/(ptabs)/profile/my-reviews.tsx", "/review"],
  ["(practitioner)/(ptabs)/profile/progress-goals.tsx", "/client/progress"],
  ["(practitioner)/(ptabs)/profile/exercises/index.tsx", "/client/exercises"],
  ["(practitioner)/(ptabs)/profile/exercises/[id].tsx", "/client/exercises"],
  ["(practitioner)/(ptabs)/profile/mobile-requests/index.tsx", "/practice/mobile-requests"],
  ["(practitioner)/(ptabs)/profile/mobile-requests/[id].tsx", "/practice/mobile-requests"],
  ["(practitioner)/(ptabs)/profile/treatment-plans/index.tsx", "/practice/treatment-plans"],
  ["(practitioner)/(ptabs)/profile/treatment-plans/[id].tsx", "/practice/treatment-plans"],
  ["(practitioner)/(ptabs)/messages/index.tsx", "/messages"],
  ["(practitioner)/(ptabs)/messages/[id].tsx", "/messages"],

  // Practitioner stack
  ["(practitioner)/clients/index.tsx", "/practice/clients"],
  ["(practitioner)/clients/[clientId].tsx", "/practice/clients"],
  ["(practitioner)/(ptabs)/clients/index.tsx", "/practice/clients"],
  ["(practitioner)/(ptabs)/clients/[clientId].tsx", "/practice/clients"],
  ["(practitioner)/mobile-requests/index.tsx", "/practice/mobile-requests"],
  ["(practitioner)/mobile-requests/[id].tsx", "/practice/mobile-requests"],
  ["(practitioner)/exchange/index.tsx", "/practice/exchange-requests"],
  ["(practitioner)/exchange/[id].tsx", "/practice/exchange-requests"],
  ["(practitioner)/treatment-plans/index.tsx", "/practice/treatment-plans"],
  ["(practitioner)/treatment-plans/[planId].tsx", "/practice/treatment-plans"],
  ["(practitioner)/treatment-plans/new.tsx", "/practice/treatment-plans"],
  ["(practitioner)/clinical-files/index.tsx", "/practice/clinical-files"],
  ["(practitioner)/clinical-notes/[sessionId].tsx", "/practice/clinical-notes/:sessionId"],
  ["(practitioner)/projects/index.tsx", "/projects"],
  ["(practitioner)/projects/[id].tsx", "/projects"],
  ["(practitioner)/services/index.tsx", "/practice/scheduler"],
  ["(practitioner)/availability/index.tsx", "/practice/scheduler"],
  ["(practitioner)/billing/index.tsx", "/practice/billing"],
  ["(practitioner)/stripe-connect/index.tsx", "/payments/connect"],
  ["(practitioner)/credits/index.tsx", "/credits"],
  ["(practitioner)/analytics/index.tsx", "/analytics"],
  ["(practitioner)/analytics/reports.tsx", "/analytics"],
  ["(practitioner)/marketplace/index.tsx", "/marketplace"],
  ["(practitioner)/marketplace/product/[id].tsx", "/marketplace"],
  ["(practitioner)/marketplace/product/new.tsx", "/projects/new"],
  ["(practitioner)/explore/[id].tsx", "/marketplace"],
  ["(practitioner)/block-time.tsx", "/practice/schedule"],
  ["(practitioner)/calendar-sync.tsx", "/practice/calendar"],
  ["(practitioner)/patient-history-requests/index.tsx", "/practice/clients"],
];

/** Intentional mobile-only surfaces (no 1:1 web route). */
const MOBILE_ONLY_SUFFIXES = new Set([
  "hosted-web.tsx",
  "stripe-customer-portal.tsx",
  "diagnostics.tsx",
  "oauth-callback.tsx",
  "mobile-booking/pending.tsx",
  "(practitioner)/stripe-connect/embedded.tsx",
  "(practitioner)/index.tsx",
  "(practitioner)/explore/index.tsx",
  "(practitioner)/(ptabs)/clients/guest.tsx",
  "(practitioner)/(ptabs)/bookings/review.tsx",
  "(tabs)/bookings/review.tsx",
  "(tabs)/bookings/reschedule.tsx",
  "(auth)/welcome.tsx",
  "(auth)/hero.tsx",
  "index.tsx",
  "+not-found.tsx",
  "settings.tsx",
]);

/** Web routes with no native screen by design. */
const WEB_ONLY = new Set([
  "/",
  "/about",
  "/admin/verification",
  "/unauthorized",
  "/explore",
  "/client/ClientBooking",
  "/my-bookings",
  "/dashboard/projects",
  "/dashboard/projects/create",
  "/payments",
  "/payments/history",
  "/reviews",
  "/client/goals",
  "/settings",
  "/settings/profile",
  "/settings/notifications",
  "/settings/help",
  "/practice/upcoming-sessions",
  "/practice/analytics",
  "/stripe-return",
  "/subprocessors",
  "/auth/login",
  "/sign-in",
  "/auth/sign-in",
  "/auth/google-calendar-callback",
]);

function walkMobileScreens(dir, base = "") {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (fs.statSync(full).isDirectory()) {
      out.push(...walkMobileScreens(full, rel));
      continue;
    }
    if (!name.endsWith(".tsx")) continue;
    if (name === "_layout.tsx") continue;
    out.push(rel);
  }
  return out.sort();
}

function extractWebRoutes(text) {
  const paths = new Set();
  const re = /path=["'](\/[^"']*)["']/g;
  let m;
  while ((m = re.exec(text))) paths.add(m[1]);
  return paths;
}

function webRouteExists(webPath, registered) {
  if (registered.has(webPath)) return true;
  for (const r of registered) {
    if (!r.includes(":")) continue;
    const prefix = r.split(":")[0];
    if (webPath.startsWith(prefix) && webPath.length > prefix.length) return true;
  }
  return false;
}

function main() {
  const mobileScreens = walkMobileScreens(APP_DIR);
  const appText = fs.readFileSync(APP_CONTENT, "utf8");
  const webRoutes = extractWebRoutes(appText);

  const parityByMobile = new Map(PARITY.map(([m, w]) => [m, w]));
  const mappedWeb = new Set(PARITY.map(([, w]) => w));

  const unmappedMobile = [];
  const brokenParity = [];
  const coveredMobile = [];

  for (const file of mobileScreens) {
    if (MOBILE_ONLY_SUFFIXES.has(file)) continue;

    const web = parityByMobile.get(file);
    if (!web) {
      unmappedMobile.push(file);
      continue;
    }
    coveredMobile.push(file);
    if (!webRouteExists(web, webRoutes)) {
      brokenParity.push({ file, web });
    }
  }

  const unmappedWeb = [...webRoutes]
    .filter((r) => !WEB_ONLY.has(r) && !mappedWeb.has(r))
    .sort();

  console.log("Route inventory (Expo app/ ↔ web AppContent)");
  console.log(`  Mobile screens: ${mobileScreens.length}`);
  console.log(`  Web routes: ${webRoutes.size}`);
  console.log(`  Curated parity pairs: ${PARITY.length}`);
  console.log(`  Mobile screens mapped: ${coveredMobile.length}`);
  console.log(`  Mobile-only (excluded): ${MOBILE_ONLY_SUFFIXES.size}`);

  let issues = 0;

  if (unmappedMobile.length) {
    issues += unmappedMobile.length;
    console.log(`\n  Unmapped mobile screens (${unmappedMobile.length}):`);
    for (const f of unmappedMobile) console.log(`    ✗ ${f}`);
  } else {
    console.log("\n  ✓ All non–mobile-only screens have parity entries");
  }

  if (brokenParity.length) {
    issues += brokenParity.length;
    console.log(`\n  Parity entries missing web route (${brokenParity.length}):`);
    for (const { file, web } of brokenParity) {
      console.log(`    ✗ ${file} → ${web}`);
    }
  } else {
    console.log("  ✓ All parity entries resolve in AppContent");
  }

  if (unmappedWeb.length) {
    console.log(`\n  Web routes without mobile parity entry (${unmappedWeb.length}):`);
    for (const r of unmappedWeb) console.log(`    · ${r}`);
    console.log("    (informational — add to PARITY or WEB_ONLY in check-route-inventory.mjs)");
  }

  if (issues === 0) {
    console.log("\n  ✓ Route inventory check passed");
    return;
  }

  if (strict || ci) {
    process.exit(1);
  }
  console.log(
    "\n  Run with ROUTE_INVENTORY_STRICT=1 to fail on unmapped/broken parity.",
  );
}

main();
