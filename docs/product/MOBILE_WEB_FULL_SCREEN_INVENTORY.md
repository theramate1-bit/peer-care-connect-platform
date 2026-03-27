# Mobile ↔ Web full screen & surface inventory

**Purpose:** Single map of routed surfaces, major embedded flows, mobile app shells, and where “wireframes” live—so Android/iOS work can stay aligned with the web app and Supabase.

**Generated:** 2026-03-26  
**Primary web app:** `peer-care-connect/` (React + Vite + `react-router-dom`)  
**Primary native shell:** `theramate-ios-client/` (Expo Router; targets **iOS + Android**)  
**Canonical route file:** `peer-care-connect/src/components/AppContent.tsx`

---

## Customer-app docs (client + guest only)

For a **scoped** set of markdown files (routes, parity matrix, native gaps, guest/client rules), use:

**[`docs/customer-app/README.md`](../customer-app/README.md)**

The Expo/native codebase that targets customers may also live under **`customer-app/`** at the repo root (see that folder’s `package.json`). Product documentation for the **customer journey** is intentionally under **`docs/customer-app/`** so it is not confused with app build artifacts.

The inventory below remains the **full product** map (practitioner + admin + client).

---

## How to read this document

- **Route** = user-navigable URL (`AppContent.tsx`) or Expo file route.
- **Screen / page file** = default export that owns most of the layout for that route.
- **Embedded logic** = heavy UI/business inside components (booking, messaging, SOAP, etc.)—mobile must match **database + RLS + Edge Functions**, not necessarily pixel layout.
- **Wireframes:** **Customer mobile** — text wireframes + Mermaid in [`docs/customer-app/24-SCREEN_WIREFRAMES_AND_LAYOUTS.md`](../customer-app/24-SCREEN_WIREFRAMES_AND_LAYOUTS.md) and screen IDs in [`25-SCREEN_REGISTRY_FOR_DESIGN.md`](../customer-app/25-SCREEN_REGISTRY_FOR_DESIGN.md). Older: no `*wireframe*` glob; web **`/design-system`**, `UI Assistant/` (see §5).

---

## Phase 1 — Web: every route in `AppContent.tsx`

Routes below are **authoritative** as of the scan. Wrappers: `SimpleProtectedRoute` (auth), `requireSubscription={true}` (practitioner subscription), `AuthenticatedLayout` (header + main).

### 1.1 Public & marketing

| Path                   | Page / component          | Notes                                 |
| ---------------------- | ------------------------- | ------------------------------------- |
| `/`                    | `Index`                   | Landing                               |
| `/how-it-works`        | `HowItWorks`              |                                       |
| `/client/how-it-works` | `ClientHowItWorks`        |                                       |
| `/pricing`             | `Pricing`                 |                                       |
| `/about`               | `About`                   |                                       |
| `/contact`             | `Contact`                 |                                       |
| `/help`                | `HelpCentre`              |                                       |
| `/terms`               | `TermsConditions`         |                                       |
| `/privacy`             | `PrivacyPolicy`           |                                       |
| `/cookies`             | `Cookies`                 |                                       |
| `/design-system`       | `DesignSystem`            | Internal design / component reference |
| `/explore`             | redirect → `/marketplace` | Legacy                                |

### 1.2 Booking & guest flows (often unauthenticated)

| Path                             | Page / component         | Notes                                           |
| -------------------------------- | ------------------------ | ----------------------------------------------- |
| `/book/:slug`                    | `DirectBooking`          | Practitioner booking link                       |
| `/guest/mobile-requests`         | `GuestMobileRequests`    | Guest mobile request flow                       |
| `/therapist/:therapistId/public` | `PublicTherapistProfile` | **Must stay before** protected `/therapist/:id` |
| `/booking-success`               | `BookingSuccess`         |                                                 |
| `/mobile-booking/success`        | `MobileBookingSuccess`   |                                                 |
| `/booking/view/:sessionId`       | `GuestBookingView`       |                                                 |
| `/booking/find`                  | `FindMyBooking`          |                                                 |
| `/review`                        | `GuestReview`            |                                                 |

