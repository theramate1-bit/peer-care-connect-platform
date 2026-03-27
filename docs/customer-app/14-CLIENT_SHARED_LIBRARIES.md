# Shared libraries used by client screens (`peer-care-connect/lib`)

Quick map of **`lib/`** modules that **client routes** depend on — native implementations should mirror **behavior** (same RPCs, same validation).

| Library                              | Used by (examples)              | Notes                                                         |
| ------------------------------------ | ------------------------------- | ------------------------------------------------------------- |
| `lib/booking-flow-type.ts`           | `ClientBooking`, `Marketplace`  | `canBookClinic`, `canRequestMobile` — practitioner type rules |
| `lib/session-display-status.ts`      | `ClientDashboard`, `MySessions` | Display status vs raw DB status                               |
| `lib/my-sessions-filters.ts`         | `MySessions`                    | Filter + practitioner list                                    |
| `lib/messaging.ts`                   | `MySessions`, `Marketplace`     | `MessagingManager`                                            |
| `lib/hep-service.ts`                 | `MySessions`, `MyExercises`     | Home exercise programs                                        |
| `lib/rebooking-service.ts`           | `MySessions`                    | Rebooking                                                     |
| `lib/session-metrics-association.ts` | `MySessions`                    | HEP notes filtering                                           |
| `lib/geo-search-service.ts`          | `Marketplace`                   | Distance + discovery                                          |
| `lib/location.ts`                    | `Marketplace`                   | `LocationManager`                                             |
| `lib/avatar-generator.ts`            | `ClientFavorites`               | Avatar URLs                                                   |
| `lib/file-upload.ts`                 | `ClientProfile`                 | Profile photo                                                 |
| `lib/date.ts`                        | Multiple                        | Formatting                                                    |
| `lib/analytics.ts`                   | `Marketplace`                   | Events                                                        |

**Hooks**

| Hook                    | Used by                                 | Notes             |
| ----------------------- | --------------------------------------- | ----------------- |
| `hooks/use-realtime.ts` | Dashboard, sessions, profile, exercises | Supabase Realtime |

**Components** (outside `lib` but critical)

| Area        | Path                                           |
| ----------- | ---------------------------------------------- |
| Client UI   | `components/client/*`                          |
| Marketplace | `components/marketplace/*`                     |
| Booking     | `components/booking/HybridBookingChooser.tsx`  |
| Session     | `components/session/ClientProgressTracker.tsx` |
| Messaging   | `components/messaging/*`                       |

---

## Types

`src/types/roles.ts` — `isClient`, `isPractitioner` used in `Header` and guards.
