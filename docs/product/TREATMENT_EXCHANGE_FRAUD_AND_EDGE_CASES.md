# Treatment Exchange: Fraud Prevention and Edge Cases

## Supabase Verification (2026-03-18)

Verified against project `aikqnvltuwwgifuocvto`:

| Table                         | Key columns                                                          |
| ----------------------------- | -------------------------------------------------------------------- |
| `treatment_exchange_requests` | `status`, `accepted_at`, `reciprocal_booking_deadline` (added)       |
| `mutual_exchange_sessions`    | `practitioner_a_booked`, `practitioner_b_booked`, `credits_deducted` |

**Broken accept confirmed**: Request `e301065e` – `status = 'accepted'`, `accepted_at` set, but **no** `mutual_exchange_sessions` row (from previous `require` error). Recipient cannot complete return booking.

---

## Fraud Gaps Addressed

### 1. Accept-then-never-book (recipient accepts but never books return)

**Risk**: Requester gives their slot; recipient receives treatment; recipient never reciprocates.

**Mitigation**:

- `reciprocal_booking_deadline` = `accepted_at + 7 days`
- RPC `expire_accepted_exchange_without_reciprocal()` runs daily (cron 02:00 UTC)
- If recipient doesn’t book return within 7 days: mutual session cancelled, requester’s session cancelled, both notified
- Credits not deducted until both have booked, so no credit fraud

### 2. Broken accepts (status = accepted, no mutual session)

**Cause**: RPC/accept flow failed partway (e.g. previous `require` error).

**Mitigation**:

- Same RPC detects accepted requests with no `mutual_exchange_sessions`
- Sets `status = 'expired'`, notifies requester
- **Repair path** (manual): For specific broken rows, either:
  - Reset `status = 'pending'` and `accepted_at = NULL` so recipient can re-accept, or
  - Admin creates missing `mutual_exchange_sessions` and `client_sessions` via SQL (risky; use sparingly)

### 3. Recipient “Decline” → Reschedule (genuinely busy)

**Risk**: Recipient could decline and walk away; perceived as fraud or bad UX.

**Mitigation**:

- UI replaced “Decline” with “Reschedule”
- Copy: “Can’t do this time? Release the slot so [requester] can send a new request for when you’re available.”
- Notes: “Suggest alternative time (Optional)” – e.g. “I’m available Tuesdays after 2pm”
- Same backend: `decline_exchange_request` (releases slot, notifies requester)
- Framing encourages “genuinely busy” practitioners to suggest a new time instead of rejecting outright

### 4. Reschedule fatigue (repeated reschedules)

**Risk**: Recipient repeatedly reschedules without accepting.

**Mitigation (2026-03-18)**:

- App config: `exchange_reschedule_cap` = 2, `exchange_reschedule_window_days` = 30
- `decline_exchange_request` counts declines for the same pair (either direction) in the window
- If count ≥ cap: raises `RESCHEDULE_CAP_EXCEEDED` with user-friendly message
- Recipient must Accept or let request expire after 2 reschedules

---

## Edge Cases and UX

| Scenario                               | Behavior                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| Genuinely busy                         | Use Reschedule, suggest alternative time in notes; requester sends new request          |
| Accept then unavailable to book return | 7-day deadline; auto-expire; both notified                                              |
| Broken accept (no mutual session)      | Daily cron expires; requester notified; manual repair if needed                         |
| Requester cancels after accept         | `cancelExchangeSession` handles; refund per policy (24h full, 12–24h 50%, &lt;12h none) |
| Both booked, one cancels               | Refund to canceller only; no transfer (credits were burned)                             |

---

## RPCs and Cron

| RPC                                             | Purpose                                                           | Cron                         |
| ----------------------------------------------- | ----------------------------------------------------------------- | ---------------------------- |
| `reconcile_pending_exchange_requests()`         | Pending → expired, release slot holds                             | (integrated with slot holds) |
| `expire_accepted_exchange_without_reciprocal()` | Expire broken accepts + accepted-with-no-reciprocal past deadline | Daily 02:00 UTC              |
| `release_expired_slot_holds()`                  | Release expired slot holds                                        | Every 5 min                  |

---

## Broken Accept Repair (Manual)

For request `e301065e` (or similar):

**Option A – Reset for re-accept** (safest):

```sql
UPDATE treatment_exchange_requests
SET status = 'pending', accepted_at = NULL, reciprocal_booking_deadline = NULL, recipient_notes = NULL
WHERE id = 'e301065e-4fa2-4cbb-a31f-e462d3666591';
```

Recipient can then Accept again (after the `require` fix, it should succeed).

**Option B – Create missing mutual session** (advanced):

Requires constructing `mutual_exchange_sessions` and `client_sessions` rows that match `create_accepted_exchange_session` logic. Prefer Option A unless there’s a strong reason to repair in place.

---

## References

- Product note (gaps + rules): `TREATMENT_EXCHANGE_PRODUCT_NOTE.md`
- Reciprocal deadline spec: `TREATMENT_EXCHANGE_RECIPROCAL_DEADLINE_SPEC.md`
