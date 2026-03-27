# Mobile customer app — screens to build (canonical list)

Derived from web routes (`AppContent.tsx`), guest flows, and [`05-PARITY_MATRIX.md`](05-PARITY_MATRIX.md). Use this as the **backlog** for native UI; implementation can use **tabs + stack + modals** — not every row must be a separate route file.

**Legend:** **P0** = launch-critical · **P1** = soon after · **P2** = parity / polish · **Deep link** = must handle URL even if thin wrapper

---

## A. Authentication & account entry

| #   | Screen                                                    | Web reference                  | Priority |
| --- | --------------------------------------------------------- | ------------------------------ | -------- |
| A1  | **Login** (email/password + link to register)             | `/login`                       | P0       |
| A2  | **Register**                                              | `/register`                    | P0       |
| A3  | **Forgot password** (request reset)                       | `/reset-password`              | P1       |
| A4  | **Set new password** (token from email)                   | `/auth/reset-password-confirm` | P1       |
| A5  | **Email verification**                                    | `/auth/verify-email`           | P1       |
| A6  | **Registration success**                                  | `/auth/registration-success`   | P1       |
| A7  | **Auth callback** (OAuth / magic link handler)            | `/auth/callback`               | P0       |
| A8  | **Role selection** (choose **client**)                    | `/auth/role-selection`         | P0       |
| A9  | **OAuth completion** (post-provider)                      | `/auth/oauth-completion`       | P1       |
| A10 | **Onboarding** (client practitioner onboarding as on web) | `/onboarding`                  | P1       |
| A11 | **Stripe return** (if onboarding opens Stripe)            | `/onboarding/stripe-return`    | P2       |

---

## B. Core shell (tabs — suggested)

| #   | Screen                                                         | Web reference                      | Priority |
| --- | -------------------------------------------------------------- | ---------------------------------- | -------- |
| B1  | **Home / Client dashboard** (upcoming, stats, timeline CTA)    | `/client/dashboard`                | P0       |
| B2  | **Sessions** (list, filters, notes, rebooking entry)           | `/client/sessions`                 | P0       |
| B3  | **Explore / Marketplace** (search, practitioner list, filters) | `/marketplace` + `/client/booking` | P0       |
| B4  | **Messages**                                                   | `/client/messages`                 | P0       |
| B5  | **Profile** (client profile + edit)                            | `/client/profile`                  | P0       |

---

## C. Authenticated — secondary (stack, “More”, or nested tabs)

| #   | Screen                                                           | Web reference             | Priority |
| --- | ---------------------------------------------------------------- | ------------------------- | -------- |
| C1  | **Notifications**                                                | `/notifications`          | P1       |
| C2  | **Settings — account & preferences**                             | `/settings`               | P1       |
| C3  | **Settings — privacy & tools**                                   | `/settings/privacy`       | P2       |
| C4  | **Settings — subscription** (platform billing, if client-facing) | `/settings/subscription`  | P2       |
| C5  | **Progress** (metrics / tracker)                                 | `/client/progress`        | P1       |
| C6  | **Goals**                                                        | `/client/goals`           | P1       |
| C8  | **My exercises / HEP**                                           | `/client/exercises`       | P1       |
| C9  | **Treatment plans**                                              | `/client/plans`           | P2       |
| C10 | **Mobile booking requests** (status list)                        | `/client/mobile-requests` | P1       |
| C11 | **Find therapists** (if not merged into Explore)                 | `/find-therapists`        | P2       |

---

## D. Booking & checkout (flows — often stack/modal, not one screen)

| #   | Screen / flow                                                   | Web reference                               | Priority |
| --- | --------------------------------------------------------------- | ------------------------------------------- | -------- |
| D1  | **Practitioner detail** (from list)                             | marketplace + `PublicProfileModal` patterns | P0       |
| D2  | **Booking flow — clinic** (slots, service, pre-assessment, pay) | `BookingFlow`                               | P0       |
| D3  | **Booking flow — mobile request**                               | `MobileBookingRequestFlow`                  | P1       |
| D4  | **Hybrid chooser** (clinic vs mobile)                           | `HybridBookingChooser`                      | P1       |
| D5  | **Payment / PaymentSheet** (Stripe RN)                          | aligns with Edge Functions                  | P0       |
| D6  | **Booking success**                                             | `/booking-success`                          | P0       |
| D7  | **Mobile booking success**                                      | `/mobile-booking/success`                   | P1       |
| D8  | **Pre-assessment** (embedded steps; match web rules)            | in booking                                  | P0       |

---

## E. Guest & deep-link (often WebView fallback OK for v1)

