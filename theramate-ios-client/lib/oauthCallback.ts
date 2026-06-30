import * as Linking from "expo-linking";

import { APP_CONFIG } from "@/constants/config";

/** Native redirect registered in Supabase → URL Configuration → Redirect URLs. */
export function getOAuthRedirectUrl(): string {
  return `${APP_CONFIG.SCHEME}://${APP_CONFIG.OAUTH_CALLBACK_PATH}`;
}

function firstQueryParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (
    Array.isArray(value) &&
    typeof value[0] === "string" &&
    value[0].length > 0
  ) {
    return value[0];
  }
  return null;
}

/**
 * Parse OAuth callback query/hash without relying on `new URL()` for custom schemes.
 */
export function parseOAuthCallbackUrl(url: string): {
  code: string | null;
  error: string | null;
  accessToken: string | null;
  refreshToken: string | null;
} {
  const parsed = Linking.parse(url);
  const code = firstQueryParam(parsed.queryParams?.code);
  const error =
    firstQueryParam(parsed.queryParams?.error_description) ||
    firstQueryParam(parsed.queryParams?.error);

  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  const hashIndex = url.indexOf("#");
  if (hashIndex >= 0) {
    const hashParams = new URLSearchParams(url.slice(hashIndex + 1));
    accessToken = hashParams.get("access_token");
    refreshToken = hashParams.get("refresh_token");
    if (!error) {
      const hashErr =
        hashParams.get("error_description") || hashParams.get("error");
      if (hashErr) {
        return {
          code,
          error: hashErr,
          accessToken,
          refreshToken,
        };
      }
    }
  }

  return { code, error, accessToken, refreshToken };
}

/** User-facing copy for Supabase / OAuth failures. */
export function formatOAuthErrorMessage(raw: string): string {
  const msg = raw.trim();
  const lower = msg.toLowerCase();
  if (!msg) return "Sign-in did not complete. Please try again.";
  if (lower.includes("invalid_grant") || lower.includes("code verifier")) {
    return "This sign-in link has expired. Please try Google again.";
  }
  if (lower.includes("access_denied") || lower.includes("cancel")) {
    return "Sign-in was cancelled.";
  }
  if (lower.includes("redirect_uri_mismatch") || lower.includes("redirect")) {
    return "Google sign-in is not configured for this app build. Contact support if this continues.";
  }
  return msg;
}
