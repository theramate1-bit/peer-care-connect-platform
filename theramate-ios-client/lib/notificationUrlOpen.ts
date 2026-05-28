/**
 * Open notification targets in-app (no Safari) where possible.
 */

import { router } from "expo-router";

import {
  isStripeHostedHostname,
  isSupabaseStorageHostname,
} from "@/lib/hostedWebViewAllowlist";
import { openHostedWebSession } from "@/lib/openHostedWeb";
import { tryMapWebUrlToRoute } from "@/lib/notificationWebRouteMap";
import {
  getStripeCheckoutWebOrigins,
  isCheckoutWebHostname,
} from "@/lib/stripeCheckoutWebOrigins";
import { APP_CONFIG } from "@/constants/config";

export { tryMapWebUrlToRoute } from "@/lib/notificationWebRouteMap";

const APP_WEB_ORIGINS = getStripeCheckoutWebOrigins(
  APP_CONFIG.WEB_URL,
  APP_CONFIG.CHECKOUT_WEB_ORIGINS_EXTRA,
);

function isTheramateWebUrl(u: URL): boolean {
  return isCheckoutWebHostname(u.hostname.toLowerCase(), APP_WEB_ORIGINS);
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

  if (isTheramateWebUrl(u)) {
    openHostedWebSession({ kind: "web_app", url: trimmed });
    return;
  }
}
