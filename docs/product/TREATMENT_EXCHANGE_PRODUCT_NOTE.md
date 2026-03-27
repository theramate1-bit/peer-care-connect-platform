# Treatment Exchange: Product Note — Gaps, Rules & Fraud Prevention

**Audience:** Product, design, support  
**Date:** 2026-03-18  
**Status:** Implemented

---

## Product Rules (Canonical)

These are the rules the product must enforce.

| Rule                                        | Description                                                                                                                                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R1. Reschedule, not Decline**             | The recipient (practitioner whose slot is requested) may not "Decline". They may only "Reschedule" — release the slot and suggest when they're available. Prevents abuse and supports genuinely busy practitioners. |
| **R2. 7-day reciprocal deadline**           | After the recipient accepts, they must book their return session within 7 days. If they don't, the exchange auto-expires and both parties are notified.                                                             |
| **R3. Credits only when both book**         | Credits are deducted only when both practitioners have booked their sessions. No credit fraud from accept-then-never-book.                                                                                          |
| **R4. Broken accept cleanup**               | Accepted requests with no underlying mutual session (e.g. from a failed accept) are auto-expired daily. Requester is notified.                                                                                      |
| **R5. Genuinely busy = Reschedule + notes** | When the recipient can't do the requested time, they use Reschedule and should suggest alternative availability in the notes field.                                                                                 |

---

## Gaps Identified and Resolved

| Gap                      | Risk                                                   | Resolution                                                        |
| ------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------- |
| Accept-then-never-book   | Recipient gets requester's session, never reciprocates | 7-day deadline; auto-expire; cancel mutual session                |
| Recipient Decline        | Could walk away without engaging                       | Replaced with Reschedule; copy encourages suggesting alternatives |
| Broken accepts           | Failed accept leaves request stuck as "accepted"       | Daily cron detects and expires; requester notified                |
| Genuinely busy edge case | Practitioners worried they'd have to decline           | Reschedule framing + notes field for suggested times              |
| Credits fraud            | One party could take without giving                    | Credits only deducted when both have booked                       |

---

## Implemented (2026-03-18)

| Feature                | Implementation                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| Configurable deadline  | `app_config.exchange_reciprocal_deadline_days` — 5, 7, or 14. Default 7.                  |
| Reminder before expiry | Day-5 reminder: "You have 2 days left to book your return session." Cron daily 10:00 UTC. |
| Extend deadline        | Recipient requests +1–7 days (default 3); requester approves. UI in New Bookings.         |

## Suggested Rules for Future Consideration

| Suggestion         | Rationale                                                                                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reschedule cap** | If abuse observed (e.g. same recipient rescheduling repeatedly), consider a max (e.g. 2 reschedules per requester/recipient per month). Not implemented; monitor first. |

---

## UX Copy Summary

- **Reschedule modal title:** "Request Different Time"
- **Reschedule description:** "Genuinely busy at this time? Release the slot and suggest when you're available. [Requester] can then send a new request."
- **Notes placeholder:** "e.g. I'm available Tuesdays after 2pm, or next week"
- **Toast after Reschedule:** "Slot released. The requester can send a new request for a different time."

---

## References

- Technical details: `TREATMENT_EXCHANGE_FRAUD_AND_EDGE_CASES.md`
- Reciprocal deadline spec: `TREATMENT_EXCHANGE_RECIPROCAL_DEADLINE_SPEC.md`
