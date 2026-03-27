# Customer app parity matrix (web ↔ native)

Use this as a **living checklist**. Mark cells: **Done** | **Partial** | **N/A** | **Blocked**.

**Platform-level status** (backend, types, Stripe, deep links): [`15-MOBILE_PLATFORM_READINESS.md`](15-MOBILE_PLATFORM_READINESS.md).

## Legend

- **Web** = `peer-care-connect` route or embedded flow
- **Native** = `theramate-ios-client` (Expo)

## Core journeys

| Feature                 | Web                               | Native                                   | Notes                                                                                                             |
| ----------------------- | --------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Email/password login    | `/login`                          | `(auth)/login`                           | OAuth: `theramate://oauth-callback` + `AuthCallback` handling in root `_layout`                                   |
| Session persistence     | Supabase + localStorage           | SecureStore                              |                                                                                                                   |
| Client home / dashboard | `/client/dashboard`               | `(tabs)/index`                           | Native is simplified UI                                                                                           |
| Marketplace / search    | `/marketplace`, `/client/booking` | `(tabs)/explore`                         | **Partial** — live list + detail + `/booking` modal (`lib/api/marketplace.ts`)                                    |
| Book clinic slot        | `BookingFlow`                     | `/booking` modal                         | **Partial** — RPC + Stripe PaymentSheet or Checkout URL (`lib/api/booking.ts`); edge-case parity with web ongoing |
| Mobile request          | `MobileBookingRequestFlow`        | `/booking/mobile-request`, `choose-mode` | **Partial** — native screens exist; verify all hybrid rules vs web                                                |
| Guest direct book       | `/book/:slug`                     | `/book/[slug]`                           | HTTPS + custom scheme deep links → `lib/deepLinking.ts`                                                           |
| My sessions             | `/client/sessions`                | `(tabs)/bookings`                        | **Partial** — live list + detail + actions; advanced filters vs web                                               |
| Messages                | `/client/messages`                | `(tabs)/messages`                        | Realtime                                                                                                          |
| Profile                 | `/client/profile`                 | `(tabs)/profile`                         |                                                                                                                   |
| Notifications           | `/notifications`                  | `/notifications`                         | In-app list + push hooks (`usePushNotifications`); **Partial** — full parity with web bell                        |
| Favorites               | `/client/favorites`               | —                                        | Not in native (by design; see doc 13)                                                                             |
| Progress / goals        | `/client/progress`, `/goals`      | `profile/progress-goals`                 | **Partial** — CRUD; advanced charts optional                                                                      |
| Exercises / HEP         | `/client/exercises`               | `profile/exercises`                      | **Partial**                                                                                                       |
| Treatment plans         | `/client/plans`                   | `profile/treatment-plans`                | **Partial** — read-focused                                                                                        |
| Mobile request status   | `/client/mobile-requests`         | `profile/mobile-requests`                | **Partial**                                                                                                       |
| Guest find booking      | `/booking/find`                   | `/booking/find`                          | Deep links in `lib/deepLinking.ts`                                                                                |
| Guest session view      | `/booking/view/:id`               | `/booking/view/[sessionId]`              | Deep links                                                                                                        |
| Guest review            | `/review`                         | `/review`                                | Params via deep link                                                                                              |
| Pre-assessment          | Embedded in booking               | Steps in `/booking` modal                | **Partial** — match web rules as you add fields                                                                   |

## Non-functional

| Concern        | Web                        | Native                |
| -------------- | -------------------------- | --------------------- |
| Analytics      | `RouteChangeTracker`, etc. | Add screen events     |
| Error handling | Toasts                     | Native toast / alerts |
| Accessibility  | Web a11y                   | RN a11y props         |

## Phase order (suggested)

1. Auth + profile + tab shell
2. Sessions + bookings tab (read state from Supabase)
3. Marketplace + booking (happy path)
4. Mobile requests + hybrid rules
5. Messages (Realtime)
6. Guest deep links + find booking
7. Progress / goals / exercises

Update this table as each row moves to **Done**.
