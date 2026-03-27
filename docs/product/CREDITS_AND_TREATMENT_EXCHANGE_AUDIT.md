# Credits And Treatment Exchange Audit

## Scope

This audit covers:

- Credits frontend and backend flows
- Treatment exchange request, acceptance, reciprocal booking, and cancellation flows
- Supabase tables, RPCs, cron jobs, and RLS policies
- Current implementation risks against common ledger and reservation best practices

## What Was Verified

- `credits` / `credit_transactions` / `credit_allocations`
- `treatment_exchange_requests` / `slot_holds` / `mutual_exchange_sessions`
- `get_credit_balance`, `update_credit_balance`, `get_practitioner_credit_cost`
- `create_slot_hold_for_treatment_exchange`, `create_accepted_exchange_session`, `process_peer_booking_credits`, `credits_transfer`
- `Credits.tsx`, `treatment-exchange.ts`, dashboard request visibility, notification routing

## Fixes Applied

### 1. Slot hold linkage hardened

Problem:

- Treatment exchange requests created a slot hold through a `SECURITY DEFINER` RPC.
- The client then tried to attach `request_id` with a normal table update.
- Because the requester is not the practitioner that owns the hold, RLS could block that update silently.
- This produced orphaned holds with `request_id = null`.

Fix:

- Added `public.link_slot_hold_to_request(p_hold_id uuid, p_request_id uuid)` as a `SECURITY DEFINER` RPC.
- Updated `TreatmentExchangeService.sendExchangeRequest()` to call the RPC and fail loudly if linkage does not succeed.
- If linkage fails, the code now releases the hold and deletes the just-created request instead of leaving partial state behind.

### 2. Expired slot holds now clean up automatically

Problem:

- `release_expired_slot_holds()` existed, but there was no active cron job calling it.
- Live data confirmed an expired hold still sitting in `status = 'active'`.

Fix:

- Replaced `release_expired_slot_holds()` with a `SECURITY DEFINER` version.
- Scheduled `SELECT public.release_expired_slot_holds();` every 5 minutes.
- Ran a one-time cleanup during migration.

### 3. Credits table drift reconciled

Problem:

- Live Supabase data showed at least one row where `balance != current_balance`.
- That means reads can disagree depending on which field a function or UI path uses.

Fix:

- Reconciled `credits` from immutable `credit_transactions`.
- Verified after migration that mismatch rows dropped to `0`.

### 4. Direct client credit writes removed

Problem:

- The credits page created missing `credits` rows from the client.
- Live RLS also allowed users to insert, update, and delete their own `credits` rows, which made balance integrity too dependent on client behavior.

Fix:

- Updated `Credits.tsx` to treat a missing row as `0` instead of creating one client-side.
- Removed permissive `INSERT`, `UPDATE`, and `DELETE` policies from `public.credits`.
- Removed permissive `INSERT` on `public.credit_transactions`.
- Verified the remaining live policies are read-only for authenticated users.

### 5. Credits peer-message lookup fixed

Problem:

- `Credits.tsx` queried `mutual_exchange_sessions` using `requester_id` / `recipient_id`.
- The actual table columns are `practitioner_a_id` / `practitioner_b_id`.

Fix:

- Updated the conversation lookup to use the real session columns.

## Live Verification After Fix

- `link_slot_hold_to_request` exists in Supabase.
- `release_expired_slot_holds` cron job is active on `*/5 * * * *`.
- Expired active slot holds: `0`
- Credit balance mismatch rows: `0`
- `credits` policies for authenticated users are now read-only.

## Gaps Fixed (Migration 20260313160000)

### 1. Refund logic aligned with burn model

- **Added** `public.credits_refund(p_user_id, p_amount, p_reference_id, p_description)`: restores credits to one user and records a `refund` transaction (no transfer).
- **Updated** `cancelExchangeSession()` in `treatment-exchange.ts` to call `credits_refund(refundRecipient, refundAmount, sessionId, description)` instead of `credits_transfer()`. Only the canceller receives the refund; no deduction from the other party.

### 2. Reconcile pending requests and holds

- **Added** `public.reconcile_pending_exchange_requests()`: calls `release_expired_slot_holds()` and sets `status = 'expired'` on `treatment_exchange_requests` where `status = 'pending'` and `expires_at < NOW()`. Returns `(released_holds, expired_requests)`. Safe to run on a schedule or from admin tooling.

### 3. Single canonical `update_credit_balance`

- **Replaced** both previous overloads with one 8-arg canonical function and a 6-arg wrapper for backward compatibility.
- All balance mutations now go through the same logic (FOR UPDATE, single balance/totals update, single transaction insert). Frontend and other callers using 6 args are unchanged.

## Best-Practice Notes

The current implementation aligns with:

- Append-only ledger + cached balance (single canonical `update_credit_balance`, read-only client policies).
- Short-lived reservation holds with automatic expiry (`release_expired_slot_holds` every 5 min).
- Explicit privileged paths for cross-ownership state (e.g. `link_slot_hold_to_request`, `credits_refund`).
- Refunds as restores to the refund recipient only (no transfer), matching the burn-on-booking model.

Optional: schedule `SELECT * FROM public.reconcile_pending_exchange_requests();` (e.g. hourly) to keep pending requests and holds in sync.
