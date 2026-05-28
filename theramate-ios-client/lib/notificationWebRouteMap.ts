/**
 * Map Theramate web URLs to native routes (no expo-router — safe for Jest).
 */

import { APP_CONFIG } from "@/constants/config";
import {
  getStripeCheckoutWebOrigins,
  isCheckoutWebHostname,
} from "@/lib/stripeCheckoutWebOrigins";
import { tabPath, type TabRootHref } from "@/lib/tabPath";
import { parsePracticeExchangeRequestId } from "@/lib/webExchangeDeepLink";

/** Mirrors `isPractitionerPortalRole` without pulling in Supabase (Jest-safe). */
function tabRootForRole(role: string | null | undefined): TabRootHref {
  if (!role) return "/(tabs)";
  if (role === "practitioner") return "/(practitioner)/(ptabs)";
  if (
    role === "sports_therapist" ||
    role === "osteopath" ||
    role === "massage_therapist"
  ) {
    return "/(practitioner)/(ptabs)";
  }
  return "/(tabs)";
}

const APP_WEB_ORIGINS = getStripeCheckoutWebOrigins(
  APP_CONFIG.WEB_URL,
  APP_CONFIG.CHECKOUT_WEB_ORIGINS_EXTRA,
);

function isTheramateWebUrl(u: URL): boolean {
  return isCheckoutWebHostname(u.hostname.toLowerCase(), APP_WEB_ORIGINS);
}

/**
 * Map absolute web-app URLs to native routes when we have a direct equivalent.
 */
export function tryMapWebUrlToRoute(
  absoluteUrl: string,
  role: string | null | undefined,
): string | null {
  let u: URL;
  try {
    u = new URL(absoluteUrl);
  } catch {
    return null;
  }
  if (!isTheramateWebUrl(u)) return null;

  const path = u.pathname;
  const root = tabRootForRole(role);

  const exchangeRequestId = parsePracticeExchangeRequestId(u.toString());
  if (exchangeRequestId) {
    if (root === "/(practitioner)/(ptabs)") {
      return tabPath(root, `exchange/${exchangeRequestId}`);
    }
    return tabPath(root, "profile/credits");
  }
  if (
    path.replace(/\/+$/, "").toLowerCase() === "/practice/exchange-requests"
  ) {
    if (root === "/(practitioner)/(ptabs)") {
      return tabPath(root, "exchange");
    }
    return tabPath(root, "profile/credits");
  }

  if (path === "/marketplace" || path.startsWith("/marketplace/")) {
    return tabPath(root, "explore");
  }

  if (path === "/client/favorites" || path.startsWith("/client/favorites/")) {
    return tabPath(root, "profile/favorites");
  }

  if (path === "/client/plans") {
    return tabPath(root, "profile/treatment-plans");
  }
  const plansDetail = path.match(/^\/client\/plans\/([^/]+)/);
  if (plansDetail?.[1]) {
    return tabPath(root, `profile/treatment-plans/${plansDetail[1]}`);
  }

  const staticPaths = new Set([
    "/privacy",
    "/terms",
    "/cookies",
    "/dpa",
    "/pricing",
    "/how-it-works",
    "/contact",
    "/help",
  ]);
  if (staticPaths.has(path)) {
    const map: Record<string, string> = {
      "/help": "/help",
      "/privacy": "/privacy",
      "/terms": "/terms",
      "/cookies": "/cookies",
      "/dpa": "/dpa",
      "/pricing": "/pricing",
      "/how-it-works": "/how-it-works",
      "/contact": "/contact",
    };
    const target = map[path];
    return target ? `${target}${u.search}` : null;
  }

  if (path.startsWith("/booking-success")) {
    const sid = u.searchParams.get("session_id");
    if (sid) {
      return `/booking-success?session_id=${encodeURIComponent(sid)}`;
    }
  }

  if (path.startsWith("/mobile-booking/success")) {
    const q = u.searchParams.toString();
    return `/mobile-booking/success${q ? `?${q}` : ""}`;
  }

  return null;
}