### 1.3 Auth & onboarding

| Path                             | Page / component         | Notes              |
| -------------------------------- | ------------------------ | ------------------ |
| `/register`                      | `Register`               |                    |
| `/login`                         | `Login`                  |                    |
| `/reset-password`                | `ResetPassword`          |                    |
| `/auth/reset-password-confirm`   | `ResetPasswordConfirm`   |                    |
| `/auth/verify-email`             | `EmailVerification`      |                    |
| `/auth/registration-success`     | `RegistrationSuccess`    |                    |
| `/auth/callback`                 | `AuthCallback`           | OAuth / magic link |
| `/auth/role-selection`           | `RoleSelection`          | Protected          |
| `/auth/oauth-completion`         | `OAuthCompletion`        | Protected          |
| `/onboarding`                    | `Onboarding`             | Protected          |
| `/subscription-success`          | `SubscriptionSuccess`    | Protected          |
| `/onboarding/stripe-return`      | `StripeReturn`           | Protected          |
| `/auth/google-calendar-callback` | `GoogleCalendarCallback` |                    |

### 1.4 Practitioner (subscription-required where noted)

| Path                           | Page / component       | Subscription          |
| ------------------------------ | ---------------------- | --------------------- |
| `/dashboard`                   | `Dashboard`            | Required              |
| `/find-therapists`             | `FindTherapists`       |                       |
| `/bookings`                    | `MyBookings`           | Required              |
| `/offer-services`              | `OfferServices`        | Required              |
| `/credits`                     | `Credits`              | Required              |
| `/profile/create`              | `CreateProfile`        | Required              |
| `/profile/edit`                | `EditProfile`          | Required              |
| `/therapist/:therapistId`      | `ViewProfile`          | Required (non-public) |
| `/reviews`                     | `Reviews`              | Required              |
| `/reviews/submit/:sessionId`   | `SubmitReview`         | Required              |
| `/messages`                    | `RealTimeMessaging`    |                       |
| `/settings`                    | `SettingsProfile`      |                       |
| `/settings/privacy`            | `SettingsPrivacyTools` |                       |
| `/settings/subscription`       | `SettingsSubscription` |                       |
| `/projects`                    | `Projects`             | Required              |
| `/dashboard/projects`          | `DashboardProjects`    | Required              |
| `/practice/treatment-projects` | `DashboardProjects`    | Required              |
| `/dashboard/projects/create`   | `CreateProject`        | Required              |
| `/analytics`                   | `AnalyticsDashboard`   | Required              |
| `/analytics/reports`           | `AdvancedReports`      | Required              |
| `/marketplace`                 | `Marketplace`          | Public + logged-in    |
| `/payments/connect`            | `ConnectAccount`       | Required              |
| `/booking`                     | `BookingDashboard`     | Required              |
| `/cpd`                         | `CPDInfo`              | Required              |
| `/notifications`               | `Notifications`        |                       |

### 1.5 Practice management (`/practice/*`)

