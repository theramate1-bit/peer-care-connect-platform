# Scheduling Conflict Edge Cases and Product Rules

Date: 2026-03-08  
Companion doc: `docs/product/SCHEDULING_MODEL_UX_AND_LOGIC_AUDIT_VERIFIED.md`
Last re-verified: 2026-03-08

## Purpose

Define explicit product rules for scheduling conflict logic so all booking surfaces apply the same model.

## Explicit Product Rules

1. `Booking conflict` and `blocked time` are different causes and must be explained differently in the UI.
2. `15-minute buffer` applies between sessions; blocked time only blocks direct overlap.
3. Hybrid `mobile -> clinic` requires 30-minute directional buffer; reverse direction remains 15 minutes.
4. `pending_payment` blocks availability only until expiry.
5. Month/day availability can diverge: a day can look available at month level but have zero valid slots when opened.
6. Legacy hourly slot surfaces are known drift points and must be aligned to shared slot generation.

Clarification:

- Buffer and blocked-time are intentionally different: buffer applies between sessions, while blocked-time checks overlap only.

## Edge-Case Matrix

| ID    | Area                      | Trigger                                             | Expected Rule                                                             |
| ----- | ------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| SC-01 | Conflict reason UX        | Candidate overlaps confirmed booking                | Show booking-conflict reason (not blocked-time reason)                    |
| SC-02 | Conflict reason UX        | Candidate overlaps `calendar_events` blocked period | Show blocked-time reason                                                  |
| SC-03 | Buffer logic              | Back-to-back sessions                               | Enforce 15-minute gap between sessions                                    |
| SC-04 | Hybrid directional buffer | Prior mobile then clinic session                    | Enforce 30-minute gap                                                     |
| SC-05 | Hybrid reverse direction  | Prior clinic then mobile session                    | Enforce standard 15-minute gap                                            |
| SC-06 | Pending payment hold      | `pending_payment` not expired                       | Slot blocked                                                              |
| SC-07 | Pending payment expiry    | `pending_payment` expired                           | Slot no longer blocked                                                    |
| SC-08 | Month/day mismatch        | Day appears available in month grid                 | Day view may still return zero valid slots                                |
| SC-09 | Legacy hourly surface     | Hourly-only slot generation                         | Must be replaced by shared quarter-hour logic                             |
| SC-10 | Reschedule                | Candidate overlaps blocked period                   | Reject reschedule                                                         |
| SC-11 | Rebooking suggestions     | RPC unavailable                                     | No local fallback; return no suggestion and keep realtime source-of-truth |
| SC-12 | Duration consistency      | UI offers 120-minute option                         | Must match shared validator/generator constraints                         |

## Day-to-Day Edge Cases Still Open

- [ ] Manual practitioner bookings in hybrid mode are not fully mode-aware.
- [ ] Reschedule messaging should stay consistent on all surfaces ("blocked/unavailable" vs "booking conflict").
- [ ] A day can look available in month view but have zero valid slots once opened.
- [ ] Same-day slots inside the 2-hour rule read as `past`, not `too soon`.
- [ ] Legacy flows still expose `120` minutes even though shared rules cap at `90`.
- [ ] Practitioners must manually pad blocked periods if they want non-bookable setup/travel time around them.

## Acceptance Criteria (Status Snapshot)

| AC       | Criterion                                                              | Status  |
| -------- | ---------------------------------------------------------------------- | ------- |
| AC-SC-01 | Canonical conflict logic used across all booking surfaces              | Partial |
| AC-SC-02 | Practitioner manual scheduling uses server-side protected path         | Fail    |
| AC-SC-03 | Reschedule validates blocked time as well as booking conflicts         | Pass    |
| AC-SC-04 | Shared quarter-hour slot generator used everywhere                     | Fail    |
| AC-SC-05 | Rebooking suggestions are realtime-only (no optimistic local fallback) | Pass    |
| AC-SC-06 | Conflict reason messaging is distinct and explainable                  | Partial |
| AC-SC-07 | Directional hybrid buffer behaves as product rule defines              | Partial |
| AC-SC-08 | Duration options match shared validation boundaries                    | Partial |

## Regression Checklist

1. Practitioner scheduling route cannot bypass canonical server-side conflict checks.
2. Reschedule rejects slots that overlap blocked periods.
3. Legacy hourly slot computation is removed from user-facing booking flows.
4. Rebooking suggestions are sourced from realtime RPC only; no local fallback path is used.
5. `pending_payment` holds block only while active.
6. Hybrid directional buffer behavior is covered by tests (`mobile -> clinic` = 30).
7. UI never exposes duration options outside shared validator limits.

## Backlog Template (Next Step)

Use this table to drive implementation planning:

| Issue | Operational Impact | Expected Rule | Current Behavior | Priority |
| ----- | ------------------ | ------------- | ---------------- | -------- |
|       |                    |               |                  |          |
