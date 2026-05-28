# Stripe Checkout — Mobile Production Readiness

**Date:** 2026-05-26  
**Scope:** `theramate-ios-client`  
**Screen map:** [`STRIPE_CHECKOUT_MOBILE_SCREEN_FLOWS.md`](STRIPE_CHECKOUT_MOBILE_SCREEN_FLOWS.md)

---

## Verdict

**Client clinic + mobile visit checkout: ready for production** when Stripe keys and Connect accounts are configured. **Practitioner platform subscription purchase:** in-app hosted Checkout + `verify-checkout` (deploy `stripe-payment` 2026-05-26). **Guest:** pay-at-clinic native (`guest=1`); card checkout via in-app WebView to web (not native PaymentSheet without account).

---

## Prerequisites

| Item                                         | Where                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`         | `theramate-ios-client/.env`                                                                       |
| `EXPO_PUBLIC_WEB_URL` / `APP_CONFIG.WEB_URL` | Must match Stripe success/cancel URLs                                                             |
| Supabase edge functions                      | `stripe-payment` (v132+), `verify-checkout`, `customer-portal` deployed to `aikqnvltuwwgifuocvto` |
| Practitioner Connect                         | `stripe_connect_account_id` on therapist for paid bookings                                        |

---

## Flow readiness

| Flow                           | Mechanism                                                          | Ready                                                                   |
| ------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Clinic online booking          | Hosted Checkout in-app WebView (PaymentSheet SDK disabled)         | Yes                                                                     |
| Clinic in-person               | No Stripe                                                          | Yes                                                                     |
| Mobile visit request           | Hosted Checkout + confirm RPC                                      | Yes                                                                     |
| Mobile payment retry           | Detail + pending reopen                                            | Yes (2026-05-21)                                                        |
| Mobile checkout idempotency    | `mobile_checkout_{requestId}` → Stripe + `checkout_sessions` reuse | Yes (`stripe-payment` v130+)                                            |
| Multi-domain redirect parse    | `theramate.com` + `.co.uk` via `stripeCheckoutWebOrigins`          | Yes                                                                     |
| Clinic duplicate book tap      | `DUPLICATE_REQUEST` → same `session_id` → payment                  | Yes                                                                     |
| Booking success (clinic)       | Poll `payments` by checkout session id                             | Yes                                                                     |
| Mobile success                 | `confirm-mobile-checkout-session`                                  | Yes                                                                     |
| Customer portal                | `customer-portal` + hosted-web                                     | Yes                                                                     |
| Practitioner Connect           | Hosted onboarding WebView → native stripe-return                   | Yes                                                                     |
| Practitioner subscription      | Hosted Checkout + `subscription-success`                           | Yes — `pricing.tsx`, `platformSubscriptionCheckout.ts`                  |
| Guest checkout                 | Pay-at-clinic in app; card on web (in-app WebView)                 | Yes — `guest=1` + `openGuestBookingOnWeb`                               |
| Platform subscription purchase | Hosted Checkout + `verify-checkout`                                | Yes — `create-platform-subscription-checkout` (deploy `stripe-payment`) |

---

## Quality gates

| Command                    | Expected                                         |
| -------------------------- | ------------------------------------------------ |
| `npm run typecheck:mobile` | Pass                                             |
| `npm run test:mobile`      | Pass (includes `hostedWebViewRedirects.test.ts`) |

**Not automated:** live Stripe test cards, Connect transfers, webhook timing — manual QA on staging.

---

## Manual smoke (staging)

1. Book clinic session (online) — PaymentSheet or WebView completes; session visible in bookings.
2. Book mobile visit — Checkout → success → request `payment_status` held/paid.
3. Abandon Checkout → pending → Reopen checkout.
4. Open unpaid request in profile → **Complete payment**.
5. Profile → Payment methods → Open billing portal (in-app).
6. Practitioner → Stripe Connect → finish hosted onboarding → native **stripe-return** → status shows payouts enabled.
7. **Guest pay-at-clinic:** `/book/:slug` → Book as guest → in-person → session created without sign-in.
8. **Guest card:** same entry → online pay → in-app WebView completes web checkout.
9. **Platform subscribe:** Practitioner `pricing` or onboarding → Subscribe → `subscription-success` → status on `settings/subscription`.

---

## Out of scope (mobile)

- Web-only marketplace checkout paths not duplicated in native explore (uses same edge functions when booking modals open).
- Guest **card** via native PaymentSheet without account (product: web checkout in WebView).
- Native-only plan change UX without Stripe customer portal (manage still opens portal WebView).
