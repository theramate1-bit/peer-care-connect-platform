# Client — mobile visit requests (signed-in)

**Signed-in clients** track **mobile booking requests** (home visits) through **auth-scoped** APIs and profile screens — distinct from **guest** email-based tracking.

## Native — authenticated list & detail

| File                                               | Role                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **`app/(tabs)/profile/mobile-requests/index.tsx`** | Lists requests via **`fetchClientMobileRequests`** (**`lib/api/mobileRequests.ts`**). |
| **`app/(tabs)/profile/mobile-requests/[id].tsx`**  | Request detail (also re-exported under practitioner profile for shared reuse).        |

## Contrast: guest mobile requests

Guests without login use **`app/guest/mobile-requests.tsx`** and RPCs such as **`get_guest_mobile_requests_by_email`** — documented under [Guest mobile requests](../guest/03-mobile-booking-requests-native.md).

## Web

**`src/lib/clientMarketplaceBooking.ts`** defines **`createMobileRequestAndOpenCheckout`**, but **no** client-facing web wizard under **`src/`** references it in this snapshot. Treat **native** **`app/booking/mobile-request.tsx`** (+ booking API) as the reference for creating requests when implementing web parity.