| Path                                           | Page / component                     | Notes                                  |
| ---------------------------------------------- | ------------------------------------ | -------------------------------------- |
| `/practice`, `/practice/dashboard`             | `Dashboard`                          |                                        |
| `/practice/schedule`                           | `PracticeSchedule`                   | Diary / schedule                       |
| `/sessions/:sessionId/notes`                   | `SessionNotesRedirect`               | Redirects to clients + treatment notes |
| `/practice/clients`                            | `PracticeClientManagement`           | Client management                      |
| `/practice/scheduler`                          | `ServicesManagement`                 | Services & scheduler                   |
| `/practice/mobile-requests`                    | `MobileRequests`                     | Practitioner mobile requests           |
| `/practice/notes`, `/practice/treatment-notes` | `PracticeClientManagement`           | Same hub                               |
| `/practice/sessions/:sessionId`                | `SessionDetailView`                  | Session detail                         |
| `/practice/clinical-files`                     | `EnhancedTreatmentNotes`             |                                        |
| `/practice/treatment-plans`                    | `TreatmentPlans`                     |                                        |
| `/practice/peer-treatment`                     | Navigate → `/credits#peer-treatment` |                                        |
| `/practice/treatment-exchange`                 | Navigate → `/credits`                |                                        |
| `/practice/exchange-requests`                  | `ExchangeRequests`                   | Treatment exchange                     |
| `/practice/billing`                            | `Billing`                            |                                        |
| `/practice/analytics`                          | `BusinessAnalytics`                  |                                        |
| `/practice/calendar`                           | `CalendarSettings`                   |                                        |

### 1.6 Client app (`/client/*`)

| Path                      | Page / component                        | Notes                |
| ------------------------- | --------------------------------------- | -------------------- |
| `/client/dashboard`       | `ClientDashboard`                       |                      |
| `/client/booking`         | `ClientBooking`                         |                      |
| `/client/profile`         | `ClientProfile`                         |                      |
| `/client/sessions`        | `MySessions`                            | Sessions + notes tab |
| `/client/progress`        | `ClientProgress`                        |                      |
| `/client/goals`           | `ClientGoals`                           |                      |
| `/client/exercises`       | `MyExercises`                           |                      |
| `/client/mobile-requests` | `ClientMobileRequests`                  |                      |
| `/client/messages`        | `RealTimeMessaging`                     |                      |
| `/client/notes`           | redirect → `/client/sessions?tab=notes` |                      |
| `/client/plans`           | `ClientTreatmentPlans`                  |                      |
| `/client/favorites`       | `ClientFavorites`                       |                      |

### 1.7 Universal profile

| Path       | Page / component  | Logic                                                                            |
| ---------- | ----------------- | -------------------------------------------------------------------------------- |
| `/profile` | `ProfileRedirect` | `client` → `ClientProfile`; practitioner roles → `Profile`; else fallback client |

### 1.8 Admin & errors

| Path                  | Page / component             |
| --------------------- | ---------------------------- |
| `/admin/verification` | `AdminVerificationDashboard` |
| `/unauthorized`       | `Unauthorized`               |
| `*`                   | `NotFound`                   |

---

## Phase 2 — Web: `src/pages` files vs routes

All page modules live under `peer-care-connect/src/pages/`. Many are **only** imported from `AppContent.tsx`; others are **nested** (e.g. `ClientProfile` inside `ProfileRedirect`) or **legacy / unused**.

**Confirmed routed:** See Phase 1 (derived from `AppContent.tsx`).

**Present on disk but not listed as a top-level route in `AppContent.tsx` (candidates for cleanup or internal use):**

- `pages/client/ClientBookings.tsx`
- `pages/booking/BookingCancel.tsx`
- `pages/practitioner/PractitionerBookings.tsx`
- `pages/practice/AppointmentScheduler.tsx`
- `pages/practice/SessionRecording.tsx`
- `pages/practice/ClientManagement.tsx` (imported in `AppContent.tsx` historically—verify; **not** in route table above)
- `pages/practice/TreatmentNotes.tsx` (may be superseded by `PracticeClientManagement` / enhanced notes)
- `pages/auth/VerifyEmail.tsx` (parallel to `EmailVerification.tsx`)
- `pages/public/PublicMarketplace_backup.tsx`
- `pages/analytics/Analytics.tsx` (vs `AnalyticsDashboard` route)
- `pages/payments/PaymentDemo.tsx`

**Action for mobile:** Do not implement parity for **unrouted** files until product confirms they are dead or folded into another screen.

---

## Phase 3 — Native: `theramate-ios-client` (Expo Router)

**Stack:** `app/_layout.tsx` → `StripeProvider`, React Query, auth init; `Stack` registers `(auth)`, `(tabs)`, and a **`booking` modal** group in code.

