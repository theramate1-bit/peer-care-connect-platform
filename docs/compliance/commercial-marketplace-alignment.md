# Commercial and marketplace alignment

**Date:** 2026-04-18  
**Purpose:** Map **payments, refunds, reviews, verification** to code and list **alignment** actions with Terms and marketing. Not legal advice.

## Payments and Stripe

- **Stripe Connect:** Practitioner onboarding references verification — [`src/components/payments/ConnectAccountSetup.tsx`](../../src/components/payments/ConnectAccountSetup.tsx).
- **Webhooks:** [`supabase/functions/stripe-webhooks/index.ts`](../../supabase/functions/stripe-webhooks/index.ts) handles `charge.refunded` and related events — see also [`src/config/stripe.ts`](../../src/config/stripe.ts) event list.
- **Counsel / product:** User-facing copy should state whether Theramate is **agent**, **payments facilitator**, or other role—must match **Stripe Connect** configuration and UK consumer rules.

## Cancellations and refunds

- **Mobile config:** `BOOKING_CONFIG.CANCELLATION_WINDOW_HOURS: 24` in [`theramate-ios-client/constants/config.ts`](../../theramate-ios-client/constants/config.ts).
- **Client cancel copy:** [`theramate-ios-client/app/(tabs)/bookings/[id].tsx`](<../../theramate-ios-client/app/(tabs)/bookings/[id].tsx>) — warns user may need to contact support for refunds depending on policy.
- **Booking flow:** Cancellation policy acceptance in [`theramate-ios-client/app/booking/index.tsx`](../../theramate-ios-client/app/booking/index.tsx).
- **Email:** Templates reference cancellation and refund amounts — [`supabase/functions/send-booking-notification/index.ts`](../../supabase/functions/send-booking-notification/index.ts), [`send-email`](../../supabase/functions/send-email/index.ts).
- **Alignment:** Ensure **website Terms** (`/terms#cancellation` linked from emails) matches **automated** refund behaviour and **24h** (or per-practitioner) rules.

## Reviews

- **Submission:** [`src/pages/reviews/SubmitReview.tsx`](../../src/pages/reviews/SubmitReview.tsx) — inserts into `reviews`; restricts to **completed** sessions and **own** sessions; toast says review will be visible **shortly** (implies moderation pipeline).
- **Listing:** [`src/pages/reviews/Reviews.tsx`](../../src/pages/reviews/Reviews.tsx) — practitioners with `total_reviews > 0`.
- **Alignment:** Publish **moderation** rules, **report** flow, and fake-review stance (CMA guidance). If moderation exists only in admin, document it.

## Practitioner verification vs marketing

- **Discovery:** [`src/pages/discovery/TherapistSearch.tsx`](../../src/pages/discovery/TherapistSearch.tsx) — optional filter `verification_status = 'verified'`, badges via `getVerificationBadge`.
- **Risk:** Marketing “qualified” or “verified” must match **admin verification** rules and registry checks (GOsC/HCPC where applicable).
- **Alignment:** Maintain an internal **definition** of `verified` and reflect it in **Privacy/Terms** and practitioner onboarding.

## Platform fees

- **Cash bookings / payment collection:** Migrations such as [`20260416100000_cash_bookings_v1.sql`](../../supabase/migrations/20260416100000_cash_bookings_v1.sql) — product evolution for payment modes.
- **Alignment:** Pricing page and practitioner agreement should disclose **fees** and **who** charges the client.

## Summary checklist

- [ ] Stripe role + refund path described consistently (web, app, email).
- [ ] Cancellation window in app config matches published policy or per-practitioner overrides.
- [ ] Reviews: moderation + reporting documented for users.
- [ ] `verification_status` semantics documented internally and in user-facing copy.
