# Mobile Booking Journey Verification

## Preconditions

- Practitioner has `therapist_type in ('mobile','hybrid')`, `base_latitude`, `base_longitude`, and `mobile_service_radius_km`.
- Practitioner has active mobile-capable product (`service_type in ('mobile','both')`).
- Practitioner has valid `stripe_connect_account_id`.
- `expire_mobile_requests_job` is active in `cron.job`.

## End-to-End Matrix

### 1) Authenticated client request -> accept

- Client submits mobile request from marketplace.
- Client completes Stripe checkout authorization.
- Verify `mobile_booking_requests.payment_status = 'held'`.
- Practitioner accepts request.
- Verify `payment_status = 'captured'`, `status = 'accepted'`, `session_id is not null`.
- Verify in-app notification created for client.
- Verify accepted email sent to client.

### 2) Authenticated client request -> decline with alternatives

- Client submits and authorizes hold.
- Practitioner declines with reason + alternate date/time.
- Verify `status = 'declined'`, `payment_status = 'released'`.
- Verify decline reason and alternates persisted.
- Verify in-app notification created for client.
- Verify declined email sent to client.

### 3) Guest request -> accept

- Guest submits request + contact details and completes authorization.
- Open `/guest/mobile-requests?email=<guest-email>` and verify request visibility.
- Practitioner accepts.
- Verify status transitions to accepted and payment captured.
- Verify accepted email sent to guest.

### 4) Guest request -> decline/expire

- Guest request is declined with or without alternatives.
- Verify release + declined email + guest status visibility.
- For pending request beyond expiry:
  - Run `select public.expire_mobile_requests();` or wait cron.
  - Verify `status='expired'` and `payment_status` released when previously held.
  - Verify in-app expiry notification row for client/guest user.

## No-Fallback Assertions

- Reject creation when therapist is `clinic_based` for mobile request.
- Reject creation when practitioner base coordinates are missing.
- Reject creation when mobile radius is null/invalid.
- Reject creation when client coordinates are missing.
- Prevent accept/decline actions when `payment_status != 'held'`.
