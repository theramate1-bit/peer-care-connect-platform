# Booking UX by practitioner type (web & native)

## Summary matrix

| `therapist_type` | Native primary surfaces                                                    | Web (`src/`)                                                       |
| ---------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **clinic_based** | Explore detail → **`/booking`**                                            | **`ClientBooking`** / **`BookingFlow`** (clinic products only)     |
| **mobile**       | Explore detail → **`/booking/mobile-request`**                             | No dedicated mobile-request UI in **`src/`** snapshot              |
| **hybrid**       | Explore detail → **`/booking/choose-mode`** → clinic **or** mobile request | Same as clinic for slot booking only; **no** hybrid chooser on web |

## Native files

| Concern                             | Path                                                                 |
| ----------------------------------- | -------------------------------------------------------------------- |
| Practitioner card / CTAs            | **`app/(tabs)/explore/[id].tsx`**                                    |
| Hybrid chooser                      | **`app/booking/choose-mode.tsx`**                                    |
| Clinic modal booking                | **`app/booking/index.tsx`**                                          |
| Mobile request                      | **`app/booking/mobile-request.tsx`**                                 |
| Marketplace list + `therapist_type` | **`lib/api/marketplace.ts`**, hook **`useMarketplacePractitioners`** |

## Web files

| Concern                                   | Path                                                                                   |
| ----------------------------------------- | -------------------------------------------------------------------------------------- |
| Discovery list (shows type, hybrid badge) | **`src/pages/discovery/TherapistSearch.tsx`**                                          |
| Booking                                   | **`src/pages/client/ClientBooking.tsx`**, **`src/components/booking/BookingFlow.tsx`** |
| Product fetch / RPC helpers               | **`src/lib/clientMarketplaceBooking.ts`**                                              |
| Practitioner manual booking               | **`src/pages/practice/ManualBooking.tsx`** — clinic **`appointment_type`** only (v1)   |

## Parity gaps to track

- Web **hybrid** clients cannot pick “mobile vs clinic” from **`ClientBooking`** alone; native **`choose-mode`** is the reference UX.
- **`TherapistSearch`** “Book” link does not pass `guest=1`; auth expectations depend on surrounding shell.

See also **`docs/product/cash-bookings-v1-plan.md`** and **`docs/product/MOBILE_WEB_FULL_SCREEN_INVENTORY.md`** for roadmap items.
