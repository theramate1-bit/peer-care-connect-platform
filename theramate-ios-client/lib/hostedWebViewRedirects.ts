/**
 * Detect Stripe Checkout success/cancel redirects to our web app (success_url / cancel_url).
 */

import { APP_CONFIG } from "@/constants/config";

export type CheckoutRedirect =
  | { type: "clinic_success"; checkoutSessionId: string }
  | {
      type: "mobile_success";
      mobileRequestId: string;
      checkoutSessionId: string;
    }
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

  const web = APP_CONFIG.WEB_URL.replace(/\/$/, "");
  let webHost: string;
  try {
    webHost = new URL(web).hostname.toLowerCase();
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const hostOk =
    host === webHost ||
    host === `www.${webHost}` ||
    host.replace(/^www\./, "") === webHost.replace(/^www\./, "");

  if (!hostOk) return null;

  if (pathIncludes(url, "/mobile-booking/success")) {
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

  if (pathIncludes(url, "/booking-success")) {
    const sid = url.searchParams.get("session_id");
    if (sid) return { type: "clinic_success", checkoutSessionId: sid };
  }

  if (url.searchParams.get("mobile_checkout_canceled") === "1") {
    return { type: "canceled" };
  }

  if (pathIncludes(url, "/marketplace")) {
    return { type: "canceled" };
  }

  return null;
}
