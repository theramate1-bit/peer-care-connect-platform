# Treatment Exchange — Mobile Screen Flows (CTO / PM)

**Date:** 2026-05-21  
**Scope:** Native practitioner app (`theramate-ios-client`)  
**Status:** Screen-readiness remediation applied — use these diagrams as the source of truth for QA, Maestro, and web parity.

**Companion (backend + cross-platform):** [`docs/features/how-treatment-exchange-works.md`](../features/how-treatment-exchange-works.md) — golden state machine and RPC sequences aligned with prod; this file is the **mobile screen** layer on top.

---

## 1. Master navigation

```mermaid
flowchart TB
  subgraph entry [Entry surfaces]
    Home["Home — Action required"]
    Profile["Profile → Treatment exchange"]
    Credits["Credits → Treatment exchange"]
    MR["Mobile requests snapshot"]
    Push["Push / in-app notification"]
  end

  subgraph core [Core exchange routes]
    HUB["/(practitioner)/exchange<br/>Discover | Inbox"]
    DET["/(practitioner)/exchange/[id]<br/>Request detail"]
  end

  subgraph modals [Shared modals]
    SEND["Send request modal"]
    SLOT["Reciprocal slot modal<br/>ExchangeReciprocalSlotModal"]
  end

  subgraph sessions [Peer sessions]
    SCH["Schedule diary — peer filter"]
    BD["/(ptabs)/bookings/[id]"]
  end

  Home --> MR
  Home --> HUB
  Profile --> HUB
  Credits --> HUB
  MR --> HUB
  MR --> DET
  Push --> DET
  Push --> HUB

  HUB --> SEND
  HUB --> SLOT
  DET --> SLOT
  HUB --> DET

  SCH --> BD
  Credits --> BD
  BD -->|View exchange request| DET
```

---

## 2. Inbox queue model (corrected)

Four **active** queues — no terminal history list (detail-by-ID / notifications only).

```mermaid
flowchart TD
  IN[Inbox segment] --> Q1["① Book your return session<br/>viewer = recipient<br/>practitioner_b_booked = false"]
  IN --> Q2["② Waiting for their return book<br/>viewer = requester<br/>practitioner_b_booked = false"]
  IN --> Q3["③ Waiting on them<br/>status = pending, you sent"]
  IN --> Q4["④ Needs your response<br/>status = pending, incoming"]

  Q1 --> A1[Choose date and time → slot modal]
  Q1 --> A2[Request more time 3d]
  Q2 --> A3[View details — approve extension if asked]
  Q3 --> A4[Cancel request]
  Q4 --> A5[Accept]
  Q4 --> A6[Request different time]
```

| Queue                             | API                                                   | Primary actions                |
| --------------------------------- | ----------------------------------------------------- | ------------------------------ |
| ① Return book (recipient)         | `fetchAcceptedExchangesNeedingReciprocal`             | Slot modal, extension          |
| ② Awaiting their book (requester) | `fetchAcceptedExchangesAwaitingReciprocalByRequester` | View detail, approve extension |
| ③ Outgoing pending                | `fetchPendingExchangeRequestsSentByRequester`         | Cancel                         |
| ④ Incoming pending                | `fetchPendingExchangeRequestsForRecipient`            | Accept, Request different time |

---

## 3. Discover + send

```mermaid
sequenceDiagram
  participant P as Practitioner
  participant UI as Discover panel
  participant API as create_treatment_exchange_request

  P->>UI: Opt in (treatment_exchange_opt_in)
  P->>UI: Pick peer + Send request modal
  UI->>UI: Credit pre-check (balance ≥ duration)
  UI->>API: Send with date/time/duration
  alt CONFLICT_*
    API-->>UI: Error
    UI-->>P: formatExchangeConflictMessage
  else OK
    API-->>UI: Request pending
    UI-->>P: Appears in queue ③
  end
```

**Copy rule:** Recipient action is always **“Request different time”** (RPC `decline_exchange_request`) — never “Decline”.

---

## 4. Request detail — state machine

