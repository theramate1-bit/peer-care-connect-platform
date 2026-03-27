# Session location rule (booking record first)

Single rule used everywhere for clinic vs mobile session location.

## Rule

Resolve location in this order:

1. `session.visit_address`
2. `session.appointment_type` (if mobile and no visit_address → "Visit address to be confirmed")
3. `practitioner.clinic_address`
4. `practitioner.location`

## Implementations

- **Backend (Edge Functions):** `supabase/functions/_shared/booking-email-data.ts` → `getBookingEmailLocationData`
- **Frontend (UI):** `peer-care-connect/src/utils/sessionLocation.ts` → `getSessionLocation`

Keep both in sync when changing the rule.

## Call sites

| Consumer                                        | File                                                                | Usage                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------- |
| Emails (confirmation, cancellation, reschedule) | `supabase/functions/send-email/index.ts`                            | Payload from callers                                      |
| Stripe webhooks (post-payment confirmation)     | `supabase/functions/stripe-webhooks/index.ts`                       | `getBookingEmailLocationData`                             |
| Send booking notification                       | `supabase/functions/send-booking-notification/index.ts`             | `getBookingEmailLocationData`                             |
| Guest booking flow (post-booking notification)  | `peer-care-connect/src/components/marketplace/GuestBookingFlow.tsx` | `getSessionLocation`                                      |
| Credits session list                            | `peer-care-connect/src/pages/Credits.tsx`                           | `getSessionLocation`                                      |
| Booking calendar (modal + event map)            | `peer-care-connect/src/components/BookingCalendar.tsx`              | `getSessionLocation`                                      |
| Session notifications (in-app)                  | `peer-care-connect/src/lib/session-notifications.ts`                | `sessionLocation` and `sessionLocationLabel` from callers |

Queries that feed these must select `appointment_type`, `visit_address`, and practitioner `clinic_address` (or `location`) where needed. Session list queries and transforms must preserve these fields (do not drop them when mapping to UI state) so `getSessionLocation` receives correct input and can resolve "Clinic at [address]" vs "Visit at [address]" correctly.

**Mobile booking in-app notification:** When sending `booking_created` for a session created via the mobile path (e.g. after `create_session_from_mobile_request`), pass `sessionLocation` from `session.visit_address` and `sessionLocationLabel: 'visit'` so the client sees "Visit address: …". Guest/clinic bookings already pass location from `getSessionLocation` with label "Session at" for clinic.
