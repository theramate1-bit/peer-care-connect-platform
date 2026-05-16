# Client — identity & session model

## Definition

A **client** is a **registered** user: Supabase Auth session exists and **`public.users.id`** matches **`auth.uid()`**, typically with **`user_role = 'client'`**.

## Data rules

| Concept     | Implementation                                                                             |
| ----------- | ------------------------------------------------------------------------------------------ |
| Identity    | **`client_id`** on bookings = authenticated **`users.id`**                                 |
| Guest flag  | **`client_sessions.is_guest_booking`** is **false** or **null** for normal client bookings |
| Distinction | Prefer **`is_guest_booking`** + auth context over guessing from email alone                |

## Auth ↔ profile

- **`theramate-ios-client/hooks/useAuth.ts`** — **`isClient`** ⇔ **`userProfile?.user_role === "client"`**
- **`theramate-ios-client/stores/authStore.ts`** — role checks for client shell
- **`theramate-ios-client/lib/postAuthRoute.ts`** — clients route to **`/(tabs)`** after sign-in

## Booking RPC

Authenticated clinic booking passes **`p_client_id: user.id`** and **`p_is_guest_booking: false`** (see **`BookingFlow`** web and **`lib/api/booking.ts`** native **`bookSessionAndOpenCheckout`**).

## Related

- Guest contrast: [Guest identity](../guest/01-identity-and-session-model.md)
- Linking prior guest bookings: [Guest → client linking](../guest/07-account-linking-and-conversion.md)
