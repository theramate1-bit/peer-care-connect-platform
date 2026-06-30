# Realtime cross-surface QA

**Goal:** Session, availability, and block changes on **web** appear on **mobile** practitioner diary (and vice versa) without manual refresh.

**Related:** [APP_WEB_MOBILE_DRIFT_AUDIT.md](../product/APP_WEB_MOBILE_DRIFT_AUDIT.md) § Realtime checklist.

---

## Subscriptions (expected)

| Table                       | Web (`BookingCalendar`)              | Mobile (`usePractitionerDiaryRealtime`)       |
| --------------------------- | ------------------------------------ | --------------------------------------------- |
| `client_sessions`           | `therapist_id` or `client_id` filter | Separate channels for therapist + client role |
| `practitioner_availability` | `user_id=eq.<practitioner>`          | Same                                          |
| `calendar_events` (blocks)  | `user_id=eq.<practitioner>`          | Same                                          |

Publications (Supabase): `client_sessions`, `notifications`, `subscriptions`, `calendar_events`, `practitioner_availability`.

---

## Test matrix (manual, ~30 min)

Use **two browsers/devices**: practitioner signed in on **app** (Diary tab) and **web** (`/practice/schedule` or dashboard calendar).

| #   | Action (surface A)                          | Expect on surface B                                            | Pass |
| --- | ------------------------------------------- | -------------------------------------------------------------- | ---- |
| R1  | Web: create/confirm client session tomorrow | App diary shows new event within **10s**                       | ☐    |
| R2  | App: reschedule session time                | Web calendar updates within **10s**                            | ☐    |
| R3  | Web: add block time                         | App diary shows block within **10s**                           | ☐    |
| R4  | Web: change weekly availability             | App schedule slot grid updates after navigation or **10s**     | ☐    |
| R5  | Client sends message (web)                  | Practitioner app messages thread updates (separate from diary) | ☐    |

**Fail criteria:** Required hard refresh or app kill to see change.

---

## Troubleshooting

| Symptom                | Check                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| No updates             | Supabase Dashboard → Database → Replication → publication includes table                 |
| Web only               | `peer-care-connect/src/components/BookingCalendar.tsx` — `useRealtimeSubscription` hooks |
| App only               | `theramate-ios-client/hooks/usePractitionerDiaryRealtime.ts`                             |
| Stale after background | App: bring to foreground; auth `startAutoRefresh` in `_layout.tsx`                       |

---

## Automation (future)

- Playwright: change session via API/service role → assert web calendar DOM updates.
- Maestro: not suitable for cross-browser realtime; keep manual for Wave 1.

Record results in `docs/testing/reports/realtime-qa-YYYY-MM-DD.md` (gitignored).
