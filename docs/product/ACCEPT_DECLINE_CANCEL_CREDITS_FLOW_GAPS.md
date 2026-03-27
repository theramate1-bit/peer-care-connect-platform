# Accept, Decline, Cancel & Credits Flow Gaps

**Date:** 2026-03-14  
**Method:** Supabase MCP (`execute_sql`), codebase audit  
**Project:** aikqnvltuwwgifuocvto (Theramate)

---

## Summary

Audit of treatment exchange and mobile request flows (accept, decline, cancel) and their interaction with credits. Most flows are well-implemented; a few gaps and edge cases remain.

---

## 1. Treatment Exchange Flows

### 1.1 Accept Flow

| Step                                                 | Implementation                                                                                          | Status       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------ |
| Validate request pending, not expired                | `acceptExchangeRequest` + `create_accepted_exchange_session`                                            | ✅           |
| Conflict check (recipient calendar)                  | `create_accepted_exchange_session` checks client_sessions + calendar_events                             | ✅           |
| Create `mutual_exchange_sessions`                    | RPC creates record, `credits_deducted = false`                                                          | ✅           |
| Create first `client_sessions` (requester as client) | RPC creates session                                                                                     | ✅           |
| Slot hold release                                    | On accept, recipient’s slot is consumed by the new session                                              | ✅           |
| Credits deducted                                     | **Only when BOTH practitioners have booked** (`bookReciprocalSession` → `process_peer_booking_credits`) | ✅ by design |
| Notifications                                        | `exchange_request_accepted`, `exchange_slot_released` to requester                                      | ✅           |

**Gap:** None. Credits are intentionally not deducted until both reciprocal sessions are booked.

---

### 1.2 Decline Flow

| Step                                 | Implementation                                       | Status   |
| ------------------------------------ | ---------------------------------------------------- | -------- |
| Update `treatment_exchange_requests` | `decline_exchange_request` RPC                       | ✅ Fixed |
| Release slot hold                    | RPC updates slot_holds status=released               | ✅ Fixed |
| Notify requester                     | RPC creates `exchange_request_declined` notification | ✅ Fixed |
| Dismiss recipient notifications      | RPC updates notifications                            | ✅ Fixed |
| Credits                              | Not involved (never deducted at request stage)       | ✅       |

**Fixed (2026-03-18):** Added `decline_exchange_request(p_request_id, p_recipient_id, p_reason)` RPC. Frontend now calls this RPC instead of direct UPDATE + slot release.

---

### 1.3 Requester Cancel Flow

| Step                            | Implementation                                   | Status |
| ------------------------------- | ------------------------------------------------ | ------ |
| Validate requester, pending     | `cancel_exchange_request_by_requester` RPC       | ✅     |
| Release slot hold               | RPC updates slot_holds status=released           | ✅     |
| Update request status           | status=cancelled                                 | ✅     |
| Dismiss recipient notifications | RPC updates notifications                        | ✅     |
| Notify recipient                | `exchange_request_cancelled`                     | ✅     |
| Credits                         | None to refund (never deducted at request stage) | ✅     |

**Gap:** None.

---

### 1.4 Exchange Session Cancel (after both booked)

| Step                              | Implementation                                                               | Status |
| --------------------------------- | ---------------------------------------------------------------------------- | ------ |
| Validate not completed            | `cancelExchangeSession`                                                      | ✅     |
| Reciprocal rule                   | Cannot cancel reciprocal if first session completed and reciprocal is future | ✅     |
| Refund calculation                | 24h+ full, 12–24h 50%, &lt;12h none                                          | ✅     |
| Refund to canceller               | `credits_refund(refundRecipient, refundAmount)`                              | ✅     |
| Update `mutual_exchange_sessions` | status=cancelled, refund_processed=true                                      | ✅     |
| Cancel related `client_sessions`  | Both peer sessions marked cancelled                                          | ✅     |

**Note:** Only the canceller receives a refund. The other practitioner does not. This is by design (see CREDITS_AND_TREATMENT_EXCHANGE_AUDIT). Confirm product intent that the non-canceller retains spent credits.

---

## 2. Mobile Request Flows

### 2.1 Accept Flow

| Step                          | Implementation                                       | Status |
| ----------------------------- | ---------------------------------------------------- | ------ |
| Validate pending, not expired | `accept_mobile_booking_request` RPC                  | ✅     |
| Conflict check                | client_sessions + calendar_events                    | ✅     |
| Capture Stripe PaymentIntent  | Frontend calls `mobile-payment` (capture) before RPC | ✅     |
| Create session                | `create_session_from_mobile_request`                 | ✅     |
| Update request                | status=accepted, payment_status=captured             | ✅     |
| Release mobile slot hold      | RPC updates slot_holds                               | ✅     |
| Notifications                 | booking_confirmed to client + practitioner           | ✅     |

**Gap:** None.

---

### 2.2 Decline Flow

