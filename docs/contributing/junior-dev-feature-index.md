# Junior Developer – Feature Index

**Purpose:** One-page map of where to learn about each major feature, data structure, and user type. Use this when you need to understand "what does X do?" or "how does Y work?"

---

## Data Structures & Database

| Topic                     | Doc                                                                                  | Summary                                                         |
| ------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| **Database schema**       | [database-schema.md](../architecture/database-schema.md)                             | Core tables: users, client_sessions, etc.                       |
| **Database tables (MCP)** | [database-tables-mcp-reference.md](../architecture/database-tables-mcp-reference.md) | Full MCP-derived schema; every table, columns, code links       |
| **Edge Functions**        | [edge-functions.md](../architecture/edge-functions.md)                               | All Edge Functions; purpose, callers, code links                |
| **Edge cases**            | [edge-cases-reference.md](../features/edge-cases-reference.md)                       | What happens where; booking, exchange, notifications, messaging |
| **System overview**       | [system-overview.md](../architecture/system-overview.md)                             | Architecture, stack, data flow                                  |

---

## User Types & Logic

| Topic                           | Doc                                                                                               | Summary                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Guest vs Client**             | [GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md](../product/GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md)         | Side-by-side behavior table                          |
| **Guest (user type)**           | [USER_TYPE_GUEST.md](../product/USER_TYPE_GUEST.md)                                               | Guest booking, messaging, token view, signup linking |
| **Client (user type)**          | [USER_TYPE_CLIENT.md](../product/USER_TYPE_CLIENT.md)                                             | Registered user, in-app messaging, My Sessions       |
| **Clinic practitioner**         | [PRACTITIONER_TYPE_CLINIC_BASED.md](../product/PRACTITIONER_TYPE_CLINIC_BASED.md)                 | Clinic-only; booking flow, eligibility               |
| **Mobile practitioner**         | [PRACTITIONER_TYPE_MOBILE.md](../product/PRACTITIONER_TYPE_MOBILE.md)                             | Visit-only; base + radius; mobile request flow       |
| **Hybrid practitioner**         | [PRACTITIONER_TYPE_HYBRID.md](../product/PRACTITIONER_TYPE_HYBRID.md)                             | Both clinic and mobile; base synced from clinic      |
| **Hybrid/mobile rules**         | [HYBRID_CLINIC_AND_MOBILE_BOOKING_RULES.md](../product/HYBRID_CLINIC_AND_MOBILE_BOOKING_RULES.md) | Buffers, base-only for mobile                        |
| **Guest vs client rules (dev)** | [GUEST_VS_CLIENT_RULES.md](../development/GUEST_VS_CLIENT_RULES.md)                               | Implementation rules                                 |

---

## Feature Overviews (What Does X Do?)

| Feature                | Doc                                                                                  | Summary                                                           |
| ---------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| **Diary**              | [diary-overview.md](../features/diary-overview.md)                                   | Practitioner schedule/calendar; BookingCalendar, sessions, blocks |
| **Dashboard**          | [dashboard-overview.md](../features/dashboard-overview.md)                           | Practitioner home; Today's Schedule, New Bookings, metrics        |
| **Client Management**  | [client-management-overview.md](../features/client-management-overview.md)           | Client list, sessions, treatment notes, goals                     |
| **Services & Pricing** | [services-and-pricing-overview.md](../features/services-and-pricing-overview.md)     | Products, service types, marketplace eligibility                  |
| **Treatment Exchange** | [how-treatment-exchange-works.md](../features/how-treatment-exchange-works.md)       | Credits, request flow, accept/decline                             |
| **Notifications**      | [notifications-overview.md](../features/notifications-overview.md)                   | In-app notifications, read/dismiss, routing                       |
| **Messaging**          | [messaging.md](../features/messaging.md)                                             | Practitioner–client messaging; guest email path                   |
| **Profile**            | [profile-and-onboarding-overview.md](../features/profile-and-onboarding-overview.md) | Profile page, onboarding, therapist type validation               |

---

## Clinic, Mobile & Hybrid Flows (Critical)

| Topic                              | Doc                                                                        | Summary                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Clinic / Mobile / Hybrid flows** | [clinic-mobile-hybrid-flows.md](../features/clinic-mobile-hybrid-flows.md) | Direct booking vs request→approve; sequence diagrams; confusion busters |

---

## Booking & Payments

| Topic                       | Doc                                                                  | Summary                            |
| --------------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| **How booking works**       | [how-booking-works.md](../features/how-booking-works.md)             | Booking flow steps                 |
| **Booking flows reference** | [booking-flows-reference.md](../features/booking-flows-reference.md) | Step behavior, save timing         |
| **Session location rule**   | [session-location-rule.md](../features/session-location-rule.md)     | Clinic vs Visit display            |
| **How payments work**       | [how-payments-work.md](../features/how-payments-work.md)             | Stripe, checkout                   |
| **How credits work**        | [how-credits-work.md](../features/how-credits-work.md)               | Credit economy, treatment exchange |

---

## When to Use What

| You need to…                                  | Start here                                                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Understand clinic vs mobile vs hybrid booking | [clinic-mobile-hybrid-flows.md](../features/clinic-mobile-hybrid-flows.md)                          |
| Understand a table or relationship            | [database-schema.md](../architecture/database-schema.md)                                            |
| Get exact table columns (MCP)                 | [database-tables-mcp-reference.md](../architecture/database-tables-mcp-reference.md)                |
| Understand an Edge Function                   | [edge-functions.md](../architecture/edge-functions.md)                                              |
| Know what happens in edge case X              | [edge-cases-reference.md](../features/edge-cases-reference.md)                                      |
| Understand guest vs client behavior           | [GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md](../product/GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md)           |
| Understand clinic/mobile/hybrid logic         | [PRACTITIONER_TYPE_CLINIC_BASED.md](../product/PRACTITIONER_TYPE_CLINIC_BASED.md) + Mobile + Hybrid |
| Understand what the diary shows               | [diary-overview.md](../features/diary-overview.md)                                                  |
| Understand what the dashboard shows           | [dashboard-overview.md](../features/dashboard-overview.md)                                          |
| Understand treatment exchange flow            | [how-treatment-exchange-works.md](../features/how-treatment-exchange-works.md)                      |
| Understand notifications                      | [notifications-overview.md](../features/notifications-overview.md)                                  |
| Understand messaging (guest vs client)        | [messaging.md](../features/messaging.md)                                                            |
| General onboarding                            | [junior-developer-guide.md](./junior-developer-guide.md)                                            |

---

**Last Updated:** 2026-03-15
