/**
 * Maps incoming app URLs (custom scheme + HTTPS universal links) to Expo Router targets.
 */

import { APP_CONFIG } from "@/constants/config";

export type DeepLinkNavigation =
  | { pathname: "/booking-success"; params: { session_id?: string } }
  | {
      pathname: "/mobile-booking/success";
      params: {
        sessionId?: string;
        mobile_request_id?: string;
        mobile_checkout_session_id?: string;
      };
    }
  | {
      pathname: "/mobile-booking/pending";
      params: {
        requestId?: string;
        checkoutSessionId?: string;
        checkoutUrl?: string;
      };
    }
  | { pathname: "/review"; params: { sessionId?: string; token?: string } }
  | { pathname: "/notifications" }
  | { pathname: "/onboarding/stripe-return" }
  | { pathname: "/(auth)/verify-email" }
  | { pathname: "/(auth)/registration-success" }
  | { pathname: "/(auth)/role-selection" }
  | { pathname: "/(auth)/oauth-completion" }
  | { pathname: "/(auth)/onboarding" }
  | { pathname: "/(auth)/reset-password-confirm" }
  | { pathname: "/settings/subscription" }
  | { pathname: "/guest/mobile-requests" }
  /** Guest direct booking — `slug` preserves case (not lowercased). */
  | { pathname: "/book/[slug]"; params: { slug: string } }
  | { pathname: "/therapist/[id]/public"; params: { id: string } }
  | { pathname: "/booking/find" }
  | {
      pathname: "/booking/view/[sessionId]";
      params: { sessionId: string; token?: string };
    };

function webHostSet(): Set<string> {
  const hosts = new Set<string>(["theramate.com", "www.theramate.com"]);
  try {
    const fromConfig = new URL(APP_CONFIG.WEB_URL).hostname;
    if (fromConfig) hosts.add(fromConfig);
  } catch {
    /* ignore */
  }
  return hosts;
}

function normalizePath(path: string): string {
  return path.replace(/^\/+|\/+$/g, "").toLowerCase();
}

/** Trim slashes only — keep case for dynamic segments (e.g. book slugs). */
function trimPath(path: string): string {
  return path.replace(/^\/+|\/+$/g, "");
}

/**
 * Returns a navigation target for in-app routing, or null if this URL should be handled elsewhere (e.g. OAuth).
 */