| Step                         | Implementation                                                                     | Status |
| ---------------------------- | ---------------------------------------------------------------------------------- | ------ |
| Release Stripe PaymentIntent | Frontend calls `mobile-payment` (release-mobile-payment) **first**                 | ✅     |
| Update request               | `decline_mobile_booking_request` RPC sets status=declined, payment_status=released | ✅     |
| Client notification          | `sendMobileBookingDeclinedNotification`                                            | ✅     |
| Decline only when held       | UI hides Decline when payment_status=captured                                      | ✅     |

**Gap:** None. Order is correct: release Stripe first, then update DB.

---

### 2.3 Mobile Request Cancel (client/guest)

| RPC                                    | Purpose                        | Status |
| -------------------------------------- | ------------------------------ | ------ |
| `cancel_mobile_request`                | Client cancels pending request | ✅     |
| `cancel_guest_mobile_request_by_email` | Guest cancels by email         | ✅     |

**Gap:** None identified.

---

## 3. Credits Integration

### 3.1 Treatment Exchange Credits

| Event                        | Credit Action                                                                  | Status                      |
| ---------------------------- | ------------------------------------------------------------------------------ | --------------------------- |
| Send request                 | Balance check only (`checkCreditBalance`), no deduction                        | ✅ by design                |
| Accept                       | No deduction                                                                   | ✅                          |
| Reciprocal book (both)       | `process_peer_booking_credits` for both sessions; sets `credits_deducted=true` | ✅                          |
| Requester cancel             | No refund (nothing deducted)                                                   | ✅                          |
| Decline                      | No refund (nothing deducted)                                                   | ✅                          |
| Session cancel (both booked) | `credits_refund` to canceller only                                             | ✅ (confirm product intent) |

**Design:** Credits are deducted only when both practitioners have booked. No hold at send time.

**Risk:** Requester may spend credits elsewhere before reciprocal book. `process_peer_booking_credits` will fail with “Insufficient credits” if balance is too low at book time. Acceptable trade-off unless product wants a reserve-at-send model.

---

### 3.2 Credits RPCs (Supabase)

| RPC                            | Purpose                             | Verified                      |
| ------------------------------ | ----------------------------------- | ----------------------------- |
| `credits_spend`                | Deduct credits (e.g. exchange)      | Wraps `update_credit_balance` |
| `credits_refund`               | Restore credits (e.g. cancellation) | ✅                            |
| `process_peer_booking_credits` | Deduct from client for peer session | Burn model, no transfer       |
| `get_credit_balance`           | Read balance                        | ✅                            |
| `get_practitioner_credit_cost` | Cost for session duration           | ✅                            |

---

## 4. Cron Jobs (Supabase)

| Job                                 | Schedule       | Command                                                | Status    |
| ----------------------------------- | -------------- | ------------------------------------------------------ | --------- |
| release_expired_slot_holds          | _/5 _ \* \* \* | `SELECT public.release_expired_slot_holds();`          | ✅ Active |
| reconcile_pending_exchange_requests | _/5 _ \* \* \* | `SELECT public.reconcile_pending_exchange_requests();` | ✅ Active |

---

## 5. Recommended Fixes

### High priority

None. Current flows are coherent.

### Medium priority

1. **Declined exchange – orphaned slot hold** ✅ Fixed (2026-03-18)  
   `reconcile_pending_exchange_requests` now releases slot holds where linked `treatment_exchange_requests.status IN ('declined', 'cancelled')`.

### Low priority

2. **Decline RPC for treatment exchange** ✅ Fixed (2026-03-18)  
   Added `decline_exchange_request(p_request_id, p_recipient_id, p_reason)` RPC. Frontend calls it instead of direct UPDATE.

3. **Non-canceller refund on exchange cancel**  
   Revisit product decision: when one practitioner cancels after both have booked, should the non-canceller also receive a refund? Today only the canceller is refunded.

---

## 6. Tables & RPCs Referenced

| Table                       | Role                            |
| --------------------------- | ------------------------------- |
| treatment_exchange_requests | Exchange requests               |
| slot_holds                  | Holds for exchange + mobile     |
| mutual_exchange_sessions    | Exchange sessions (both booked) |
| client_sessions             | Sessions (clinic, mobile, peer) |
| credits                     | User credit balances            |
| credit_transactions         | Ledger                          |
| mobile_booking_requests     | Mobile request lifecycle        |

| RPC                                  | Role                                           |
| ------------------------------------ | ---------------------------------------------- |
| create_accepted_exchange_session     | Accept exchange                                |
| create_treatment_exchange_booking    | Book reciprocal session                        |
| process_peer_booking_credits         | Deduct credits for peer session                |
| credits_refund                       | Refund on cancel                               |
| cancel_exchange_request_by_requester | Requester cancels request                      |
| decline_exchange_request             | Recipient declines exchange request            |
| reconcile_pending_exchange_requests  | Expire requests, release holds, orphan cleanup |
| decline_mobile_booking_request       | Practitioner declines mobile request           |
| accept_mobile_booking_request        | Practitioner accepts mobile request            |
