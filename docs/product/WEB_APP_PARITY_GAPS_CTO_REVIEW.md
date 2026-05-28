# Web ↔ App parity — CTO gap review (2026-05-26)

**Scope:** `peer-care-connect/` + repo-root `src/` + `theramate-ios-client/`  
**Status:** Guest booking, mobile inbox, exchange, client + practice dashboards, credits, sessions, and notifications ship-ready on web.

---

## 1. Product surface map

```mermaid
flowchart TB
  subgraph SHIP["✅ Ship-ready web + app"]
    G["Guest: book · find · view · mobile success"]
    C["Client: dashboard · sessions · booking · mobile requests"]
    P["Practitioner: dashboard · mobile · exchange · credits"]
    N["Notifications inbox"]
    $["Money: hosted Stripe · capture/release"]
  end

  subgraph PARTIAL["🟡 Partial web"]
    OPS["Deploy smoke · EAS rebuild"]
  end

  subgraph APP_P2["🔴 App only P2"]
    SUB["Native subscription"]
    PRIV["Native privacy · help"]
  end

  SHIP --> PARTIAL
  SHIP --> APP_P2
```

---

## 2. Treatment exchange (web parity)

```mermaid
sequenceDiagram
  participant A as Practitioner A requester
  participant Web as Web /practice/exchange-requests
  participant DB as Supabase
  participant B as Practitioner B recipient

  A->>DB: create exchange request
  B->>Web: Incoming tab
  Web->>DB: accept_exchange_request
  Note over DB: Leg 1 session for A on B calendar
  B->>Web: Book reciprocal session form
  Web->>DB: book_exchange_reciprocal_session
  Note over DB: Leg 2 complete · credits burn
```

```mermaid
stateDiagram-v2
  [*] --> pending: Requester sends
  pending --> accepted: Recipient accepts
  pending --> declined: Recipient requests different time
  pending --> cancelled: Requester cancels
  accepted --> reciprocal_booked: Recipient books return slot
  declined --> [*]
  cancelled --> [*]
  reciprocal_booked --> [*]
```

**Routes**

| Web                           | App             | Capability                                         |
| ----------------------------- | --------------- | -------------------------------------------------- |
| `/practice/exchange-requests` | `exchange/*`    | Inbox incoming + sent                              |
| `?request=<uuid>`             | `exchange/[id]` | Accept · different time · cancel · reciprocal book |

---

## 3. Mobile requests (reference)

```mermaid
sequenceDiagram
  participant Client
  participant Web
  participant Stripe as stripe-payment
  participant DB as RPC

  Client->>Web: MobileBookingRequestFlow
  Web->>DB: create_mobile_booking_request
  Web->>Stripe: hosted checkout
  Note over Web: /practice/mobile-requests
  Web->>Stripe: capture-mobile-payment
  Web->>DB: accept_mobile_booking_request
```

---

## 4. Client journey (PM)

```mermaid
journey
  title Signed-in client web
  section Discover
    Marketplace browse: 5: Client
    Book clinic or mobile: 4: Client
  section Track
    Dashboard next session: 5: Client
    Mobile requests list: 4: Client
    Find booking by email: 5: Guest
```

---

## 5. Code review log (cumulative)

| ID       | Severity | Finding                              | Status                                                           |
| -------- | -------- | ------------------------------------ | ---------------------------------------------------------------- |
| CR-01–09 | P0–P2    | Auth, UI kit, mobile inbox, currency | **Fixed** (Sprint 6–7)                                           |
| CR-10    | P1       | Exchange web = placeholder           | **Fixed** — `ExchangeRequestsPage` + `practitionerExchange.ts`   |
| CR-11    | P1       | Client dashboard = placeholder       | **Fixed** — `ClientDashboard.tsx` + `clientSessions.ts`          |
| CR-12    | P2       | Credits page placeholder             | **Fixed** — `CreditsPage.tsx` + `credits.ts`                     |
| CR-13    | P2       | Practice dashboard placeholder       | **Fixed** — `PracticeDashboard.tsx` + `practitionerDashboard.ts` |
| CR-14    | P2       | Notifications placeholder            | **Fixed** — `NotificationsPage.tsx`                              |
| CR-15    | P2       | Client sessions placeholder          | **Fixed** — `ClientSessions.tsx`                                 |

---

## 6. Sprint 9 (PM) — practitioner + client hub

```mermaid
flowchart LR
  D["/dashboard"] --> M["Mobile requests"]
  D --> X["Exchange"]
  D --> T["Today sessions"]
  CR["/credits"] --> X
  CS["/client/sessions"] --> CB["/client/booking"]
  CD["/client/dashboard"] --> CS
```

| Item                                                      | Status                                |
| --------------------------------------------------------- | ------------------------------------- |
| Practice dashboard (today, actions, month stats)          | **Done**                              |
| Credits balance + transactions                            | **Done**                              |
| Client sessions upcoming/past                             | **Done**                              |
| Notifications list                                        | **Done**                              |
| QA `/dashboard` + `/credits` + `/client/sessions`         | **QA**                                |
| Admin verification (`/admin/verification`)                | **Done** — queue + verify             |
| Pricing (`/pricing`)                                      | **Done** — plans, fees, Stripe portal |
| `/client/sessions` route regression                       | **Fixed**                             |
| Practitioner care plans (`/practice/treatment-plans`)     | **Done**                              |
| Clinical vault + SOAP editor                              | **Done**                              |
| Public marketing + legal (`/about`, `/help`, `/terms`, …) | **Done**                              |
| Auth (`/register`, `/reset-password`, `/auth/callback`)   | **Done**                              |
| Deploy smoke (`deploy:stripe-payment`)                    | Ops                                   |

---

## 7. Build gate

```bash
cd peer-care-connect
export VITE_SUPABASE_URL=...
export VITE_SUPABASE_ANON_KEY=...
npm run build
```

---

## Related

- [WEB_APP_FEATURE_PARITY.md](./WEB_APP_FEATURE_PARITY.md)
- [TREATMENT_EXCHANGE_MOBILE_SCREEN_FLOWS.md](./TREATMENT_EXCHANGE_MOBILE_SCREEN_FLOWS.md)