### 3.1 File-system routes (file-based)

| Route group | File                                  | Role                                                                                                   |
| ----------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Auth        | `app/(auth)/login.tsx`                | Login                                                                                                  |
| Auth layout | `app/(auth)/_layout.tsx`              | Auth stack                                                                                             |
| Tabs        | `app/(tabs)/index.tsx`                | Home                                                                                                   |
| Tabs        | `app/(tabs)/explore/index.tsx`        | Explore / discovery                                                                                    |
| Tabs        | `app/(tabs)/bookings/index.tsx`       | Sessions                                                                                               |
| Tabs        | `app/(tabs)/messages/index.tsx`       | Messages                                                                                               |
| Tabs        | `app/(tabs)/profile/index.tsx`        | Profile                                                                                                |
| Modal       | `booking` (declared in `_layout.tsx`) | **No `app/booking/` files in repo yet**—add Expo route files when implementing the booking modal flow. |

**Verified file list (2026-03-26):** only the files above exist under `theramate-ios-client/app/`; no `booking` subtree.

**Gap vs web:** Native currently implements a **small client subset** (home, explore, bookings, messages, profile, login). Practitioner dashboards, practice management, credits, treatment exchange, admin, and most guest URLs are **web-only** unless duplicated here.

---

## Phase 4 — Other workspaces (same repo)

| Area                 | Path                                                                   | Role for mobile alignment                                                                                                               |
| -------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Root Next.js app** | `src/app/` (`page.tsx`, `layout.tsx`, API routes under `src/app/api/`) | Separate **video / tooling** surface—not Theramate product navigation. Treat as out-of-scope for Theramate mobile parity unless merged. |
| **Vercel / API**     | `api/`                                                                 | Proxies (e.g. Stripe Connect JS); **not** a screen map.                                                                                 |
| **Backend**          | `backend/`                                                             | Mostly **tests** in this snapshot—not a second HTTP API surface for the app.                                                            |
| **Supabase**         | `supabase/functions/`                                                  | **Server-side** contract for email, payments, webhooks—mobile must call the same functions/patterns as web.                             |
| **Agent context**    | `agent-context/`                                                       | Optional local services—not user screens.                                                                                               |

---

## Phase 5 — Wireframes, captures, and design references

| Asset                                             | Location                                                                                                                                                                                               | What it is                                                                                                                                                                                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Screen capture list (77 “screens”)**            | `capture-all-screens.js`                                                                                                                                                                               | Ordered list of paths for QA/screenshots; **some paths differ** from current `AppContent.tsx` (e.g. `/settings/payouts`, `/payments` are listed in the script but **not** in `AppContent` as scanned). Use **`AppContent.tsx` as source of truth** for routes. |
| **Design system (web)**                           | Route `/design-system` → `DesignSystem.tsx`                                                                                                                                                            | Live component reference—not wireframes.                                                                                                                                                                                                                       |
| **UI Assistant**                                  | `UI Assistant/UI Assistant/*.md`                                                                                                                                                                       | Generic Framer/UX patterns (layout, motion, forms)—**not** Theramate-specific wireframes.                                                                                                                                                                      |
| **Product docs**                                  | `docs/features/`, `docs/product/`                                                                                                                                                                      | Flows, audits, and rules (e.g. guest vs client, hybrid mobile)—use for **logic parity**, not pixel wireframes.                                                                                                                                                 |
| **Customer mobile wireframes (ASCII + registry)** | [`docs/customer-app/24-SCREEN_WIREFRAMES_AND_LAYOUTS.md`](../customer-app/24-SCREEN_WIREFRAMES_AND_LAYOUTS.md), [`25-SCREEN_REGISTRY_FOR_DESIGN.md`](../customer-app/25-SCREEN_REGISTRY_FOR_DESIGN.md) | Native layouts until Figma frames exist; **SCR-\*** IDs for design handoff.                                                                                                                                                                                    |

