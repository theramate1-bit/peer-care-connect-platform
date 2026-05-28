/**
 * Shared cookie consent key and events for CookieConsent, Cookies page reset, and LiveChat gating.
 */

export const TM_COOKIE_CONSENT_KEY = "tm_cookie_consent_v1";

export const TM_COOKIE_CONSENT_CHANGED_EVENT = "tm-cookie-consent-changed";

export type TmCookieConsentPrefs = {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
};

export function readStoredCookieConsent(): TmCookieConsentPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TM_COOKIE_CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TmCookieConsentPrefs;
  } catch {
    return null;
  }
}

export function dispatchCookieConsentChanged(
  prefs: TmCookieConsentPrefs,
): void {
  window.dispatchEvent(
    new CustomEvent(TM_COOKIE_CONSENT_CHANGED_EVENT, { detail: prefs }),
  );
}
