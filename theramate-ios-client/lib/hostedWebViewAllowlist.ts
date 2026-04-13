/**
 * Allowlist for in-app WebView navigations (Stripe + app web + Supabase signed URLs).
 */

import { API_CONFIG, APP_CONFIG } from "@/constants/config";

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function normalizeHost(h: string): string {
  return h.replace(/^www\./, "").toLowerCase();
}

function webAppHosts(): Set<string> {
  const hosts = new Set<string>();
  try {
    const h = normalizeHost(new URL(APP_CONFIG.WEB_URL).hostname);
    if (h) {
      hosts.add(h);
      hosts.add(`www.${h}`);
    }
  } catch {
    /* ignore */
  }
  return hosts;
}

function supabaseHosts(): Set<string> {
  const hosts = new Set<string>();
  try {
    const h = normalizeHost(new URL(API_CONFIG.SUPABASE_URL).hostname);
    if (h) hosts.add(h);
  } catch {
    /* ignore */
  }
  return hosts;
}

/** Stripe Checkout, Customer Portal, Connect onboarding assets, 3DS, etc. */
export function isStripeHostedHostname(host: string): boolean {
  const h = host.toLowerCase();
  return h === "stripe.com" || h.endsWith(".stripe.com");
}

/** Marketing / success pages on our web app (Checkout success_url / cancel_url). */
export function isAppWebHostname(host: string): boolean {
  const h = host.toLowerCase();
  return webAppHosts().has(h);
}

/** Supabase Storage signed URLs (reports, clinical attachments). */
export function isSupabaseStorageHostname(host: string): boolean {
  return supabaseHosts().has(host.toLowerCase());
}

export function isAllowedHostedNavigationUrl(
  url: string,
  mode:
    | "stripe_checkout"
    | "stripe_portal"
    | "signed_document"
    | "web_app",
): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }

  const host = u.hostname.toLowerCase();

  if (u.protocol === "http:" || u.protocol === "https:") {
    if (isStripeHostedHostname(host)) return true;
    if (mode === "signed_document" && isSupabaseStorageHostname(host)) {
      return u.pathname.includes("/storage/v1/object/");
    }
    if (mode === "web_app" && isAppWebHostname(host)) {
      return true;
    }
    if (
      (mode === "stripe_checkout" || mode === "stripe_portal") &&
      isAppWebHostname(host)
    ) {
      return true;
    }
  }

  if (u.protocol === "theramate:") return true;

  return false;
}