| #   | Screen                       | Web reference              | Priority |
| --- | ---------------------------- | -------------------------- | -------- |
| E1  | **Direct booking by slug**   | `/book/:slug`              | P1       |
| E2  | **Public therapist profile** | `/therapist/:id/public`    | P1       |
| E3  | **Find my booking** (lookup) | `/booking/find`            | P1       |
| E4  | **Guest session view**       | `/booking/view/:sessionId` | P1       |
| E5  | **Guest review**             | `/review`                  | P2       |
| E6  | **Guest mobile requests**    | `/guest/mobile-requests`   | P2       |

---

## F. Marketing / optional native (often WebView or skip v1)

| #   | Screen                     | Web reference                                         | Priority |
| --- | -------------------------- | ----------------------------------------------------- | -------- |
| F1  | **Landing**                | `/`                                                   | P2       |
| F2  | **How it works (client)**  | `/client/how-it-works`                                | P2       |
| F3  | **Pricing**                | `/pricing`                                            | P2       |
| F4  | **Help / contact / legal** | `/help`, `/contact`, `/terms`, `/privacy`, `/cookies` | P2       |

---

## G. System / non-UI (not “screens” but required)

| #   | Item                                                  | Notes                                 |
| --- | ----------------------------------------------------- | ------------------------------------- |
| G1  | **Push notification** handling (open relevant screen) | ties to `/notifications` + deep links |
| G2  | **Offline / error** states                            | global                                |
| G3  | **Force update / optional** EAS update UI             | ops                                   |

---

## Count summary

| Bucket                 | Approx. distinct surfaces |
| ---------------------- | ------------------------- |
| A Auth                 | 11                        |
| B Tabs                 | 5                         |
| C Secondary            | 11                        |
| D Booking flows        | 8 (multi-step)            |
| E Guest / deep link    | 6                         |
| F Marketing            | 4+                        |
| **Total screen names** | **~45** excluding G       |

Many can be **combined** (e.g. one **Settings** stack with sub-screens; **Progress + Goals** as tabs inside one **Progress** area).

---

## Suggested build order (matches [`05-PARITY_MATRIX.md`](05-PARITY_MATRIX.md))

1. A1, A7, A8, B1–B5 (shell + auth)
2. D2, D5, D6, D8 (happy-path book + pay)
3. B2 depth (sessions + notes)
4. B3 depth (real marketplace data)
5. C1, C10, D3, D4 (mobile + notifications)
6. C5–C9, C2–C4
7. E\* deep links
8. F\* optional

---

## Revision

Bump this list when web adds routes in `AppContent.tsx`.

---

## Current implementation snapshot (2026-03-26)

Done now in `theramate-ios-client`:

- Core shell: Home, Explore, Sessions, Messages, Profile
- Booking modal flow (clinic) with availability slots + RPC + Stripe Checkout URL
- Session detail actions (message therapist, rebook, cancel, leave review)
- Reviews: submit review, my reviews list, recent public snippets on therapist detail
- Progress & Goals basic flow (create/list/status)
- Profile edit + notification preferences
- Profile secondary settings: Help Centre, Privacy & Security, Settings
- Guest/deep-link surfaces: `/book/:slug`, `/therapist/:id/public`, `/booking/find`, `/booking/view/:sessionId`
- Push registration/token sync + deep-link routing from notification taps
- **Deep links:** `lib/deepLinking.ts` maps `theramate://` and `https://theramate.com` / `www` to booking success, mobile pending/success, review, notifications, onboarding Stripe return, guest mobile-requests; legacy `/booking-success` fallback kept in root layout
- **Universal Links (app config):** `app.json` includes iOS `associatedDomains` (`applinks:theramate.com`, `www`) and Android `intentFilters` for HTTPS — **you must** host `apple-app-site-association` / Digital Asset Links on those hosts and run EAS builds to verify
- **Env:** `EXPO_PUBLIC_WEB_URL` in `.env.example` (optional override of default web origin for link matching)

Still to do (ops / backend — not missing screens):

- **Deploy** `stripe-payment` Edge Function to production and confirm PaymentSheet + Checkout with live keys
- **Host** AASA + `assetlinks.json` on production domains matching `associatedDomains` / intent filter hosts (add staging hosts to `app.json` if you use a staging web URL)
- **EAS:** Set real `expo.extra.eas.projectId` after `eas init`
- **Device QA:** Physical-device pass for OAuth return, Stripe Checkout return URLs, PaymentSheet 3DS, push tap → screen
- **Notifications payload contract:** Ensure server sends `screen` / `route` keys aligned with `usePushNotifications` (`notifications`, `mobile_requests`, etc.)
- Optional: F\* full native marketing (currently opens web via thin routes)
