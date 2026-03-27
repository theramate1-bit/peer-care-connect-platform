# Mobile Request Remediation Table

Date: 2026-03-08  
Scope: mobile request flow UX and logic consistency across guest/client/practitioner surfaces.

| Step                       | Expected UX                                                                                                            | Current UX                                                                                      | Issue                                                                                                            | Priority |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| Request entry              | User sees a clear mobile-only request flow with service, time, address, pre-assessment, and review before payment hold | Implemented as a 5-step request flow and correctly creates a request before checkout            | None, aligned                                                                                                    | None     |
| Post-checkout success      | User lands on a success state with a direct way to track the submitted request                                         | Signed-in users can go to their request list; guests only get `Browse Practitioners`            | Guest continuity is weak immediately after submission                                                            | Medium   |
| Practitioner request queue | Practitioner can review pending requests with enough context and urgency to act                                        | Service, amount, date/time, address, distance, notes, and payment state are shown               | No visible expiry countdown; 60-minute TTL is backend-only and expired requests disappear from practitioner view | Medium   |
| Accept request             | Practitioner can only accept once hold is valid; acceptance should capture payment and create session                  | Implemented correctly                                                                           | None, aligned                                                                                                    | None     |
| Decline request            | Practitioner can decline, release hold, and optionally suggest another slot                                            | Implemented correctly                                                                           | None, aligned                                                                                                    | None     |
| Pending request follow-up  | Any client who created the request should be able to cancel while it is pending                                        | Authenticated clients can cancel; guests cannot cancel from the guest status page               | Guest request management is read-only during pending state                                                       | Medium   |
| Accepted request handoff   | Any client should have a valid next step after acceptance, including session details or booking view                   | Shared status screen shows `View session`, but it routes guests to protected `/client/sessions` | Guest accepted flow breaks at the session handoff                                                                | High     |
| Decline recovery           | Client can re-request the suggested slot or start a fresh request                                                      | Implemented for both suggested and new time flows                                               | None, aligned                                                                                                    | None     |
| Notification routing       | Status emails/links should route users to the right surface for their user state                                       | Accepted/declined/expired email links use the guest mobile-requests route                       | Authenticated users are still pushed through the guest path; route parity is inconsistent                        | Low      |

## Fix Order

1. Fix the guest accepted handoff first: route guests to a guest-safe booking/session view, or suppress `View session` until that path exists.
2. Add a direct `View my request` action on the guest success page.
3. Add guest-side cancel support for pending requests if that is a supported product rule.
4. Surface `expires_at` in practitioner and client request UIs so the 60-minute window is explicit.

## Key Evidence

- `peer-care-connect/src/components/marketplace/MobileBookingRequestFlow.tsx`
- `peer-care-connect/src/pages/MobileBookingSuccess.tsx`
- `peer-care-connect/src/components/practitioner/MobileRequestManagement.tsx`
- `peer-care-connect/src/components/client/MobileRequestStatus.tsx`
- `peer-care-connect/src/lib/notification-system.ts`
- `supabase/migrations/20260308221000_enforce_mobile_request_ttl_and_deduplicate_pending.sql`
