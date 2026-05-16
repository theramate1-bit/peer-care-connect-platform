# Client — web discovery & clinic booking

Web app root: **`src/`**.

## Discovery → booking entry

| File                                          | Role                                                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **`src/pages/discovery/TherapistSearch.tsx`** | Marketplace-style list; **Book** navigates to **`/client/ClientBooking?therapistId=<id>`** (does not set **`guest=1`**). |
| **`src/pages/client/ClientBooking.tsx`**      | Practitioner picker → **`BookingFlow`** with **`guestMode`** from **`?guest=1`** only.                                   |

## Authenticated clinic flow

| File                                         | Role                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`src/components/booking/BookingFlow.tsx`** | When **`guestMode` is false**: **`supabase.auth.getUser()`**; **`clientId = user.id`**; **`isGuestBooking = false`**. Supports **online** (Stripe via **`bookSessionAndOpenCheckout`**) or **pay-at-clinic** (**`create_booking_with_validation`** + edge **`send-booking-notification`**). Pre-assessment fields folded into **`notes`**. |

## Supporting lib

| File                                      | Role                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| **`src/lib/clientMarketplaceBooking.ts`** | Products, slots, **`bookSessionAndOpenCheckout`** (**`p_is_guest_booking`** from params). |
| **`src/lib/marketplacePractitioners.ts`** | Practitioner list for discovery / booking pages.                                          |

## Preconditions

- **`BookingFlow`** non-guest path **throws** if there is no auth user — ensure the client is logged in before opening **`guestMode={false}`** (today **`ClientBooking`** does not gate the page; product may wrap with auth elsewhere).

## Out of scope on web (this repo)

- No **`src/`** routes found for **`/client/sessions`** or client session detail / reschedule in this snapshot — **native** carries “My bookings” UX; see [05-sessions-and-actions.md](./05-sessions-and-actions.md).
