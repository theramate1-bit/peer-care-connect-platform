# Documentation & product gaps — customer mobile (living tracker)

Use this to record **what we know is missing**, **inconsistent**, or **not yet documented**. Resolve or update rows as you ship.

---

## A. Documentation gaps (this folder)

| ID    | Gap                                                                                                                                                      | Status                                   | Where to fix                                                                                                                                                                                                                                                                                                                                 |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DG-01 | Formal **BMAD UX Design Specification** artifact (full `create-ux-design` workflow output)                                                               | **Partial** — stub added                 | **Interim:** [`_bmad-output/planning-artifacts/ux-design-customer-mobile.md`](../../_bmad-output/planning-artifacts/ux-design-customer-mobile.md) · **Full run:** [`create-ux-design` workflow](../../_bmad/bmm/workflows/2-plan-workflows/create-ux-design/workflow.md) · Index: [`20-BMAD_WORKFLOWS_INDEX.md`](20-BMAD_WORKFLOWS_INDEX.md) |
| DG-02 | **Figma / PNG** wireframes not linked from repo                                                                                                          | **Partial** — text wireframes + registry | ASCII + flows: [`24-SCREEN_WIREFRAMES_AND_LAYOUTS.md`](24-SCREEN_WIREFRAMES_AND_LAYOUTS.md); paste Figma URLs in [`25-SCREEN_REGISTRY_FOR_DESIGN.md`](25-SCREEN_REGISTRY_FOR_DESIGN.md); main inventory §5: [`../product/MOBILE_WEB_FULL_SCREEN_INVENTORY.md`](../product/MOBILE_WEB_FULL_SCREEN_INVENTORY.md)                               |
| DG-03 | **Per-screen native specs** (gestures, empty states, error copy) for each screen in [`16-MOBILE_SCREENS_BUILD_LIST.md`](16-MOBILE_SCREENS_BUILD_LIST.md) | Partial                                  | Expand as screens are built                                                                                                                                                                                                                                                                                                                  |
| DG-04 | **Analytics event map** (screen views, booking funnel) for native                                                                                        | **Partial**                              | [`19-NATIVE_ANALYTICS_AND_OBSERVABILITY.md`](19-NATIVE_ANALYTICS_AND_OBSERVABILITY.md)                                                                                                                                                                                                                                                       |
| DG-05 | **i18n / locales** strategy                                                                                                                              | Open                                     | Not in scope yet; note when product requires it                                                                                                                                                                                                                                                                                              |
| DG-06 | **Tablet** layout rules (iPad, large Android)                                                                                                            | Open                                     | `12-NAVIGATION` focuses on web responsive; add native tablet section later                                                                                                                                                                                                                                                                   |
| DG-07 | **Guest + auth route tables** complete vs `AppContent.tsx`                                                                                               | **Addressed** (2026-03-26)               | [`02-GUEST_AND_PUBLIC_FLOWS.md`](02-GUEST_AND_PUBLIC_FLOWS.md)                                                                                                                                                                                                                                                                               |
| DG-08 | **Store / release** checklist for TestFlight & App Store / Play                                                                                          | **Addressed**                            | [`26-RELEASE_AND_STORE_READINESS.md`](26-RELEASE_AND_STORE_READINESS.md)                                                                                                                                                                                                                                                                     |

---

## B. Product / engineering gaps (customer)

