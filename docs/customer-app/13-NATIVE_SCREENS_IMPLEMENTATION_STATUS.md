# Native screens — implementation status (`theramate-ios-client`)

**Path:** `theramate-ios-client/` (Expo Router)  
**Source of truth for files:** `app/` directory.

This doc compares **what exists in code** to the **web client** experience.

---

## Route files (Expo)

| File                                    | Screen                | Data source (as of code review)                                                                                                       |
| --------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(auth)/login.tsx`                  | Login                 | Real auth via `authStore` / Supabase                                                                                                  |
| `app/(tabs)/index.tsx`                  | Home                  | **Supabase** — next upcoming session (`useClientSessions`) + suggested practitioners (`useMarketplacePractitioners`); pull-to-refresh |
| `app/(tabs)/explore/index.tsx`          | Explore               | **Supabase** — `lib/api/marketplace.ts` (`users` + `practitioner_products` + `reviews`)                                               |
| `app/(tabs)/bookings/index.tsx`         | Sessions              | **Supabase** — `lib/api/clientSessions.ts` when logged in; sign-in prompt when not                                                    |
| `app/(tabs)/messages/index.tsx`         | Messages list         | **Supabase** — `lib/api/conversations.ts` (`fetchConversationSummaries`)                                                              |
| `app/(tabs)/messages/[id].tsx`          | Message thread        | **Supabase** — `lib/api/messages.ts` + realtime `INSERT`                                                                              |
| `app/(tabs)/profile/index.tsx`          | Profile               | `users` via `authStore`; version from `expo-constants`                                                                                |
| `app/(tabs)/profile/edit-profile.tsx`   | Edit profile          | Updates `users` via `updateProfile`                                                                                                   |
| `app/(tabs)/profile/notifications.tsx`  | Notification settings | Updates `users.preferences` toggles                                                                                                   |
| `app/(tabs)/profile/my-reviews.tsx`     | My reviews            | **Supabase** — `reviews` joined to therapist names                                                                                    |
| `app/(tabs)/profile/progress-goals.tsx` | Progress & goals      | **Supabase** — `progress_goals` create/list/status                                                                                    |
| `app/(tabs)/bookings/[id].tsx`          | Session detail        | **Supabase** — session detail + actions (message/rebook/cancel/review)                                                                |
| `app/(tabs)/bookings/review.tsx`        | Leave review          | **Supabase** — `reviews` create + duplicate guard                                                                                     |

---

## Booking modal

`app/_layout.tsx` registers **`booking`** as a modal. **`app/booking/index.tsx`** — pick `practitioner_products`, date, time; times from **`availability_slots`**; then **`create_booking_with_validation`** RPC + **`stripe-payment`** Edge Function. **Stripe:** prefers **PaymentSheet** when the Edge Function returns `paymentIntentClientSecret`; otherwise opens **Checkout** via `Linking.openURL` (same backend path as web). Pre-assessment steps are in-app; full intake parity with web `BookingFlow` can follow.

**Deep links (HTTPS + `theramate://`):** `book/*`, `booking/find`, `booking/view/*` are mapped in **`lib/deepLinking.ts`** (see also [`23-OAUTH_DEEP_LINKS_IMPLEMENTATION_CHECKLIST.md`](23-OAUTH_DEEP_LINKS_IMPLEMENTATION_CHECKLIST.md)).

## EAS (iOS / Android)

- **`theramate-ios-client/eas.json`** — `development`, `preview`, and `production` profiles.
- Set a real project id: run `eas init` (or paste the project UUID from Expo) into `app.json` → `expo.extra.eas.projectId` (replace `your-eas-project-id`).
- Build: `npm run build:ios` / `eas build --platform android` from `theramate-ios-client` (with env: `EXPO_PUBLIC_SUPABASE_*`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`, etc.).
- Push notifications: Expo registration + token sync is wired in app bootstrap (`hooks/usePushNotifications.ts`, `lib/notifications.ts`) and stores token in `users.preferences.expo_push_token`.

## Explore stack

**`app/(tabs)/explore/_layout.tsx`** + **`[id].tsx`** — practitioner detail → opens `/booking` with `practitionerId`; includes recent public review snippets from `reviews`.

---

## Gap summary vs web

| Web screen                 | Native equivalent         | Gap                                                                                                  |
| -------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `ClientDashboard`          | `(tabs)/index`            | Next session + suggestions live; no full timeline / stats parity yet                                 |
| `Marketplace`              | `(tabs)/explore`          | List + detail: live data; optional geo parity later                                                  |
| `MySessions`               | `(tabs)/bookings`         | Live list + detail + rebook + cancel + review; advanced filters/notes parity still pending           |
| `RealTimeMessaging`        | `(tabs)/messages`         | List + thread + insert subscription; encryption/advanced parity if web adds it                       |
| `ClientBooking`            | `/booking` modal          | Clinic flow: RPC + PaymentSheet or Checkout URL; full pre-assessment/intake parity with web optional |
| `ClientProgress` / `Goals` | `profile/progress-goals`  | Basic CRUD/status done; advanced metric charts/parity pending                                        |
| `MyExercises`              | `profile/exercises`       | List/detail + completion tracking in place; advanced metrics/parity pending                          |
| `ClientFavorites`          | —                         | Not planned (review-led discovery)                                                                   |
| `ClientMobileRequests`     | `profile/mobile-requests` | List/detail in place; guest route parity still pending                                               |
| `ClientTreatmentPlans`     | `profile/treatment-plans` | List/detail in place; advanced edits/authoring not in client app                                     |

---

## Repo-root `customer-app/` (not Theramate)

The folder **`customer-app/`** at the repository root is **Localito Marketplace**, not this app. **Theramate** native work is only in **`theramate-ios-client/`** — see [`10-TWO_NATIVE_CODEBASES.md`](10-TWO_NATIVE_CODEBASES.md).

---

## Action list (engineering)

1. ~~Remove **mock** arrays from Explore and Bookings~~ — **done** (Supabase queries in `lib/api/`).
2. Share query helpers with web via a future `packages/shared` or keep `lib/api` in sync manually.
3. ~~Replace **booking** placeholder~~ — **done** (RPC + Checkout URL + **PaymentSheet** when server returns secrets).
4. ~~Add **Goals / Progress** to secondary stack~~ — **done** (`profile/progress-goals`).
5. ~~Add **Exercises / Treatment Plans / Mobile Requests** screens~~ — **done**.
6. ~~Add guest secondary routes (`/review`, `/guest/mobile-requests`)~~ — **done**.
7. ~~Guest HTTPS deep links (`/book/*`, `/booking/find`, `/booking/view/*`)~~ — **done** in `lib/deepLinking.ts`; verify Universal Links on device.
8. Add marketing WebView strategy (landing/how-it-works/pricing/contact) only if product wants in-app marketing instead of Safari.
