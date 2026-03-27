# Guest and public customer flows

Most routes below are **public** (no login). **Auth** is split: **public** (register, login, reset, verify) vs **session required** (role selection, onboarding, OAuth completion) — both need **deep-link** coverage on native.

**Source:** `peer-care-connect/src/components/AppContent.tsx`

## Public marketing (client-oriented)

| Path                   | Page               | Mobile note            |
| ---------------------- | ------------------ | ---------------------- |
| `/`                    | `Index`            | Landing                |
| `/client/how-it-works` | `ClientHowItWorks` |                        |
| `/pricing`             | `Pricing`          |                        |
| `/marketplace`         | `Marketplace`      | Works logged out or in |

## Discovery and booking

| Path                             | Page                      | Purpose                          |
| -------------------------------- | ------------------------- | -------------------------------- |
| `/explore`                       | Redirect → `/marketplace` | Legacy                           |
| `/book/:slug`                    | `DirectBooking`           | Direct practitioner booking link |
| `/therapist/:therapistId/public` | `PublicTherapistProfile`  | Shareable profile                |

## Post-booking and lookup

| Path                       | Page                   | Purpose                       |
| -------------------------- | ---------------------- | ----------------------------- |
| `/booking-success`         | `BookingSuccess`       | After payment / confirmation  |
| `/mobile-booking/success`  | `MobileBookingSuccess` | Mobile-specific success       |
| `/booking/view/:sessionId` | `GuestBookingView`     | View session from email link  |
| `/booking/find`            | `FindMyBooking`        | Lookup without full dashboard |

## Guest mobile requests (unauthenticated)

| Path                     | Page                  |
| ------------------------ | --------------------- |
| `/guest/mobile-requests` | `GuestMobileRequests` |

## Reviews

| Path      | Page          |
| --------- | ------------- |
| `/review` | `GuestReview` |

## Auth — public (no `SimpleProtectedRoute`)

| Path                           | Page                   | Build ref |
| ------------------------------ | ---------------------- | --------- |
| `/register`                    | `Register`             | A2        |
| `/login`                       | `Login`                | A1        |
| `/reset-password`              | `ResetPassword`        | A3        |
| `/auth/reset-password-confirm` | `ResetPasswordConfirm` | A4        |
| `/auth/verify-email`           | `EmailVerification`    | A5        |
| `/auth/registration-success`   | `RegistrationSuccess`  | A6        |
| `/auth/callback`               | `AuthCallback`         | A7        |

## Auth — session required (`SimpleProtectedRoute`)

These still need **deep-link handling** on native when the app opens from email or returns from OAuth/Stripe.

| Path                        | Page                                | Build ref |
| --------------------------- | ----------------------------------- | --------- |
| `/auth/role-selection`      | `RoleSelection` — choose **client** | A8        |
| `/auth/oauth-completion`    | `OAuthCompletion`                   | A9        |
| `/onboarding`               | `Onboarding`                        | A10       |
| `/onboarding/stripe-return` | `StripeReturn`                      | A11       |
| `/subscription-success`     | `SubscriptionSuccess`               | —         |

**Practitioner-only callback (deep link if same app binary):** `/auth/google-calendar-callback` — not customer-app scope; include only if one binary serves all roles.

## Deep link checklist (native)

When implementing the customer native app:

1. **Universal Links / App Links** — at minimum: `/book/*`, `/booking/view/*`, `/booking/find`, `/review`, `/guest/mobile-requests`, `/auth/callback`, `/auth/reset-password-confirm`, `/mobile-booking/success`, `/auth/verify-email`, `/auth/registration-success`, `/auth/role-selection`, `/auth/oauth-completion`, `/onboarding`, `/onboarding/stripe-return`. Trim if you split apps by role.
2. **Supabase Auth** redirect allow-list must include app URL schemes (e.g. `theramate://`).
3. **Stripe** return URLs for mobile checkout must match Edge Function expectations.

**Full checklist:** [`23-OAUTH_DEEP_LINKS_IMPLEMENTATION_CHECKLIST.md`](23-OAUTH_DEEP_LINKS_IMPLEMENTATION_CHECKLIST.md). **Screen IDs:** [`25-SCREEN_REGISTRY_FOR_DESIGN.md`](25-SCREEN_REGISTRY_FOR_DESIGN.md).
