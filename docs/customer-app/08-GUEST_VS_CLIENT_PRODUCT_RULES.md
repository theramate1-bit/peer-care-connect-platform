# Guest vs client — product rules (customer perspective)

**Canonical engineering doc:** [`../development/GUEST_VS_CLIENT_RULES.md`](../development/GUEST_VS_CLIENT_RULES.md)

This file is a **short customer-app summary** so mobile work does not fork behavior.

## Definitions

| Term       | Meaning                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Guest**  | Books or interacts **without** a full account, or before completing onboarding — subject to stricter pre-assessment and link-based access. |
| **Client** | Authenticated user with **`user_role === 'client'`** — full dashboard, messages, history.                                                  |

## Booking

- **Direct booking** (`/book/:slug`) must enforce the same **availability**, **slot holds**, and **payment** rules as authenticated booking where applicable.
- **Mobile booking requests** (`mobile_booking_requests`) — guest vs client flows may differ; align with web `GuestMobileRequests` / `ClientMobileRequests` / practitioner `MobileRequests`.

## Pre-assessment

- `pre_assessment_forms` — mandatory rules differ for guests vs returning clients (see DB comments and product docs).
- Native **must** call the same RPCs / inserts as web; do not skip steps “because mobile.”

## Messaging and email

- Guests may receive **email** and limited links; in-app **messaging** typically requires auth.
- Deep links from email should open **web** or **native** consistently (same path patterns).

## Credits and refunds

- **Credits** visibility and actions depend on account state and session outcome — follow `credits` / `credit_transactions` RLS and existing Edge Functions.

## When in doubt

1. Read [`../development/GUEST_VS_CLIENT_RULES.md`](../development/GUEST_VS_CLIENT_RULES.md)
2. Check [`../features/booking-flows-reference.md`](../features/booking-flows-reference.md)
3. Verify RLS with Supabase MCP or SQL, not assumptions
