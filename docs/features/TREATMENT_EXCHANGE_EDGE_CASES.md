# Treatment Exchange Edge Cases

**Date:** March 2025  
**Status:** 🔍 Documented; fixes applied  
**Related:** [PRACTITIONER_DASHBOARD_EDGE_CASES.md](./PRACTITIONER_DASHBOARD_EDGE_CASES.md) (#10, #11, #12), [TREATMENT_EXCHANGE_LOGIC_GAPS.md](../../TREATMENT_EXCHANGE_LOGIC_GAPS.md)

---

## Overview

Edge cases, failure modes, and fixes for the treatment exchange flow—from sending requests through acceptance, reciprocal booking, and credit deduction.

---

## ✅ Fixed (March 2025)

### 1. **Double credit deduction** (Critical)

**Was:** Credits deducted on acceptance (`processExchangeCreditsOnAcceptance`) AND again when reciprocal was booked (`process_peer_booking_credits` for Session B).

**Now:** Per [TREATMENT_EXCHANGE_SYSTEM_DESIGN.md](../../TREATMENT_EXCHANGE_SYSTEM_DESIGN.md), credits are deducted only when BOTH practitioners have booked. `acceptExchangeRequest` no longer processes credits. `bookReciprocalExchange` processes credits for both Session A (requester→recipient) and Session B (recipient→requester) when reciprocal is created.

---

### 2. **Credit calculation mismatch** (Modal vs backend)

**Was:** Modal used `duration || 60` and `duration > 0 ? duration : 1`; backend used `calculateRequiredCredits` from credits module. Null/0 could produce inconsistent costs (e.g. 60 vs 1).

**Now:** Modal imports and uses `calculateRequiredCredits` from `@/lib/treatment-exchange` so both use the same logic.

---

### 3. **Inconsistent credit RPCs**

**Was:** `processExchangeCreditsOnAcceptance` used `process_peer_booking_credits`; `processMutualExchangeCredits` used `credits_transfer` (generic, no `session_earning`).

**Now:** Both Session A and Session B use `process_peer_booking_credits` for proper `session_payment` / `session_earning` transactions and refund alignment.

---

### 4. **500ms delay → poll** (Logic Gaps #4)

**Was:** Fixed 500ms wait after accept before `bookReciprocalExchange`; RPC might not have committed; slot could be taken during delay.

**Now:** Poll for `mutual_exchange_sessions` existence (up to 15 × 200ms) instead of fixed delay. Proceeds as soon as record exists.

---

### 5. **Credit balance re-check before accept** (Logic Gaps #8)

**Was:** Balance checked when modal opens; could change before accept (e.g. another tab).

**Now:** Re-fetch balance from `credits` table immediately before accept. If insufficient, show updated balance and block.

---

### 6. **Service selection optional** (Logic Gaps #6)

**Was:** When requester had no products, modal said "You can still accept" but button was disabled.

**Now:** When `services.length === 0`, show "Accept Request" button; call `acceptExchangeRequest` only (no reciprocal). Recipient can book return session later from dashboard once requester adds a service.

---

### 7. **Duration mismatch warning** (Logic Gaps #9)

**Was:** No validation that selected service duration matches requested duration.

**Now:** Show amber banner when `selectedService.duration_minutes !== requestedDuration`: "Duration differs from request: they asked for X min, you selected Y min."

---

### 8. **Partial success messaging** (#8)

**Was:** When reciprocal booking failed (e.g. slot taken), generic error toast.

**Now:** For slot-related errors, append: "Select another time and try again, or book your return session from your dashboard later." Call `onAccepted()` on error so parent refreshes.

---

### 9. **Stale exchange notification** (PRACTITIONER_DASHBOARD #22)

**Was:** After decline, `exchangeRequestStatuses` could lag; Accept/Decline might still appear.

**Now:** TherapistDashboard `handleDeclineExchangeRequest` immediately sets `exchangeRequestStatuses[requestId] = 'declined'` so UI updates before refetch.

---

## 📋 Open / Mitigated

### 10. **Reciprocal booking never completed** (PRACTITIONER_DASHBOARD #12)

**Scenario:** Requester A accepts B's exchange; B should book reciprocal with A. B never books.

**Status:** ✅ Mitigated – In-app reminder notification created when accept succeeds but reciprocal isn't booked (accept-only flow or partial success). Recipient sees "Book your return session" in their notification dropdown; dashboard continues to show "Action needed".

---

### 11. **Credit balance race** (PRACTITIONER_DASHBOARD #11)

**Scenario:** Balance checked when modal opens; user opens another tab and spends credits before accepting.

**Status:** ✅ Mitigated – re-check balance immediately before accept (Fixed #5). Backend also checks before reciprocal booking.

---

### 12. **Partial success (accept succeeds, reciprocal fails)**

**Scenario:** Accept creates Session A; reciprocal booking fails (e.g. slot taken). Session A exists; no Session B; credits not deducted.

**Status:** ✅ Mitigated – slot errors show actionable message; `onAccepted()` refreshes parent so dashboard shows "Book return session". User can retry from modal or dashboard.

---

## Related Docs

- [TREATMENT_EXCHANGE_SYSTEM_DESIGN.md](../../TREATMENT_EXCHANGE_SYSTEM_DESIGN.md) – Deferred credit deduction rationale  
- [TREATMENT_EXCHANGE_LOGIC_GAPS.md](../../TREATMENT_EXCHANGE_LOGIC_GAPS.md) – Detailed analysis  
- [TREATMENT_EXCHANGE_INCONSISTENCIES.md](../../TREATMENT_EXCHANGE_INCONSISTENCIES.md) – Credit/time mismatches  
- [PRACTITIONER_DASHBOARD_EDGE_CASES.md](./PRACTITIONER_DASHBOARD_EDGE_CASES.md) – #10, #11, #12, #22  