| ID    | Gap                                                                           | Notes                                                                                                                                                                                                                                                          |
| ----- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-01 | **Two native Expo trees** (`theramate-ios-client` vs root `customer-app`)     | **Resolved** — Theramate = `theramate-ios-client` only; `customer-app` = Localito (see [`10-TWO_NATIVE_CODEBASES.md`](10-TWO_NATIVE_CODEBASES.md))                                                                                                             |
| PG-02 | **Mock data** on Explore/Bookings in `theramate-ios-client`                   | **Largely done** — Explore + Sessions use Supabase; polish in doc 13                                                                                                                                                                                           |
| PG-03 | **`app/booking/` stack**                                                      | **Partial** — full modal + PaymentSheet/Checkout; ongoing parity with web `BookingFlow`                                                                                                                                                                        |
| PG-04 | **Web mobile hamburger** filters client nav heavily                           | [`12-NAVIGATION_SHELL_AND_ENTRY_POINTS.md`](12-NAVIGATION_SHELL_AND_ENTRY_POINTS.md) — native should **not** replicate                                                                                                                                         |
| PG-05 | **Shared TypeScript types** package                                           | [`15-MOBILE_PLATFORM_READINESS.md`](15-MOBILE_PLATFORM_READINESS.md)                                                                                                                                                                                           |
| PG-06 | **Deep links / OAuth** configuration                                          | **Partial** — in-app handlers in `theramate-ios-client/lib/deepLinking.ts` + `_layout`; Dashboard + Universal Links / App Links verification still required ([`15`](15-MOBILE_PLATFORM_READINESS.md), [`23`](23-OAUTH_DEEP_LINKS_IMPLEMENTATION_CHECKLIST.md)) |
| PG-07 | **Orphan web pages** (`ClientBookings.tsx`, etc.)                             | [`01-WEB_ROUTES.md`](01-WEB_ROUTES.md) — confirm before native parity                                                                                                                                                                                          |
| PG-08 | **Font parity** — web uses **Inter**; `theramate-ios-client` loads **Outfit** | [`18-MOBILE_UI_UX_FOUNDATIONS_BMAD.md`](18-MOBILE_UI_UX_FOUNDATIONS_BMAD.md) — decide single family or role-based                                                                                                                                              |
| PG-09 | **Push** token storage + Edge trigger alignment                               | [`09-EMAIL_PUSH_AND_NOTIFICATIONS.md`](09-EMAIL_PUSH_AND_NOTIFICATIONS.md)                                                                                                                                                                                     |

---

## C. UX / design system gaps

| ID    | Gap                                                                                                      | Notes                                                     |
| ----- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| UX-01 | **Single source of truth** for color tokens (web Tailwind vs `theramate-ios-client/constants/colors.ts`) | Align semantic names; see doc 18                          |
| UX-02 | **Motion / animation** guidelines for RN (Reanimated) vs web                                             | Doc 18 proposes principles; formal spec in BMAD UX output |
| UX-03 | **Dark mode** — if web has dark theme, native must mirror or explicitly opt out                          | Audit `peer-care-connect` theme provider                  |
| UX-04 | **Accessibility** — WCAG targets for touch targets (min 44pt), contrast, `accessibilityLabel`            | Doc 18 + BMAD step 13                                     |

---

## D. How to close gaps

1. **Engineering:** Track in issue tracker with IDs (PG-xx).
2. **UX:** Run BMAD **`create-ux-design`** for a full UX spec artifact; link from this file.
3. **Docs:** Update this table when a gap closes; keep [`README.md`](README.md) index current.

---

## E. Optional / compliance (living)

| ID    | Topic                                                           | Status | Where                                                                                                                             |
| ----- | --------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| OC-01 | **PHI on device** — encryption, screenshots, reviewer narrative | Open   | Start from [`19-NATIVE_ANALYTICS_AND_OBSERVABILITY.md`](19-NATIVE_ANALYTICS_AND_OBSERVABILITY.md); legal review for health claims |
| OC-02 | **i18n**                                                        | Open   | Same as DG-05                                                                                                                     |
| OC-03 | **App Store / Play** submission assets                          | Open   | [`26-RELEASE_AND_STORE_READINESS.md`](26-RELEASE_AND_STORE_READINESS.md)                                                          |

---

## Build readiness (are we ready to build?)

**Onboarding:** [`00-JUNIOR_DEV_START_HERE.md`](00-JUNIOR_DEV_START_HERE.md) is the entry point for **junior developers** (reading order + mental model).

Documentation is **sufficient to start engineering** on the customer native app: backlog ([`16`](16-MOBILE_SCREENS_BUILD_LIST.md)), parity ([`05`](05-PARITY_MATRIX.md)), Supabase/realtime ([`06`](06-DATA_SUPABASE_REALTIME.md)), OAuth/deep links ([`23`](23-OAUTH_DEEP_LINKS_IMPLEMENTATION_CHECKLIST.md)), wireframes ([`24`](24-SCREEN_WIREFRAMES_AND_LAYOUTS.md)), and booking semantics ([`../features/booking-flows-reference.md`](../features/booking-flows-reference.md)).

**Before treating the product as “store launch-ready”**, still resolve: **PG-03** (booking parity edge cases), **PG-06** (deep links verified on device + Supabase redirect URLs), **DG-02** (design assets) as applicable, and [`26-RELEASE_AND_STORE_READINESS.md`](26-RELEASE_AND_STORE_READINESS.md). **PG-01** / **PG-02** are addressed for Theramate (`theramate-ios-client` + live data).

**Last reviewed:** 2026-03-26
