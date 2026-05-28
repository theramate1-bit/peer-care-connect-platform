/**
 * Allowed web origins for Stripe Checkout return URLs parsed in the hosted WebView.
 * Primary: EXPO_PUBLIC_WEB_URL. Optional: EXPO_PUBLIC_CHECKOUT_WEB_ORIGINS (comma-separated).
 * Always includes Theramate .com / .co.uk variants so APP_URL drift does not break redirects.
 */

const KNOWN_THERAMATE_ORIGINS = [
  "https://theramate.co.uk",
  "https://www.theramate.co.uk",
  "https://theramate.com",
  "https://www.theramate.com",
] as const;

function normalizeOrigin(raw: string): string | null {
  const t = raw.trim().replace(/\/$/, "");
  if (!t) return null;
  try {
    const u = new URL(t.includes("://") ? t : `https://${t}`);
    return `${u.protocol}//${u.hostname}`.toLowerCase();
  } catch {
    return null;
  }
}

function addWwwVariant(origin: string, set: Set<string>) {
  set.add(origin);
  try {
    const u = new URL(origin);
    const host = u.hostname.toLowerCase();
    if (host.startsWith("www.")) {
      set.add(`${u.protocol}//${host.slice(4)}`);
    } else {
      set.add(`${u.protocol}//www.${host}`);
    }
  } catch {
    /* ignore */
  }
}

/** Build deduped list of allowed checkout redirect origins. */
export function getStripeCheckoutWebOrigins(
  primaryWebUrl?: string,
  extraOriginsCsv?: string,
): string[] {
  const set = new Set<string>();

  for (const known of KNOWN_THERAMATE_ORIGINS) {
    addWwwVariant(known, set);
  }

  const primary = normalizeOrigin(primaryWebUrl || "https://theramate.co.uk");
  if (primary) addWwwVariant(primary, set);

  if (extraOriginsCsv) {
    for (const part of extraOriginsCsv.split(",")) {
      const o = normalizeOrigin(part);
      if (o) addWwwVariant(o, set);
    }
  }

  return [...set];
}

export function isCheckoutWebHostname(
  hostname: string,
  allowedOrigins: string[],
): boolean {
  const h = hostname.toLowerCase();
  for (const origin of allowedOrigins) {
    try {
      const webHost = new URL(origin).hostname.toLowerCase();
      if (h === webHost) return true;
      if (h === `www.${webHost}`) return true;
      if (h.replace(/^www\./, "") === webHost.replace(/^www\./, ""))
        return true;
    } catch {
      /* skip invalid */
    }
  }
  return false;
}
