# Release & store readiness (customer mobile)

Use before **TestFlight / internal testing** and **store submission**. Not a substitute for legal review.

**Related:** [`15-MOBILE_PLATFORM_READINESS.md`](15-MOBILE_PLATFORM_READINESS.md), [`21-DEVELOPER_QUICKSTART_CUSTOMER_MOBILE.md`](21-DEVELOPER_QUICKSTART_CUSTOMER_MOBILE.md), [`19-NATIVE_ANALYTICS_AND_OBSERVABILITY.md`](19-NATIVE_ANALYTICS_AND_OBSERVABILITY.md) (PHI scrubbing).

---

## Pre-build (engineering)

| Item                                                                                      | Done |
| ----------------------------------------------------------------------------------------- | ---- |
| Canonical Expo app chosen ([`10-TWO_NATIVE_CODEBASES.md`](10-TWO_NATIVE_CODEBASES.md))    |      |
| EAS project + secrets (no keys in repo)                                                   |      |
| Supabase URL + anon key in native env                                                     |      |
| Stripe PaymentSheet / Edge Functions tested on device                                     |      |
| Deep links + OAuth return paths ([`23`](23-OAUTH_DEEP_LINKS_IMPLEMENTATION_CHECKLIST.md)) |      |
| Push optional: APNs / FCM configured if shipping notifications                            |      |

---

## Store listing (both platforms)

| Item                                                                  | Notes                                   |
| --------------------------------------------------------------------- | --------------------------------------- |
| App name, subtitle, keywords                                          |                                         |
| **Privacy policy URL**                                                | Must match in-app disclosure            |
| Support URL                                                           |                                         |
| Screenshots (required sizes per store)                                | Customer flows, not practitioner        |
| **Data safety / nutrition** (Android) / **Privacy nutrition** (Apple) | Health-adjacent: declare data collected |
| Age rating questionnaire                                              |                                         |

---

## PHI / sensitive data (reviewer + user trust)

| Item                                                                                                                | Notes                      |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Analytics: no names, clinical notes, or session detail in events ([`19`](19-NATIVE_ANALYTICS_AND_OBSERVABILITY.md)) |                            |
| Crash logs: confirm Sentry scrub rules if used                                                                      |                            |
| App Store “health” claims                                                                                           | Align with actual features |

---

## Post-launch ops

| Item                                                                           | Notes |
| ------------------------------------------------------------------------------ | ----- |
| EAS Update / forced update policy ([`16`](16-MOBILE_SCREENS_BUILD_LIST.md) G3) |       |
| Rollback plan                                                                  |       |

---

## Revision

| Date       | Change            |
| ---------- | ----------------- |
| 2026-03-26 | Initial checklist |
