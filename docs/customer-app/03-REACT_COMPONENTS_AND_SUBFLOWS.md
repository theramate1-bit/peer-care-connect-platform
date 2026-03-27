# React components and sub-flows (customer)

Major **embedded** UI (not always 1:1 with a URL) used by client and guest journeys. Native parity should preserve **behavior** (validation, RPC calls, Edge Function payloads), not necessarily file names.

**Web root:** `peer-care-connect/src/`

**Deeper dives:** per-route behavior [`11-SCREEN_BY_SCREEN_WEB_CLIENT.md`](11-SCREEN_BY_SCREEN_WEB_CLIENT.md), navigation shell [`12-NAVIGATION_SHELL_AND_ENTRY_POINTS.md`](12-NAVIGATION_SHELL_AND_ENTRY_POINTS.md), `lib/` map [`14-CLIENT_SHARED_LIBRARIES.md`](14-CLIENT_SHARED_LIBRARIES.md).

## Client dashboard

| Component           | Path                                      | Role                                                |
| ------------------- | ----------------------------------------- | --------------------------------------------------- |
| `TheramateTimeline` | `components/client/TheramateTimeline.tsx` | Timeline of events on `ClientDashboard`             |
| —                   | `pages/client/ClientDashboard.tsx`        | Uses `useRealtimeSubscription` on `client_sessions` |

## Booking and marketplace (client)

| Component                        | Path                                                  | Role                               |
| -------------------------------- | ----------------------------------------------------- | ---------------------------------- |
| `BookingFlow`                    | `components/marketplace/BookingFlow.tsx`              | Main marketplace booking steps     |
| `GuestBookingFlow`               | `components/marketplace/GuestBookingFlow.tsx`         | Guest variant                      |
| `MobileBookingRequestFlow`       | `components/marketplace/MobileBookingRequestFlow.tsx` | Request mobile therapist           |
| `NextAvailableSlot`              | `components/marketplace/NextAvailableSlot.tsx`        | Slot selection                     |
| `HybridBookingChooser`           | `components/booking/HybridBookingChooser.tsx`         | Clinic vs mobile choice for hybrid |
| `PractitionerCard`               | `components/marketplace/PractitionerCard.tsx`         | List tiles                         |
| `ServiceBrowser`                 | `components/marketplace/ServiceBrowser.tsx`           | Services                           |
| `SmartSearch` / `ServiceFilters` | `components/marketplace/`                             | Search UX                          |
| `PaymentStatus`                  | `components/marketplace/PaymentStatus.tsx`            | Payment state display              |

**Used from:** `ClientBooking.tsx` (imports `BookingFlow`, `MobileBookingRequestFlow`, `NextAvailableSlot`, `HybridBookingChooser` + `canBookClinic`, `canRequestMobile` from `@/lib/booking-flow-type`).

## Sessions and notes (client)

| Component                | Path                                           | Role                 |
| ------------------------ | ---------------------------------------------- | -------------------- |
| `ClientSessionDashboard` | `components/client/ClientSessionDashboard.tsx` | Session cards        |
| `ClientSOAPNotesViewer`  | `components/client/ClientSOAPNotesViewer.tsx`  | Read SOAP            |
| `MobileRequestStatus`    | `components/client/MobileRequestStatus.tsx`    | Mobile request state |

## Progress and metrics

| Component                                                    | Path                                        | Role                  |
| ------------------------------------------------------------ | ------------------------------------------- | --------------------- |
| `ClientProgressChart`                                        | `components/client/ClientProgressChart.tsx` | Charts                |
| `PainMetricChart` / `ROMMetricChart` / `StrengthMetricChart` | `components/client/`                        | Metric viz            |
| `MetricTimelineChart`                                        | `components/client/MetricTimelineChart.tsx` |                       |
| `ProgressInsights`                                           | `components/client/ProgressInsights.tsx`    |                       |
| `HEPViewer`                                                  | `components/client/HEPViewer.tsx`           | Home exercise program |

## Messaging

| Component                         | Path                                          | Role                 |
| --------------------------------- | --------------------------------------------- | -------------------- |
| `RealTimeMessaging`               | `components/messaging/RealTimeMessaging.tsx`  | Full-screen messages |
| `ConversationList`                | `components/messaging/ConversationList.tsx`   |                      |
| `MessagingInterface`              | `components/messaging/MessagingInterface.tsx` |                      |
| `MessageInput` / `MessageDisplay` | `components/messaging/`                       |                      |

## Public / direct booking

| Page                     | Path                                      | Key behavior       |
| ------------------------ | ----------------------------------------- | ------------------ |
| `DirectBooking`          | `pages/public/DirectBooking.tsx`          | Slug-based booking |
| `PublicTherapistProfile` | `pages/public/PublicTherapistProfile.tsx` | Public profile     |
| `GuestBookingView`       | `pages/booking/GuestBookingView.tsx`      | Session view       |
| `FindMyBooking`          | `pages/booking/FindMyBooking.tsx`         | Email/lookup       |

## Tests co-located with flows

| File                                               | Notes                        |
| -------------------------------------------------- | ---------------------------- |
| `components/marketplace/BookingFlow.test.tsx`      | Unit/integration for booking |
| `components/marketplace/GuestBookingFlow.test.tsx` | Guest flow                   |

Use these as **acceptance references** when implementing the same flows on native.