export function getNavigationFromDeepLink(
  url: string,
): DeepLinkNavigation | null {
  if (!url || typeof url !== "string") return null;

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }

  const proto = u.protocol.replace(":", "");
  const params = Object.fromEntries(u.searchParams.entries()) as Record<
    string,
    string
  >;

  const isAppScheme = proto === "theramate" || proto === APP_CONFIG.SCHEME;
  const isWeb =
    proto === "https" || proto === "http"
      ? webHostSet().has(u.hostname)
      : false;

  if (!isAppScheme && !isWeb) return null;

  let path: string;
  if (isAppScheme) {
    const host = u.hostname;
    const rest = u.pathname.replace(/^\//, "");
    path = rest ? `${host}/${rest}` : host;
  } else {
    path = u.pathname.replace(/^\//, "");
  }

  const rawPath = trimPath(path);
  const p = normalizePath(path);

  // Guest direct book — preserve slug casing (normalizePath would break mixed-case slugs).
  if (/^book\//i.test(rawPath)) {
    const slug = rawPath.replace(/^book\//i, "");
    if (slug) {
      return { pathname: "/book/[slug]", params: { slug } };
    }
  }

  // Public therapist profile
  if (/^therapist\//i.test(rawPath) && /\/public$/i.test(rawPath)) {
    const id = rawPath
      .replace(/^therapist\//i, "")
      .replace(/\/public$/i, "")
      .split("/")[0];
    if (id) {
      return { pathname: "/therapist/[id]/public", params: { id } };
    }
  }

  if (p === "booking/find") {
    return { pathname: "/booking/find" };
  }

  // booking/view/<sessionId> — token often arrives in query string (email links)
  if (/^booking\/view\//i.test(rawPath)) {
    const sessionId = rawPath.replace(/^booking\/view\//i, "").split("/")[0];
    if (sessionId) {
      const token = params.token ?? params.t ?? params.access_token;
      return {
        pathname: "/booking/view/[sessionId]",
        params: token ? { sessionId, token } : { sessionId },
      };
    }
  }

  if (p === "booking-success") {
    return {
      pathname: "/booking-success",
      params: { session_id: params.session_id },
    };
  }

  if (p === "mobile-booking/success") {
    return {
      pathname: "/mobile-booking/success",
      params: {
        sessionId: params.sessionId ?? params.session_id,
        mobile_request_id:
          params.mobile_request_id ?? params.request_id ?? params.requestId,
        mobile_checkout_session_id:
          params.mobile_checkout_session_id ??
          params.checkout_session_id ??
          params.checkoutSessionId,
      },
    };
  }

  if (p === "mobile-booking/pending") {
    return {
      pathname: "/mobile-booking/pending",
      params: {
        requestId: params.requestId ?? params.request_id,
        checkoutSessionId:
          params.checkoutSessionId ?? params.checkout_session_id,
        checkoutUrl: params.checkoutUrl ?? params.checkout_url,
      },
    };
  }

  if (p === "review") {
    return {
      pathname: "/review",
      params: {
        sessionId: params.sessionId ?? params.session_id,
        token: params.token,
      },
    };
  }

  if (p === "notifications") {
    return { pathname: "/notifications" };
  }

  if (p === "onboarding/stripe-return" || p === "stripe-return") {
    return { pathname: "/onboarding/stripe-return" };
  }

  if (p === "auth/verify-email" || p === "verify-email") {
    return { pathname: "/(auth)/verify-email" };
  }

  if (p === "auth/registration-success" || p === "registration-success") {
    return { pathname: "/(auth)/registration-success" };
  }

  if (p === "auth/role-selection" || p === "role-selection") {
    return { pathname: "/(auth)/role-selection" };
  }

  if (p === "auth/oauth-completion" || p === "oauth-completion") {
    return { pathname: "/(auth)/oauth-completion" };
  }

  if (p === "onboarding" || p === "auth/onboarding") {
    return { pathname: "/(auth)/onboarding" };
  }

  if (p === "auth/reset-password-confirm" || p === "reset-password-confirm") {
    return { pathname: "/(auth)/reset-password-confirm" };
  }

  if (p === "subscription-success") {
    return { pathname: "/settings/subscription" };
  }

  if (p === "guest/mobile-requests") {
    return { pathname: "/guest/mobile-requests" };
  }

  return null;
}

/**
 * OAuth return: custom scheme (`theramate://oauth-callback`) or HTTPS on the configured web host
 * (`/auth/callback`, `/oauth-callback`) so Universal Links complete the same session exchange as web.
 */
export function isOAuthCallbackUrl(url: string): boolean {
  if (
    url.includes(`${APP_CONFIG.SCHEME}://${APP_CONFIG.OAUTH_CALLBACK_PATH}`)
  ) {
    return true;
  }
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (!webHostSet().has(u.hostname)) return false;
    const path = u.pathname.replace(/\/$/, "").toLowerCase();
    return path === "/auth/callback" || path === "/oauth-callback";
  } catch {
    return false;
  }
}

/**
 * Password recovery deep link (custom scheme or HTTPS on the same hosts as OAuth).
 */
export function isPasswordResetUrl(url: string): boolean {
  if (
    url.includes(`${APP_CONFIG.SCHEME}://${APP_CONFIG.RESET_PASSWORD_PATH}`)
  ) {
    return true;
  }
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (!webHostSet().has(u.hostname)) return false;
    const path = u.pathname.replace(/\/$/, "").toLowerCase();
    const confirm = `/${APP_CONFIG.RESET_PASSWORD_PATH}`.toLowerCase();
    return path === confirm || path === `/auth${confirm}`;
  } catch {
    return false;
  }
}
