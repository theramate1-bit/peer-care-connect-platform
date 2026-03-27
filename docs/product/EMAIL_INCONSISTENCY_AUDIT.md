# Email Inconsistency Audit

**Designer:** Sally (UX Designer)  
**Date:** 2026-03-15  
**Context:** Ongoing quality check of TheraMate’s 21 email templates. Even when each email works correctly, inconsistencies make the system feel less trustworthy and harder to maintain.

---

## Executive Summary

Across the 21 templates, there are several UX and structural inconsistencies that are worth fixing. None of them break functionality, but they weaken perceived quality and make future changes harder. This audit lists them and suggests resolutions.

---

## 1. Header Title Punctuation (Exclamation Marks)

**Issue:** Mixed use of exclamation marks in H1 headers.

| With "!"                          | Without "!"                           |
| --------------------------------- | ------------------------------------- |
| Booking Confirmed!                | Booking Received                      |
| New Booking Received!             | Payment Confirmed                     |
| Payment Received!                 | Session Reminder                      |
| Session Starting Soon!            | Session in 2 Hours                    |
| Peer Treatment Booking Confirmed! | Session Cancelled                     |
| New Peer Treatment Booking!       | Session Rescheduled                   |
| Credits Earned!                   | Credits Deducted                      |
| Welcome to TheraMate!             | Peer Treatment Cancelled              |
|                                   | You have a new message                |
|                                   | New Mobile Request                    |
|                                   | Request Accepted / Declined / Expired |

**Resolution (2026-03-15):** Option A adopted. Rule documented in [`EMAIL_HEADER_PUNCTUATION_RULE.md`](./EMAIL_HEADER_PUNCTUATION_RULE.md) and applied:

- **Payment Confirmed** → **Payment Confirmed!** (positive outcome)
- **Session Starting Soon!** → **Session Starting Soon** (reminder, not celebration)
- **Request Accepted** → **Request Accepted!** (positive outcome)

---

## 2. Section Block Structure

**Issue:** Some templates use a styled block with an explicit heading; others don’t.

| Template                                 | Wrapper class                | H3 heading                    |
| ---------------------------------------- | ---------------------------- | ----------------------------- |
| Session-based (most)                     | `session-details`            | "Session Details" ✅          |
| payment_confirmation_client              | `details`                    | **None** ❌                   |
| payment_received_practitioner            | `payment-details`            | "Payment Breakdown" ✅        |
| booking_request_practitioner             | `details`                    | **None** ❌                   |
| cancellation                             | `cancellation-details`       | "Cancellation Details" ✅     |
| rescheduling                             | `reschedule-details`         | "Updated Session Details" ✅  |
| peer\_\* (credits)                       | `credit-info`, `refund-info` | "Credit Information", etc. ✅ |
| mobile_request_accepted/declined/expired | None                         | None (inline only)            |

**Recommendation:** Add an H3 where it’s missing:

- **payment_confirmation_client:** Add `<h3>Payment Summary</h3>` or `<h3>Transaction Details</h3>`.
- **booking_request_practitioner:** Add `<h3>Request Details</h3>` or `<h3>Booking Request</h3>`.
- **mobile*request*\***: Consider wrapping the status/payment/date info in a `details` block with an H3 for visual consistency.

---

## 3. HTML Formatting

**Issue:** Four templates use compact HTML; the rest use multiline, indented HTML.

**Compact (harder to read/diff):**

- `booking_request_practitioner` – `<html><head>`, `<body></body></html>` on single lines
- `mobile_request_accepted_client`
- `mobile_request_declined_client`
- `mobile_request_expired_client`

**Recommendation:** Use the same multiline, indented structure as the other templates. Easier maintenance and clearer diffs.

---

## 4. CTA Container Spacing

**Issue:** Minor CSS inconsistency.

- Most templates: `text-align: center; margin: 30px 0;`
- `payment_confirmation_client`, `booking_request_practitioner`: `text-align:center;` (no space after colon)

**Recommendation:** Normalize to `text-align: center;` across all templates.

---

## 5. Message Header Wording

**Issue:** One header stands out linguistically.

- `message_notification_guest`: "You have a new message" – correct but feels less aligned with other titles.
- Others: "Booking Confirmed!", "Session Cancelled", "Request Accepted", etc.

**Recommendation:** Consider "New Message" or "You Have a New Message" to keep tone consistent without changing meaning.

---

## 6. Audit Checklist Document (Out of Date)

**Issue:** `docs/product/EMAIL_20_UX_DESIGN_AUDIT_CHECKLIST.md` still shows ❌ for:

- Preheader text
- Header logo
- Primary CTA hierarchy
- Mobile-friendly CTA size
- Dark mode

These were implemented 2026-03-15 (preheader, logo, CTA hierarchy, MJML wrapper, dark mode, Juice inlining). The checklist rows and summary table are out of date.

**Recommendation:** Update the checklist so Preheader, Logo, Primary CTA, Mobile CTA, and Dark mode are ✅ where implemented, and add a short “Last updated” note.

---

## 7. Section Heading Naming

**Issue:** Slight variation in how similar concepts are labeled.

| Concept      | Labels used                                                                      |
| ------------ | -------------------------------------------------------------------------------- |
| Session info | "Session Details", "Updated Session Details"                                     |
| Payment info | "Payment Breakdown", (none for payment_confirmation_client)                      |
| Cancellation | "Cancellation Details"                                                           |
| Credits      | "Credit Information", "Credits Deducted", "Credits Earned", "Refund Information" |
| Request info | (none – booking_request has no heading)                                          |

**Recommendation:** Standardize:

- Session blocks → "Session Details"
- Reschedule → "Updated Session Details" (already used)
- Payment/client → "Transaction Details" or "Payment Summary"
- Payment/practitioner → "Payment Breakdown" (keep)
- Request details → "Request Details" or "Booking Request"

---

## Summary: Suggested Fix Order

| #   | Fix                                                                             | Effort | Status             |
| --- | ------------------------------------------------------------------------------- | ------ | ------------------ |
| 1   | Update EMAIL_20_UX_DESIGN_AUDIT_CHECKLIST.md                                    | Low    | ✅ Done 2026-03-15 |
| 2   | Add H3 headings to payment_confirmation_client and booking_request_practitioner | Low    | ✅ Done 2026-03-15 |
| 3   | Normalize `text-align` (space after colon)                                      | Low    | ✅ Done 2026-03-15 |
| 4   | Reformat compact HTML in 4 mobile templates to multiline                        | Low    | ✅ Done 2026-03-15 |
| 5   | Document header punctuation rule and apply consistently                         | Medium | ✅ Done 2026-03-15 |
| 6   | (Optional) Add details blocks + H3 to mobile*request*\* templates               | Medium | Deferred           |

---

_"Inconsistencies are small individually, but together they signal that no one is minding the details. A few targeted fixes will make the system feel more intentional and easier to maintain."_ — Sally (UX Designer)
