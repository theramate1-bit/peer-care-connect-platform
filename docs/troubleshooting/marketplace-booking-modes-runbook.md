# Marketplace Booking Modes Runbook

Use this document as the source of truth for marketplace booking behavior across therapist types and user states.
It is also the first-stop troubleshooting guide for booking errors involving RPCs and edge functions.

## Scope

- Marketplace card CTA behavior
- Clinic booking vs mobile request paths
- Guest vs authenticated client differences
- Related RPC functions and edge functions
- Common failure modes and triage steps

---

## Therapist Type Comparison (Marketplace)

| Therapist type                    | Marketplace CTA behavior                                    | User choice | Main journey                                              |
| --------------------------------- | ----------------------------------------------------------- | ----------- | --------------------------------------------------------- |
| `clinic_based`                    | Single CTA: `Book`                                          | No          | Clinic booking modal (`BookingFlow` / `GuestBookingFlow`) |
| `mobile`                          | Single CTA: `Request`                                       | No          | Mobile request modal (`MobileBookingRequestFlow`)         |
| `hybrid` (both valid)             | Two CTAs: `Book at Clinic` + `Request Visit to My Location` | Yes         | User chooses clinic or mobile path                        |
| `hybrid` (only clinic configured) | Single CTA: `Book`                                          | No          | Clinic path only                                          |
| `hybrid` (only mobile configured) | Single CTA: `Request`                                       | No          | Mobile path only                                          |

Notes:

- Hybrid mobile request CTA is location/radius gated when geo search is active.
- If no valid active product/config exists, booking is blocked with an explanatory toast.

---

## User State Comparison (Guest vs Authenticated)

| Path                                                | Authenticated client                                                                        | Guest user                                                                                        |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Clinic booking (`BookingFlow` / `GuestBookingFlow`) | Service/time -> review/policy -> pre-assessment (required for new users) -> Stripe checkout | Service/time -> contact info/policy -> pre-assessment (required for new users) -> Stripe checkout |
| Mobile request (`MobileBookingRequestFlow`)         | Service/time -> location -> pre-assessment step -> review -> Stripe hold checkout           | Service/time -> location -> contact + pre-assessment step -> review -> Stripe hold checkout       |
| Post-payment state                                  | Clinic: session is created directly                                                         | Clinic: session is created directly                                                               |
| Post-payment state (mobile)                         | Request is created first, then practitioner accepts/declines; session created on acceptance | Same as authenticated flow                                                                        |

---

## Hybrid User Journey (Detailed)

When a practitioner is `hybrid` and correctly configured for both modalities:

1. User sees two CTAs on card:
   - `Book at Clinic`
   - `Request Visit to My Location`
2. Choosing `Book at Clinic` opens clinic booking modal path.
3. Choosing `Request Visit to My Location` opens mobile request modal path.
4. Mobile path requires valid address/location coordinates and applies service-radius checks.
5. Mobile request checkout creates an authorization hold; practitioner decision finalizes capture/release behavior.

---

## Booking Decision Logic (Code Pointers)

- Shared booking mode rules:
  - `peer-care-connect/src/lib/booking-flow-type.ts`
  - `canBookClinic(...)`
  - `canRequestMobile(...)`
  - `defaultBookingFlowType(...)`
- Marketplace CTA rendering:
  - `peer-care-connect/src/pages/Marketplace.tsx`
- Clinic flows:
  - `peer-care-connect/src/components/marketplace/BookingFlow.tsx`
  - `peer-care-connect/src/components/marketplace/GuestBookingFlow.tsx`
- Mobile flow:
  - `peer-care-connect/src/components/marketplace/MobileBookingRequestFlow.tsx`

---

## RPC and Edge Function Matrix

| Layer         | Name                                 | Used for                                           | Notes                                                                    |
| ------------- | ------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------ |
| RPC           | `create_booking_with_validation`     | Clinic booking creation                            | Creates clinic session with validation rules                             |
| RPC           | `create_mobile_booking_request`      | Mobile request creation                            | Stores request + pre-assessment payload                                  |
| RPC           | `accept_mobile_booking_request`      | Practitioner accepts mobile request                | Captures flow + creates session via `create_session_from_mobile_request` |
| RPC           | `decline_mobile_booking_request`     | Practitioner declines mobile request               | Declines + triggers release flow/notifications                           |
| RPC           | `create_session_from_mobile_request` | Converts accepted request to `client_sessions` row | Also persists pre-assessment payload into `pre_assessment_forms`         |
| Edge Function | `stripe-payment`                     | Clinic checkout/payment paths                      | Used by `PaymentIntegration`                                             |
| Edge Function | `mobile-payment`                     | Mobile request checkout and post-checkout actions  | Create/confirm/capture/release mobile payment                            |
| Edge Function | `send-email`                         | Transactional notifications                        | Triggered by notification/payment flows                                  |
| Edge Function | `location-proxy`                     | Address lookup/autocomplete support                | Used by location UI                                                      |

---

## Common Errors and Triage

| Symptom                                    | Likely cause                                                | First checks                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Mobile CTA disabled for hybrid             | Missing radius/base coords or product service type mismatch | Check `canRequestMobile` inputs (`mobile_service_radius_km`, `base_latitude`, `base_longitude`, active mobile/both product) |
| Mobile flow cannot continue after location | Coordinates not set from suggestion click                   | Verify address picker set `clientLatitude/clientLongitude` (not text-only input)                                            |
| Mobile payment fails at checkout           | `mobile-payment` issue or Stripe capability constraints     | Check edge logs for `mobile-payment`; inspect action (`create-mobile-checkout-session`)                                     |
| Redirect returns but request not finalized | Post-checkout confirmation race/state mismatch              | Check `mobile-payment` confirm action logs and retry behavior                                                               |
| Email failures after booking               | Unsupported `emailType` payload or template issue           | Check `send-email` logs and payload type                                                                                    |
| Location search 400s                       | Invalid upstream params                                     | Check `location-proxy` logs and frontend query params                                                                       |

---

## Change Control Checklist

Update this runbook when any of the following changes:

- CTA labels or availability rules (`Book`, `Request`, dual CTA behavior)
- Therapist type gating logic
- Step sequence in clinic/mobile flows
- Pre-assessment requirement logic
- RPC function signatures for booking/mobile request
- Edge function names/actions used by booking
- Error handling behavior (retry/fallback paths)

Recommended update pattern:

1. Update code
2. Update this runbook tables
3. Update `docs/features/booking-flows-reference.md` if step model changed
4. Re-test one clinic and one mobile journey (guest + authenticated)

---

## Production Sign-off

Use this checklist doc for full release validation and append completed results to this runbook:

- `docs/testing/marketplace-booking-e2e-signoff-checklist.md`

### Sign-off Log (append entries)

| Date | Environment | Scope                                                                                  | Result | Notes |
| ---- | ----------- | -------------------------------------------------------------------------------------- | ------ | ----- |
|      |             | Hybrid clinic path, hybrid mobile path, mobile cancel path, success-page recovery path |        |       |

---

**Last Updated:** 2026-03-08
