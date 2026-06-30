/**
 * Detect Stripe Checkout success/cancel redirects to our web app (success_url / cancel_url).
 */

import { APP_CONFIG } from "@/constants/config";
import { HOSTED_CHECKOUT_PATHS } from "@/lib/hostedCheckoutPaths";
import {
  getStripeCheckoutWebOrigins,
  isCheckoutWebHostname,
} from "@/lib/stripeCheckoutWebOrigins";

const CHECKOUT_WEB_ORIGINS = getStripeCheckoutWebOrigins(
  APP_CONFIG.WEB_URL,
  APP_CONFIG.CHECKOUT_WEB_ORIGINS_EXTRA,
);

export type CheckoutRedirect =
  | { type: "clinic_success"; checkoutSessionId: string }
  | {
      type: "mobile_success";
      mobileRequestId: string;
      checkoutSessionId: string;
    }
  | { type: "subscription_success"; checkoutSessionId: string }
  | { type: "connect_onboarding_return" }
  | { type: "canceled" }
  | null;

function pathIncludes(url: URL, segment: string): boolean {
  const p = url.pathname.toLowerCase();
  return p.includes(segment.toLowerCase());
}

/**
 * Parse navigations inside the WebView after Stripe redirects to APP_URL.
 */
export function parseCheckoutRedirectFromUrl(raw: string): CheckoutRedirect {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!isCheckoutWebHostname(host, CHECKOUT_WEB_ORIGINS)) return null;

  if (pathIncludes(url, HOSTED_CHECKOUT_PATHS.mobileBookingSuccess)) {
    const rid = url.searchParams.get("mobile_request_id");
    const cid = url.searchParams.get("mobile_checkout_session_id");
    if (rid && cid) {
      return {
        type: "mobile_success",
        mobileRequestId: rid,
        checkoutSessionId: cid,
      };
    }
  }

  if (pathIncludes(url, HOSTED_CHECKOUT_PATHS.bookingSuccess)) {
    const sid = url.searchParams.get("session_id");
    if (sid) return { type: "clinic_success", checkoutSessionId: sid };
  }

  if (pathIncludes(url, HOSTED_CHECKOUT_PATHS.subscriptionSuccess)) {
    const sid = url.searchParams.get("session_id");
    if (sid) return { type: "subscription_success", checkoutSessionId: sid };
  }

  const path = url.pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (
    path === HOSTED_CHECKOUT_PATHS.connectStripeReturn ||
    path.endsWith(HOSTED_CHECKOUT_PATHS.connectStripeReturn) ||
    path === HOSTED_CHECKOUT_PATHS.connectStripeReturnAlias
  ) {
    return { type: "connect_onboarding_return" };
  }

  if (url.searchParams.get("mobile_checkout_canceled") === "1") {
    return { type: "canceled" };
  }

  if (pathIncludes(url, "/marketplace")) {
    return { type: "canceled" };
  }

  return null;
}
