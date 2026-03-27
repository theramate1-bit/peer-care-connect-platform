# Email Header Punctuation Rule

**Designer:** Sally (UX Designer)  
**Date:** 2026-03-15  
**Status:** In effect for all TheraMate email templates.

---

## Rule

**Use an exclamation mark ("!")** in the H1 header when the email announces a **positive, action-complete outcome** that the recipient will be glad to see.

**Do not use "!"** when the email is:

- **Informational** (reminders, updates)
- **Negative** (cancelled, declined, expired)
- **Neutral** (rescheduled, new message, new request awaiting action)

---

## Decision Table

| Scenario                                    | Example                                                           | Punctuation |
| ------------------------------------------- | ----------------------------------------------------------------- | ----------- |
| Booking confirmed (client or practitioner)  | "Booking Confirmed!", "New Booking Received!"                     | !           |
| Payment received / confirmed                | "Payment Confirmed!", "Payment Received!"                         | !           |
| Credits earned                              | "Credits Earned!"                                                 | !           |
| Welcome / onboarding                        | "Welcome to TheraMate!"                                           | !           |
| Request accepted (positive outcome)         | "Request Accepted!"                                               | !           |
| Reminders (24h, 2h, 1h)                     | "Session Reminder", "Session in 2 Hours", "Session Starting Soon" | None        |
| Cancellation / refund                       | "Session Cancelled", "Peer Treatment Cancelled"                   | None        |
| Declined / expired                          | "Request Declined", "Request Expired"                             | None        |
| Credits deducted                            | "Credits Deducted"                                                | None        |
| Rescheduled                                 | "Session Rescheduled"                                             | None        |
| New message / new request (awaiting action) | "You have a new message", "New Mobile Request"                    | None        |

---

## Rationale

- **Consistency:** Recipients subconsciously notice tone. Mixed punctuation feels arbitrary.
- **Clarity:** "!" signals celebration; its absence signals information or caution.
- **Maintainability:** Future templates should follow this rule. Check this doc when adding new email types.

---

## Application (2026-03-15)

Applied across all 21 templates in `supabase/functions/send-email/index.ts`. Headers updated where they violated the rule.

**Related:** [EMAIL_INCONSISTENCY_AUDIT.md](./EMAIL_INCONSISTENCY_AUDIT.md) – full audit and fix log.