```mermaid
stateDiagram-v2
  [*] --> pending

  pending --> accepted: Recipient Accept
  pending --> declined: Recipient Request different time
  pending --> cancelled: Requester Cancel

  accepted --> reciprocal_due: Recipient owes return book
  reciprocal_due --> complete: book_exchange_reciprocal_session

  accepted --> ext_pending: Recipient Request extension
  ext_pending --> accepted: Requester Approve extension

  accepted --> awaiting_peer: Requester waits for reciprocal
  awaiting_peer --> complete: Recipient books return

  declined --> [*]
  cancelled --> [*]
  expired --> [*]
  complete --> [*]

  note right of reciprocal_due
    Inline Choose date and time
    opens shared slot modal
  end note

  note right of awaiting_peer
    Banner: Waiting for {name}
    to book return session
  end note
```

| Status                   | Recipient                      | Requester                         |
| ------------------------ | ------------------------------ | --------------------------------- |
| `pending`                | Accept, Request different time | Cancel request                    |
| `accepted` + owes return | Choose date and time (modal)   | Waiting banner; approve extension |
| `declined`               | —                              | Read availability note            |
| Terminal                 | Back to list                   | Back to list                      |

**Timestamp copy:** Footer uses **“Different time requested”** (not “Declined”).

---

## 5. Reciprocal slot modal (shared component)

Used from **Inbox queue ①** and **Request detail** (recipient).

```mermaid
flowchart TD
  O[Choose date and time] --> L[get_exchange_reciprocal_available_slots]
  L --> E{Slots?}
  E -->|Yes| S[Tap slot]
  S --> C[Confirm alert]
  C --> B[book_exchange_reciprocal_session]
  B --> OK[Credits via process_peer_booking_credits when both legs done]
  E -->|No| X[Ask requester to free time<br/>or request extension]

  B --> ERR{Error?}
  ERR -->|CONFLICT_*| M[formatExchangeConflictMessage]
```

**Maestro:** `testID="exchange-choose-reciprocal"` or text **“Choose date and time”** — not “Book return”.

---

## 6. Peer session booking detail

```mermaid
flowchart TD
  BD[Booking detail] --> PEER{is_peer_booking?}
  PEER -->|No| CLIENT[Reschedule, Message client, payment flows]
  PEER -->|Yes| PX[Treatment exchange session card]
  PX --> LINK[View exchange request → detail]
  PX --> CANCEL[Cancel exchange session<br/>process_peer_booking_refund]
  PX --> MSG[Message practitioner]
  PEER -->|Yes| NO_RS[Generic reschedule hidden]
```

**Logic guard:** Peer sessions must **not** use diary reschedule — exchange state machine owns slot changes.

---

## 7. End-to-end happy path

```mermaid
sequenceDiagram
  participant A as Requester
  participant B as Recipient
  participant DB as Supabase

  A->>DB: create_treatment_exchange_request
  Note over A: Inbox ③ Waiting on them
  B->>DB: accept_exchange_request
  Note over B: Inbox ① Book return
  Note over A: Inbox ② Waiting for their book
  DB->>DB: Leg-1 client_sessions row
  B->>DB: book_exchange_reciprocal_session
  DB->>DB: Leg-2 + process_peer_booking_credits
  Note over A,B: Both see sessions in Schedule (peer)
```

---

## 8. Remediation log (2026-05-21)

| ID    | Fix                                                                  |
| ----- | -------------------------------------------------------------------- |
| L2    | Inbox queue ② + requester detail banner                              |
| L3    | Inline reciprocal slot modal on detail                               |
| L4    | Hide generic reschedule on peer booking detail                       |
| L5    | View exchange request link from peer session                         |
| C1    | “Decline” → “Request different time” copy sweep                      |
| C2    | Detail timestamp “Different time requested”                          |
| C3    | Maestro taps `exchange-choose-reciprocal`                            |
| C4/C5 | Message practitioner; no client reschedule copy on peer              |
| C6    | Detail reschedule uses `formatExchangeConflictMessage`               |
| L2b   | Home dashboard extension-pending + accept invalidates awaiting cache |

**Still open (not in this PR):** terminal history inbox, web parity, deep-link routes, notification “Client” label rules (Gap 6).

---

## 9. QA checklist

- [ ] Requester sees queue ② after recipient accepts
- [ ] Recipient books return from hub **or** detail (same modal)
- [ ] Peer booking detail: no reschedule; link to exchange request works
- [ ] Copy never says “Decline” on mobile exchange surfaces
- [ ] Maestro recipient flow passes with `exchange-choose-reciprocal`
- [ ] `npm run typecheck:mobile` passes
