# Guest — guest view token & session lookup

Guests often manage bookings via **email links**, not a logged-in dashboard. Links use **`guest_view_token`** on **`client_sessions`**.

## Database / RPC

| Piece                                                   | Purpose                                                                                                                                                                                                     |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`client_sessions.guest_view_token`**                  | Opaque token; unique when set (see migrations).                                                                                                                                                             |
| **`get_session_by_guest_token(p_session_id, p_token)`** | Returns safe session fields for the “view booking” UI; **`anon`** may invoke where migrations grant it.                                                                                                     |
| **Triggers**                                            | e.g. **`set_guest_view_token_for_in_person`** — auto-set token for certain **`payment_collection`** paths so pay-at-clinic guests still get a link (see `20260416120000_cash_bookings_v1_gap_closure.sql`). |

## Email URL construction

Edge functions enrich booking emails with URLs like:

`${siteUrl}/booking/view/${session.id}?token=${encodeURIComponent(session.guest_view_token)}`

(see **`supabase/functions/_shared/enrich-session-email-data.ts`**, **`send-booking-notification`**, **`stripe-webhooks`**.)

## Native implementation

| File                                                        | Role                                                                                                                                     |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **`theramate-ios-client/lib/api/guestBooking.ts`**          | **`fetchGuestSessionByToken`** → **`get_session_by_guest_token`**.                                                                       |
| **`theramate-ios-client/app/booking/view/[sessionId].tsx`** | **`GuestBookingViewScreen`** — token-based session display.                                                                              |
| **`theramate-ios-client/app/booking/find.tsx`**             | **`findBookingsByEmail`** → RPC **`get_guest_sessions_by_email`**; opens **`booking/view`** only when **`guest_view_token`** is present. |

## Web (`src/`) gap

There are **no** matches for **`booking/view`** or **`guest_view_token`** under **`src/`** in this repo snapshot. If marketing web is deployed from this package, confirm routing or proxy to a host that implements **`/booking/view`**, or add a route that calls **`get_session_by_guest_token`** like native.