**Figma / PNG wireframes:** Paste frame URLs into [`docs/customer-app/25-SCREEN_REGISTRY_FOR_DESIGN.md`](../customer-app/25-SCREEN_REGISTRY_FOR_DESIGN.md) when available; link that file here as the addendum.

---

## Phase 6 — Cross-cutting logic (web + future mobile)

| Concern                | Where it lives                                                 | Mobile implication                                                                    |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Auth session**       | Supabase Auth; web `AuthContext` + `AuthRouter`                | Same project URL + anon key; secure storage on native; deep links for OAuth.          |
| **Route guards**       | `SimpleProtectedRoute`, `AuthRouter`                           | Replicate with **role-based navigation** + protected stacks in Expo.                  |
| **Subscription**       | `requireSubscription` on many practitioner routes              | **Gate** practitioner features on mobile the same way (or via profile flags from DB). |
| **Role / profile**     | `users` + app profile tables; `ProfileRedirect` pattern        | Single app vs two apps: **role** drives tabs and stacks.                              |
| **Messaging**          | `RealTimeMessaging` on `/messages` and `/client/messages`      | Same Supabase Realtime + RLS.                                                         |
| **Payments**           | Stripe (Connect, Checkout, PaymentSheet on native)             | Edge Functions + webhooks; **no** client-only secrets.                                |
| **Email / SMS**        | Edge Functions + `email_logs` / `sms_logs`                     | Triggered server-side; mobile **events** (book, message) must match web triggers.     |
| **Guest vs client**    | Documented in `docs/development/GUEST_VS_CLIENT_RULES.md` etc. | Must match **pre_assessment**, booking, and cancellation rules.                       |
| **Practitioner types** | clinic / mobile / hybrid in product docs + DB                  | Diary, `mobile_booking_requests`, marketplace modes—align RPC usage.                  |

---

## Phase 7 — Suggested parity phases (mobile backlog)

Work in **product slices**, not “all screens at once.”

| Phase    | Scope                                              | Web routes / areas                                                                  |
| -------- | -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **P7.1** | Auth + profile + role selection                    | §1.3, `/profile`, `/client/profile`                                                 |
| **P7.2** | Client marketplace + booking + success             | `/marketplace`, `/book/:slug`, `/booking-success`, `/client/booking`                |
| **P7.3** | Client sessions, notes, progress, goals, exercises | `/client/sessions`, tabs, goals, exercises                                          |
| **P7.4** | Messaging + notifications                          | `/messages` or `/client/messages`, `/notifications`                                 |
| **P7.5** | Practitioner dashboard + diary + bookings          | `/dashboard`, `/practice/schedule`, `/bookings`                                     |
| **P7.6** | Practice clients + SOAP / clinical                 | `/practice/clients`, session detail, clinical files                                 |
| **P7.7** | Credits + treatment exchange + billing             | `/credits`, `/practice/exchange-requests`, `/practice/billing`, `/payments/connect` |
| **P7.8** | Admin + verification                               | `/admin/verification`                                                               |
| **P7.9** | Guest-only flows                                   | §1.2 guest routes                                                                   |

---

## Appendix A — `capture-all-screens.js` vs `AppContent.tsx`

- **Script:** `capture-all-screens.js` lists **77** screens for UX audit capture.
- **Drift:** Entries such as `/settings/payouts`, `/payments` may **not** reflect current routes. **Always prefer `AppContent.tsx`** when planning implementation.
- **404:** Script references `/404`; router uses `*` → `NotFound`.

---

## Appendix B — Maintenance

When adding a route:

1. Update `AppContent.tsx` (and `AuthRouter` / `publicRoutes` if needed).
2. Add a row to **Phase 1** in this doc (or generate from router).
3. Add mobile parity row in **Phase 7** when the feature is planned for native.

---

_End of inventory — extend with Figma links or screenshots when available._
