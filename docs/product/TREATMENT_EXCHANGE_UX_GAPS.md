# Treatment Exchange UX Gaps

**Date:** 2026-03-14  
**Author:** PM Agent (gap analysis)  
**Purpose:** Identify flows, edge cases, and illogical gaps that prevent users from enjoying the treatment exchange experience.

---

## Implementation Status (2026-03-14)

| Gap                                  | Status       | Implementation                                                                                                                           |
| ------------------------------------ | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Requester cancel                  | **Resolved** | `cancel_exchange_request_by_requester` RPC; Cancel button on Exchange Requests (sent/pending); migration `20260314240000`                |
| 2. Slot hold vs request TTL          | **Resolved** | Slot-held notification body now: "tentatively reserved (~10 min) while you decide. The request expires in 24 hours."                     |
| 3. Expired notification to requester | **Resolved** | `reconcile_pending_exchange_requests` creates `exchange_request_expired` for requester before updating status                            |
| 4. Reciprocal booking copy           | **Resolved** | SessionDetailView: "Exchange accepted. Both practitioners still need to book..." and "The exchange will complete once both have booked." |
| 5. Entry point                       | **Resolved** | Empty state (Sent tab) now has "Request a treatment exchange" CTA → `/credits#peer-treatment`                                            |
| 6. Client vs named display           | Open         | Document-only; no UI change                                                                                                              |
| 7. Decline reason placeholder        | **Resolved** | Placeholder: "e.g. I'm unavailable that day; try next week"                                                                              |
| 10. Credits check before send        | **Resolved** | `sendExchangeRequest` now checks `checkCreditBalance` and fails fast with clear message                                                  |

---

## Executive Summary

Treatment exchange has solid backend flows (credits, slot holds, reciprocal booking, refunds). Several gaps were identified and have been implemented (see Implementation Status above). Remaining open: Gap 6 (Client vs named display—documentation).

---

## Critical Gaps (User-Facing)

### 1. Requester Cannot Cancel Pending Request — **Resolved**

| What            | Doc says requester can cancel before acceptance. Implementation: no cancel button, no `cancelExchangeRequest` in service.                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Implemented** | `cancel_exchange_request_by_requester` RPC (migration 20260314240000); `TreatmentExchangeService.cancelExchangeRequest`; Cancel button on Exchange Requests (sent/pending). Releases slot hold, dismisses recipient notifications, notifies recipient. |

---

### 2. Slot Hold (10 min) vs Request Expiry (24 h) — **Resolved**

| What            | Slot hold = 10 minutes. Request = 24 hours.                                                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Implemented** | Slot-held notification body updated in exchange-notifications.ts: "Your slot on X at Y is tentatively reserved (~10 min) while you decide. The request expires in 24 hours." |

---

### 3. No Expired-Request Notification to Requester — **Resolved**

| What            | When a request expires (cron sets status=expired), the requester is not notified.                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Implemented** | `reconcile_pending_exchange_requests` (migration 20260314240000) now creates `exchange_request_expired` in-app notification for `requester_id` before updating status. |

---

### 4. Reciprocal Booking Clarity — **Resolved**

| What            | Exchange is not "confirmed" until BOTH practitioners book. Accept creates one session; recipient must book their return session.                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Implemented** | SessionDetailView copy updated: "Exchange accepted. Both practitioners still need to book their sessions to confirm—you'll be notified when complete." and "The exchange will complete once both have booked." |

---

### 5. No Entry Point to Send New Request — **Resolved**

| What            | References to `/credits#peer-treatment` exist (emails, CTAs). No clear flow to browse practitioners and send a new request.                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Implemented** | Exchange Requests empty state (Sent tab) now has "Request a treatment exchange" button → `/credits#peer-treatment`. Credits page audit still recommended for full send flow. |

---

### 6. "Client" vs Named Display — **Label Ambiguity** (Open from Notification Flows)

| What           | Items show "Client Clinic" vs "Ray Dhillon Mobile." Unclear when "Client" is intentional vs missing data.                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Where          | formatBookingNotificationPreview, notification feeds                                                                               |
| UX Impact      | Practitioner may think "Client" means anonymous client when it's actually a peer exchange; or vice versa.                          |
| Recommendation | Document rules: when to show "Client" (anonymous fallback), when practitioner name, when "Clinic" vs "Mobile." Apply consistently. |

---

### 7. Decline Reason — **Resolved**

| What            | Recipient can add `responseNotes` when declining. These appear as "Response" on the request card. Requester sees them. |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Implemented** | Placeholder updated to "e.g. I'm unavailable that day; try next week".                                                 |

---

### 8. Lazy Expiry Display — Pending Shows "Expired" Badge

