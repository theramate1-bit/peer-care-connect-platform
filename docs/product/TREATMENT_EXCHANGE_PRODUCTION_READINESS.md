# Treatment Exchange — Production Readiness Checklist

**Date:** 2026-03-18  
**Status:** Ready for production

---

## 1. Fraud Prevention & Edge Cases

| Item                                                    | Status |
| ------------------------------------------------------- | ------ |
| Reschedule (not Decline) for recipient                  | Done   |
| 7-day reciprocal booking deadline                       | Done   |
| Day-5 reminder (2 days left)                            | Done   |
| Configurable deadline (app_config: 5/7/14 days)         | Done   |
| Extend deadline (recipient request + requester approve) | Done   |
| Broken-accept auto-expire (daily cron)                  | Done   |
| Credits only when both book                             | Done   |

---

## 2. Database (Supabase)

| Item                                                                                         | Status |
| -------------------------------------------------------------------------------------------- | ------ |
| `reciprocal_booking_deadline` column                                                         | Done   |
| `reciprocal_reminder_sent_at` column                                                         | Done   |
| `extension_requested_at`, `extension_approved_at`, `extension_approved_by`, `extension_days` | Done   |
| `app_config.exchange_reciprocal_deadline_days`                                               | Done   |
| RPC `expire_accepted_exchange_without_reciprocal`                                            | Done   |
| RPC `send_exchange_reciprocal_reminders`                                                     | Done   |
| RPC `request_exchange_extension`                                                             | Done   |
| RPC `approve_exchange_extension`                                                             | Done   |
| Cron: expire (02:00 UTC), reminder (10:00 UTC), reconcile (every 5 min)                      | Done   |

---

## 3. Frontend

| Item                                                   | Status |
| ------------------------------------------------------ | ------ |
| Dashboard: Book return + Request extension             | Done   |
| Dashboard: Approve extension for requester             | Done   |
| Exchange Requests page: Book your return session       | Done   |
| Exchange Requests page: Request extension              | Done   |
| Exchange Requests page: Approve extension              | Done   |
| Reschedule modal copy (genuinely busy)                 | Done   |
| Notification types (reciprocal*reminder, extension*\*) | Done   |

---

## 4. Build & Quality

| Item                                    | Status    |
| --------------------------------------- | --------- |
| `npm run build`                         | Passes    |
| Linter                                  | No errors |
| ExchangeRequest type (extension fields) | Updated   |

---

## 5. Migrations

| Migration                                                              | Purpose                                  |
| ---------------------------------------------------------------------- | ---------------------------------------- |
| `20260318000000_exchange_reciprocal_deadline_and_fraud_prevention.sql` | Deadline, expire RPC, cron               |
| `20260318100000_exchange_reciprocal_reminder_config_extend.sql`        | Reminder, config, extension columns/RPCs |

**Note:** Migrations were applied via Supabase MCP. Ensure they are in `supabase/migrations/` for version control and future deploys.

---

## 6. Pre-Production Verification

- [x] Migrations on production Supabase — applied (20260315145712 exchange_reciprocal_deadline_and_fraud_prevention + reminder/extension)
- [x] `app_config.exchange_reciprocal_deadline_days` = 7
- [x] Cron jobs active: expire 02:00 UTC, reminder 10:00 UTC
- [x] Smoke test (browser): Exchange Requests page loads; Sent/Received tabs; request cards with Expired/Declined
- [x] Smoke test (browser): Dashboard loads with New Bookings
- [ ] Smoke test: Accept → Book return (requires pending received request; manual)
- [ ] Smoke test: Reschedule flow (requires pending received request; manual)

---

## 7. Documentation

| Doc                                              | Purpose                   |
| ------------------------------------------------ | ------------------------- |
| `TREATMENT_EXCHANGE_PRODUCT_NOTE.md`             | Product rules, gaps, UX   |
| `TREATMENT_EXCHANGE_RECIPROCAL_DEADLINE_SPEC.md` | Reciprocal deadline spec  |
| `TREATMENT_EXCHANGE_FRAUD_AND_EDGE_CASES.md`     | Technical details, repair |
| `TREATMENT_EXCHANGE_PRODUCTION_READINESS.md`     | This checklist            |

---

## 8. Reschedule Cap (Implemented 2026-03-18)

| Config                            | Value | Purpose                             |
| --------------------------------- | ----- | ----------------------------------- |
| `exchange_reschedule_cap`         | 2     | Max reschedules per pair per window |
| `exchange_reschedule_window_days` | 30    | Rolling window                      |

Prevents infinite reschedule loop. Per pair (either direction); after 2 declines, recipient must Accept or let expire.

---

## 9. Optional Future Work

- Email templates for `exchange_reciprocal_reminder`, `exchange_extension_requested`, `exchange_extension_approved`
- Admin UI to change `exchange_reciprocal_deadline_days`, `exchange_reschedule_cap`
