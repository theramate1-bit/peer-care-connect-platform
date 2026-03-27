# Gaps: Email and Booking Location Logic

Identified gaps in the **logical use** of the email system and clinic/mobile/hybrid booking location logic. Use this to prioritise fixes or documentation.

---

## 1. Mobile session with no visit address

**Where:** `getBookingEmailLocationData` in `supabase/functions/_shared/booking-email-data.ts`.

**Status:** **Fixed.** The helper no longer falls through to clinic. If `appointment_type === 'mobile'` and no `visit_address`, it returns `sessionLocation: "Visit address to be confirmed"` and no directions.

---

## 2. create_booking_with_validation does not set appointment_type / visit_address

**Where:** RPC `create_booking_with_validation` (used by standard guest/client booking).

**Status:** **Resolved.** The RPC has an **overload** with `p_appointment_type` (default `'clinic'`) and `p_visit_address` (default null). Clinic call sites (BookingFlow, GuestBookingFlow) already pass `p_appointment_type: 'clinic'` and `p_visit_address: null`. Mobile bookings use the mobile request path (`create_session_from_mobile_request`), not this RPC. For any future flow that creates a mobile session via this RPC, pass `p_appointment_type = 'mobile'` and `p_visit_address` from the client address.

---

## 3. Practitioner dashboard / Credits session list use profile location

**Where:** `peer-care-connect/src/pages/Credits.tsx` (exchange session list).

**Status:** **Fixed.** The peer-sessions transform now preserves `appointment_type`, `visit_address`, and practitioner `clinic_address`. The list uses `getSessionLocation(session, session.practitioner)` so location is derived from the booking record (clinic at [address] or visit at [address] / "Visit address to be confirmed").

---

## 4. BookingCalendar modal does not show session location

**Where:** `peer-care-connect/src/components/BookingCalendar.tsx`.

**Status:** **Implemented.** Sessions are mapped to `BookingEvent` with `location` from `getSessionLocation(session, session.therapist)`. The modal shows `selectedBookingForModal.location` when set.

---

## 5. Reminder emails (if enabled later)

**Where:** `session_reminder_24h`, `session_reminder_1h` templates exist; no cron or Edge Function triggers them (see `docs/product/EMAIL_AUDIT_AND_TRIGGERS.md`).

**Gap:** If reminders are added, the trigger must:

- Load session (with `appointment_type`, `visit_address`) and practitioner (e.g. `clinic_address`, `location`).
- Use the same location helper (or equivalent logic) so reminder content and directions match confirmation/cancellation/reschedule.

**Option:** When implementing reminders, call `getBookingEmailLocationData` (or reuse its logic) and pass the same `sessionLocation` / `directionsUrl` shape into the reminder payload.

---

## 6. Post-booking side effect uses practitioner.location only

**Where:** `peer-care-connect/src/components/marketplace/GuestBookingFlow.tsx` (e.g. around line 442): `sessionLocation: practitioner?.location ?? undefined` in a post-booking side effect (e.g. analytics or logging).

**Behaviour:** That side effect does not use session `appointment_type` or `visit_address`; it uses practitioner location only.

**Gap:** If that payload is used for any user-facing or downstream behaviour (e.g. analytics "session location"), it will not reflect mobile/visit address. If it is only for internal logging/analytics, the gap is minor.

**Option:** If the payload must reflect "booking record first", build location from the created session (e.g. refetch or pass through from the session returned by create_booking_with_validation) using the same rules as the central helper.

---

## Summary

| #   | Gap                                                                         | Severity     | Fix                                                                                                                   |
| --- | --------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------- |
| 1   | Mobile with no visit_address → clinic fallback                              | Low          | **Fixed:** helper returns "Visit address to be confirmed".                                                            |
| 2   | create_booking_with_validation has no appointment_type/visit_address params | Low (future) | **Resolved:** RPC overload exists; clinic call sites pass params; mobile uses mobile request path.                    |
| 3   | Credits/dashboard session lists use profile location                        | Medium       | **Fixed:** Credits transform preserves appointment_type, visit_address, clinic_address; list uses getSessionLocation. |
| 4   | Calendar modal never shows location                                         | Low          | **Implemented:** Calendar map uses getSessionLocation; modal shows location.                                          |
| 5   | Reminders (if added) must use same location logic                           | —            | Use getBookingEmailLocationData when implementing.                                                                    |
| 6   | GuestBookingFlow side-effect payload uses practitioner.location             | Low          | Change only if that payload must match "booking record first".                                                        |
