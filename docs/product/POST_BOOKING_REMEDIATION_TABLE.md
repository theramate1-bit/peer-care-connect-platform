# Post-Booking Remediation Table

Date: 2026-03-08  
Scope: post-booking confirmation, guest/client follow-up, and session management routing consistency.

Product decision captured: guests should be **self-serve** post-booking (guest-safe management actions expected).

| Step                          | Expected UX                                                                                           | Current UX                                                                                                                                                              | Issue                                                                       | Priority |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------- |
| Confirmation page             | User sees the booked session details, including date, time, type, status, and location                | `BookingSuccess` shows the core session details, but not the session location, even though it already computes location for `Add to Calendar`                           | Confirmation page drops a critical detail, especially for mobile sessions   | High     |
| Guest confirmation follow-up  | Guest user gets guest-safe next actions after booking                                                 | `BookingSuccess` always shows `View My Bookings` to `/client/sessions`, and the guest account CTA redirects to `/bookings`                                              | Guest CTAs point to authenticated or mismatched routes                      | High     |
| Client session hub            | Client can review upcoming sessions with correct clinic/mobile location context                       | `MySessions` loads old session fields and therapist `location`, but does not preserve `appointment_type` / `visit_address` or use the shared location resolver          | Client post-booking list cannot reliably show the correct location model    | High     |
| Guest booking details         | Guest can open a confirmation link without login and see the right location                           | `GuestBookingView` correctly uses `appointment_type` + `visit_address` and stays public                                                                                 | Aligned                                                                     | None     |
| Practitioner session detail   | Practitioner can see location, directions, client info, and manage the session                        | `SessionDetailView` correctly uses booking-record-first location and supports reschedule/cancel flows                                                                   | Aligned                                                                     | None     |
| Post-booking management       | Clients should land in the surface where they can manage the booking they just made                   | Success page routes authenticated users to `MySessions`, which is more history/notes/rebook focused; practitioner detail has management actions, client detail does not | Management UX is split across old and new surfaces                          | Medium   |
| Guest post-booking management | If guests are meant to self-serve, they should be able to manage change/cancel from a guest-safe page | `GuestBookingView` is explicitly view-only and tells users to contact the practitioner                                                                                  | Guest post-booking management is currently incomplete versus product intent | Medium   |

## Confirmed Evidence

- `peer-care-connect/src/pages/BookingSuccess.tsx`
- `peer-care-connect/src/pages/booking/GuestBookingView.tsx`
- `peer-care-connect/src/pages/client/MySessions.tsx`
- `peer-care-connect/src/components/sessions/SessionDetailView.tsx`
- `peer-care-connect/src/utils/sessionLocation.ts`
- `peer-care-connect/src/components/AppContent.tsx`

## Fix Order

1. Add location to `BookingSuccess` using the same `getSessionLocation(...)` output already used for calendar.
2. Fix guest success CTAs: guest-safe `View booking details`, and correct account-creation redirect.
3. Update `MySessions` to select `appointment_type` and `visit_address` and render location via the shared resolver.
4. Decide whether client management should live in `MySessions` or an existing booking-management page, then route success pages consistently.
5. Implement guest-safe post-booking self-serve actions (cancel/reschedule) or ship an explicit temporary policy with corresponding UX copy.
