# Client — native shell, explore & clinic booking

Theramate customer app: **`theramate-ios-client/`**. Signed-in clients use the **`(tabs)`** shell.

## Shell & routing

| File                                                     | Role                                                                                                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **`app/(tabs)/_layout.tsx`**                             | Bottom tabs; when **unauthenticated**, most tabs hidden (**`guestOnlyExplore`**) — logged-in clients get Home, Bookings, Messages, Profile. |
| **`lib/postAuthRoute.ts`**                               | **`getMainAppHref()`** → **`/(tabs)`** for clients.                                                                                         |
| **`lib/tabPath.ts`** / **`contexts/TabRootContext.tsx`** | Tab href roots **`/(tabs)`** vs practitioner **`/(practitioner)/(ptabs)`**.                                                                 |

## Explore (find practitioners)

| File                                                       | Role                                      |
| ---------------------------------------------------------- | ----------------------------------------- |
| **`app/(tabs)/explore/index.tsx`**, **`explore/[id].tsx`** | Browse practitioners; entry into booking. |

## Authenticated clinic booking modal

| File                        | Role                                                                                                                                                                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`app/booking/index.tsx`** | Multi-step booking (**service → date/time → pre-assessment → payment → confirm**). Uses **`useAuth()`** **`userId`** / **`userProfile`** for identity.                                                                                                      |
| **`lib/api/booking.ts`**    | **`bookSessionAndOpenCheckout`** — **`p_is_guest_booking: false`**; Stripe PaymentSheet / checkout + RPC **`create_booking_with_validation`**. Supports **`paymentCollection`** online vs in-person with different **`p_status`** / **`p_payment_status`**. |

## Parity notes

- Native booking module mirrors web **`clientMarketplaceBooking`** patterns (comments in code reference alignment).
- **`docs/product/cash-bookings-v1-plan.md`** tracks remaining parity items (e.g. pay-at-clinic branches) — check when changing payments.
