# Scheduling Model UX and Logic Audit (Verified)

Date: 2026-03-08  
Scope: scheduling availability and conflict logic consistency across guest/auth booking, practitioner scheduling, reschedule, and rebooking surfaces.
Last re-verified: 2026-03-08 (code paths + checked-in migrations + realtime rebooking policy)

## Audit Conclusion

Confirmed in code: the intended scheduling model is sound, but it is not consistently applied across all booking surfaces.

## Core Rules (Confirmed)

1. Modern marketplace guest/auth flows use `BookingFlow` and `GuestBookingFlow` through `CalendarTimeSelector`, which combines working hours, existing bookings, active slot holds, blocked `calendar_events`, and shared slot rules.
2. Shared booking buffer is 15 minutes by default and 30 minutes only for hybrid `mobile -> clinic`.
3. `Booking conflict` and `blocked time` are separate rules: booking conflicts use session overlap plus inter-session buffer, while blocked time uses direct overlap with practitioner `calendar_events` only.
4. Active `pending_payment` rows and active `slot_holds` block availability until expiry; expired rows are ignored.

## Confirmed Findings

1. **High**: Practitioner-side manual scheduling uses local checks and direct insert, not the shared calendar path.
   - Risk: no canonical server-side preflight behavior and incomplete mode-awareness.
   - Additional caveat: this flow does not persist `appointment_type`, so directional hybrid buffer logic cannot be applied reliably there.
   - Checked-in DB trigger guarantees direct overlap and blocked-time rejection on insert/update, but not full shared scheduling semantics.
   - Evidence:
     - `peer-care-connect/src/pages/practice/AppointmentScheduler.tsx`
     - `peer-care-connect/supabase/migrations/20251226185342_prevent_double_bookings.sql`

2. **Resolved**: Reschedule now validates blocked `calendar_events` in pre-flight and maps DB trigger errors to clear blocked-time vs booking-conflict messages.
   - Result: fewer late failures and clearer user-facing error causes.
   - Evidence:
     - `peer-care-connect/src/lib/reschedule-service.ts`

3. **High**: Legacy booking surface still computes hourly `:00` slots instead of shared quarter-hour generator and exposes unsupported 120-minute duration.
   - Risk: false availability, hidden valid `:15/:30/:45` starts, and durations that later fail shared validation (max 90).
   - Evidence:
     - `peer-care-connect/src/components/booking/UnifiedBookingModal.tsx`
     - `peer-care-connect/src/components/booking/CompleteBookingFlow.tsx`
     - `peer-care-connect/src/lib/slot-generation-utils.ts`
     - `peer-care-connect/src/lib/booking-validation.ts`

4. **Resolved (policy change)**: Rebooking fallback has been removed; rebooking suggestions are realtime RPC-only.
   - Result: no optimistic local suggestions when RPC is unavailable (returns no slot instead).
   - Evidence:
     - `peer-care-connect/src/lib/rebooking-service.ts`

5. **Medium**: 15-minute buffer does not apply around blocked time.
   - Current behavior requires practitioners to block full padded ranges explicitly.
   - Evidence:
     - `peer-care-connect/src/lib/slot-generation-utils.ts`
     - `peer-care-connect/src/lib/block-time-utils.ts`

6. **Low**: Day-level availability and same-day cutoff wording drift in edge cases.
   - Month view can look available based on working hours while yielding zero valid slots when opened.
   - Same-day slots inside 2-hour cutoff are shown as `past` instead of `too soon`.
   - Evidence:
     - `peer-care-connect/src/lib/slot-generation-utils.ts`
     - `peer-care-connect/src/components/booking/CalendarTimeSelector.tsx`

## Priority Risks

1. Practitioner manual scheduling path bypassing canonical server-side conflict checks.
2. Legacy hourly slot surfaces diverging from shared generator behavior.
3. Day-level availability/cutoff wording inconsistencies in edge cases.

## Residual Caveat

Checked-in migration history is inconsistent about the canonical booking RPC and hold timing, so frontend/shared slot utilities currently provide clearer operational truth than the migration set alone.

Evidence:

- `peer-care-connect/supabase/migrations/20260203_reduce_booking_hold_time.sql`
- `peer-care-connect/AVAILABILITY_BOOKING_COMPLETE.md`

## Recommended Next Step

Use `docs/product/SCHEDULING_CONFLICT_EDGE_CASES_AND_PRODUCT_RULES.md` as the implementation baseline, then build a remediation backlog with:

- `issue`
- `operational impact`
- `expected rule`
- `current behavior`
- `priority`