| What           | ExchangeRequests shows `isRequestExpired && request.status === 'pending'` with a red "Expired" badge.                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where          | ExchangeRequests.tsx:247-249                                                                                                                                                           |
| UX Impact      | Client-side expiry (expires_at < now) can show before DB reconcile runs. User sees "Expired" but Accept/Decline may still be enabled briefly (they're hidden when `isRequestExpired`). |
| Risk           | Low; logic is consistent. Recipient might try to accept an expired request from another tab; backend rejects.                                                                          |
| Recommendation | Ensure backend always rejects expired requests (already does). No change needed unless duplicate "Expired" badges appear.                                                              |

---

### 9. Accepted Request with No Reciprocal — Stale State

| What           | Requester has "accepted" request; recipient never books reciprocal. Request stays in "accepted" state; session exists but exchange is incomplete.                 |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Where          | mutual_exchange_sessions.practitioner_b_booked = false                                                                                                            |
| UX Impact      | Requester sees session, "Waiting for [Recipient] to book." No automatic reminder or escalation.                                                                   |
| Risk           | Exchange stalls indefinitely.                                                                                                                                     |
| Recommendation | `exchange_reciprocal_booking_reminder` exists. Verify it fires for recipient. Consider requester reminder: "Your exchange with X is still pending their booking." |

---

### 10. Credits Check Before Send — **Resolved**

| What            | sendExchangeRequest does not explicitly check credits before creating request. Credits are deducted on accept (when session is created).                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Implemented** | `sendExchangeRequest` now calls `checkCreditBalance` before slot hold. Fails fast with: "You need X credits to complete this exchange, but you have Y. Earn more credits by completing client sessions." |

---

## Edge Cases / Illogical Behaviors

| #   | Scenario                                                            | Current Behavior                                                                                                           | Gap                                                                                |
| --- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| E1  | Requester sends request, then blocks that time                      | No conflict check on requester side. Recipient accepts; requester's block could overlap.                                   | Consider validating requester availability before send or at least warning.        |
| E2  | Duplicate request same practitioner                                 | Error: "You already have a pending request... cancel the existing request." Cancel now implemented.                        | Resolved.                                                                          |
| E3  | Recipient accepts, then realises wrong date                         | Session created. Would need to cancel session (possible via SessionDetailView). Refund flow exists.                        | OK if cancel + refund are clear.                                                   |
| E4  | Requester has two accepted exchanges, insufficient credits for both | Credits deducted per exchange when both book. If balance insufficient for second, second exchange would fail at deduction. | Edge case: one completes, second fails. Need clear error and possibly queue/retry. |
| E5  | Notification click → Exchange Requests → request in "Sent" tab      | Scroll-into-view works for focused request. If request is in Sent and user clicks from notification, tab switches to Sent. | Implemented.                                                                       |

---

## Wireframe / Scenario Gaps

### Missing or Unclear Flows

1. **Send request flow** — Where does user pick practitioner, date, time? Is there a calendar picker? Credit cost preview?
2. **Post-accept recipient flow** — "Book your return session" — where does this live? ExchangeAcceptanceModal, SessionDetailView, or dashboard?
3. **Empty states** — "You haven't sent any requests" — where is the CTA to send one?
4. **Credits page #peer-treatment** — Does it render? What does it show?

### Scenario Matrix Additions (from doc)

| Scenario                | Expected                                        | Gap                                                |
| ----------------------- | ----------------------------------------------- | -------------------------------------------------- |
| Requester cancels       | Request cancelled, slot released, both notified | **Implemented**                                    |
| Request expires         | Requester notified, request moves to Expired    | **Implemented**                                    |
| Recipient delays 15 min | Slot may be released; accept might fail         | Messaging clarified (~10 min tentatively reserved) |
| Both book               | Credits deducted, exchange complete             | Implemented                                        |

---

## Priority Recommendation

| Priority | Gap                                               | Effort | Impact                                                   |
| -------- | ------------------------------------------------- | ------ | -------------------------------------------------------- |
| P0       | Requester cancel (Gap 1)                          | Medium | High — documented, referenced in errors, no escape hatch |
| P0       | Expired-request notification to requester (Gap 3) | Low    | High — close feedback loop                               |
| P1       | Slot hold vs request TTL clarity (Gap 2)          | Medium | Medium — reduce confused declines/failures               |
| P1       | Credits check before send (Gap 10)                | Low    | Medium — fail fast                                       |
| P1       | Entry point / discovery (Gap 5)                   | High   | High — can't use feature without it                      |
| P2       | Reciprocal booking copy (Gap 4)                   | Low    | Medium — reduce stalled exchanges                        |
| P2       | Client vs named display (Gap 6)                   | Low    | Low — polish                                             |

---

## Related Docs

- `TREATMENT_EXCHANGE_NOTIFICATION_FLOWS.md` — notification lifecycle
- `CREDITS_AND_TREATMENT_EXCHANGE_AUDIT.md` — backend flows
- `how-treatment-exchange-works.md` — developer guide

## Migrations Applied

- `20260314240000_treatment_exchange_cancel_and_expire_notify.sql` — cancel RPC, exchange_request_cancelled enum, reconcile expired notifications
