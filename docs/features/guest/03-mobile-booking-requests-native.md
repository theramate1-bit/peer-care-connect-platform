# Guest — mobile booking requests (primarily native)

**Mobile visit requests** (address + requested slot + checkout) are implemented on **Theramate native**, not in the web `BookingFlow` clinic wizard under **`src/`**.

## Native — create request + checkout

| File                                                      | Role                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`theramate-ios-client/app/booking/mobile-request.tsx`** | Collects client/practitioner/product/date/address; calls **`createMobileRequestAndOpenCheckout`** from **`theramate-ios-client/lib/api/booking.ts`**. Caller supplies `p_client_id` — for guests that id must come from **`ensure_guest_user_for_booking`** (same pattern as manual booking). |
| **`theramate-ios-client/lib/api/booking.ts`**             | **`createMobileRequestAndOpenCheckout`** — RPC **`create_mobile_booking_request`**, then **`stripe-payment`** `create-mobile-checkout-session`.                                                                                                                                               |

Authenticated clients use the same machinery with `auth` user id as `client_id`.

## Native — track / cancel guest requests (email, no login)

| File                                                     | Role                                                                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`theramate-ios-client/app/guest/mobile-requests.tsx`** | Uses **`get_guest_mobile_requests_by_email`**, **`cancel_guest_mobile_request_by_email`** so guests can manage pending requests without auth (email scoped). |
| **`theramate-ios-client/app/settings.tsx`**              | Link **Bookings & guests** → **`/guest/mobile-requests`**.                                                                                                   |
| **`theramate-ios-client/app/find-therapists.tsx`**       | CTA **Track a guest mobile visit request** → same route.                                                                                                     |
| **`theramate-ios-client/lib/deepLinking.ts`**            | Maps paths including **`guest/mobile-requests`**.                                                                                                            |

## Web parity note

**`src/lib/clientMarketplaceBooking.ts`** exports **`createMobileRequestAndOpenCheckout`** for potential web reuse; there is **no** matching guest mobile wizard under **`src/components/booking/`** in this snapshot. Treat native as the reference implementation for this feature.
