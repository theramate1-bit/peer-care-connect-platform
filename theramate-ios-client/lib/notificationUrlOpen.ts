/**
 * Open notification targets in-app (no Safari) where possible.
 */

import { router } from "expo-router";

import { APP_CONFIG } from "@/constants/config";
import {
  isStripeHostedHostname,
  isSupabaseStorageHostname,
} from "@/lib/hostedWebViewAllowlist";
import { openHostedWebSession } from "@/lib/openHostedWeb";
import { getMainAppHref } from "@/lib/postAuthRoute";
import { tabPath } from "@/lib/tabPath";

function normalizeWebHost(): string | null {
  try {
    return new URL(APP_CONFIG.WEB_URL).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function hostsMatch(u: URL, webHost: string): boolean {
  const h = u.hostname.replace(/^www\./, "").toLowerCase();
  return h === webHost;
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
  const webHost = normalizeWebHost();
  if (!webHost || !hostsMatch(u, webHost)) return null;

  const path = u.pathname;
  const root = getMainAppHref(role);

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

export function openNotificationAbsoluteUrl(
  url: string,
  role: string | null | undefined,
): void {
  const trimmed = (url || "").trim();
  if (!trimmed) return;

  const mapped = tryMapWebUrlToRoute(trimmed, role);
  if (mapped) {
    router.push(mapped as never);
    return;
  }

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return;
  }

  const host = u.hostname.toLowerCase();

  if (
    isSupabaseStorageHostname(host) &&
    u.pathname.includes("/storage/v1/object/")
  ) {
    openHostedWebSession({ kind: "signed_document", url: trimmed });
    return;
  }

  if (isStripeHostedHostname(host)) {
    openHostedWebSession({ kind: "stripe_portal", url: trimmed });
    return;
  }

  const webHost = normalizeWebHost();
  if (webHost && hostsMatch(u, webHost)) {
    openHostedWebSession({ kind: "web_app", url: trimmed });
    return;
  }
}
