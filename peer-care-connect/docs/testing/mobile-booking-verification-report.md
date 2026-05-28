# Mobile Booking Verification Report

Date: 2026-02-27

## Environment Checks

- Migration `mobile_booking_journey_hardening` applied successfully via Supabase MCP.
- Cron job `expire_mobile_requests_job` is active with schedule `*/15 * * * *`.
- Build verification completed with `npm run build` (success).

## Database State Validation

- `mobile_booking_requests` grouped by `(status, payment_status)`: no rows in current snapshot.
- `pending_without_hold`: `0`
- `accepted_without_capture`: `0`
- `expired_still_held`: `0`

## Journey Hardening Outcomes Confirmed

- Manual-capture authorization flow now requires checkout confirmation before request is actionable.
- Practitioner accept/decline actions are blocked unless `payment_status='held'`.
- Strict mobile request RPC logic rejects clinic-only or incomplete mobile/hybrid setup.
- Expiry function now sets expired/released state and writes in-app notifications.
- Guest request status path is available at `/guest/mobile-requests?email=<guest_email>`.

## Remaining Manual QA

Run the matrix in `docs/testing/mobile-booking-journey-verification.md` against seeded test data:

- authenticated client -> accept
- authenticated client -> decline with alternatives
- guest -> accept
- guest -> decline and expire
