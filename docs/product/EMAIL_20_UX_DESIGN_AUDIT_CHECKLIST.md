# Email UX Design Audit – What Each of Our 20 Emails Is Missing

**Analyst:** Sally (UX Designer)  
**Date:** 2026-03-15  
**Last updated:** 2026-03-15 (Quick wins implemented; checklist refreshed)  
**Context:** MJML base layout, Juice inlining, preheader, header logo, and dark mode added 2026-03-15. Layout remains div-based; table-based layout still recommended for full Outlook compatibility.  
**Related:** [EMAIL_INCONSISTENCY_AUDIT.md](./EMAIL_INCONSISTENCY_AUDIT.md) – ongoing consistency checks.

---

## Executive Summary: Why Our Emails Look “Ugly” & Break

We’re building emails like web pages:

- **Google Fonts via `<link>`** → Gmail, Outlook, Yahoo often block or strip this; fallback to Arial/Georgia is inconsistent.
- **`<style>` blocks** → Many clients strip or mangle them; inline styles are safer and we don’t fully inline.
- **Div-based layout** → Outlook (desktop) and older clients expect **table-based** layouts. Flexbox/divs can collapse or misalign.
- **No MJML/React Email/Maizzle** → No automatic:
  - Table-based HTML output
  - CSS inlining
  - Client-specific fixes (Outlook conditional comments, Gmail fixes)
  - Responsive image handling

Result: Emails look broken or plain in many inboxes (Outlook, older Gmail, Yahoo, mobile clients).

---

## Checklist Per Email – What Each Is Missing

Use this as a row-per-email checklist. ✅ = present, ❌ = missing, ⚠️ = partial.

**As of 2026-03-15:** Preheader, Logo, Primary CTA hierarchy, Mobile CTA tap size (48px), and Dark mode are **implemented** for all templates. The per-email rows below were written before these fixes; the [Checklist Summary Table](#checklist-summary-table) reflects current state.

### Legend

| Code | Meaning                        |
| ---- | ------------------------------ |
| ❌   | Missing or not implemented     |
| ⚠️   | Partially done or inconsistent |
| ✅   | Present and adequate           |

---

### 1. booking_confirmation_client

| Item                                     | Status | Notes                                                         |
| ---------------------------------------- | ------ | ------------------------------------------------------------- |
| Preheader text                           | ❌     | No `<span>` preview; subject is only hook                     |
| Table-based layout                       | ❌     | Div-based; risky in Outlook                                   |
| Inline styles on all elements            | ❌     | Uses classes in `<style>`                                     |
| Web-safe fallback fonts                  | ⚠️     | Relies on Lato; no explicit `Arial,sans-serif` fallback       |
| Logo/brand asset in header               | ❌     | Text-only "TheraMate" in footer; no header branding           |
| Clear primary CTA hierarchy              | ⚠️     | 4 CTAs same style; no clear “main” action                     |
| Mobile-friendly CTA size (min ~44px tap) | ⚠️     | Padding may be too small on small screens                     |
| Preheader / preview snippet              | ❌     | No hidden preheader text                                      |
| Dark mode considerations                 | ❌     | Hard-coded colors; no `prefers-color-scheme` or dark variants |
| Alt text on images                       | N/A    | No images                                                     |

---

### 2. booking_confirmation_practitioner

| Item                        | Status | Notes                     |
| --------------------------- | ------ | ------------------------- |
| Preheader text              | ❌     | None                      |
| Table-based layout          | ❌     | Div-based                 |
| Inline styles               | ❌     | Uses classes in `<style>` |
| Logo/brand in header        | ❌     | None                      |
| Clear primary CTA           | ⚠️     | 4 equal CTAs              |
| Mobile-friendly tap targets | ⚠️     | Same concern              |
| Dark mode                   | ❌     | None                      |

---

### 3. payment_confirmation_client

| Item                                  | Status | Notes                                                        |
| ------------------------------------- | ------ | ------------------------------------------------------------ |
| Preheader text                        | ❌     | None                                                         |
| Table-based layout                    | ❌     | Div-based                                                    |
| Inline styles                         | ❌     | Uses classes                                                 |
| Receipt-style layout                  | ⚠️     | Details block exists but no table or clear receipt hierarchy |
| Single clear CTA                      | ✅     | "View Session" only                                          |
| Amount highlighted (e.g. larger font) | ❌     | Same size as other details                                   |
| Dark mode                             | ❌     | None                                                         |

---

### 4. payment_received_practitioner

| Item                          | Status | Notes                                   |
| ----------------------------- | ------ | --------------------------------------- |
| Preheader text                | ❌     | None                                    |
| Table-based layout            | ❌     | Div-based                               |
| Inline styles                 | ❌     | Uses classes                            |
| Earnings emphasis             | ⚠️     | "Your Earnings" not visually emphasized |
| Clear payout timeline callout | ⚠️     | Text only, not a visual block           |
| Dark mode                     | ❌     | None                                    |

---

### 5. session_reminder_24h

| Item                       | Status | Notes                                              |
| -------------------------- | ------ | -------------------------------------------------- |
| Preheader text             | ❌     | None                                               |
| Table-based layout         | ❌     | Div-based                                          |
| Inline styles              | ❌     | Uses classes                                       |
| Urgency / time sensitivity | ❌     | Header feels same as other emails                  |
| Preparation tips styling   | ⚠️     | Plain `<ul>`; could use icons or clearer hierarchy |
| Dark mode                  | ❌     | None                                               |

---

### 6. session_reminder_2h

| Item                   | Status | Notes                                                   |
| ---------------------- | ------ | ------------------------------------------------------- |
| Preheader text         | ❌     | None                                                    |
| Table-based layout     | ❌     | Div-based                                               |
| Inline styles          | ❌     | Uses classes                                            |
| Urgency treatment      | ❌     | Same generic header as 24h                              |
| Clear “leave soon” CTA | ⚠️     | Get Directions exists; no “Start navigation” or similar |
| Dark mode              | ❌     | None                                                    |

---

### 7. session_reminder_1h

| Item                          | Status | Notes                           |
| ----------------------------- | ------ | ------------------------------- |
| Preheader text                | ❌     | None                            |
| Table-based layout            | ❌     | Div-based                       |
| Inline styles                 | ❌     | Uses classes                    |
| Urgency treatment             | ❌     | Header not distinct from 24h/2h |
| Last-minute checklist styling | ⚠️     | Plain list                      |
| Dark mode                     | ❌     | None                            |

---

### 8. cancellation

| Item                         | Status | Notes                           |
| ---------------------------- | ------ | ------------------------------- |
| Preheader text               | ❌     | None                            |
| Table-based layout           | ❌     | Div-based                       |
| Inline styles                | ❌     | Uses classes                    |
| Empathy / tone               | ⚠️     | Copy is brief; could soften     |
| Refund callout if applicable | ⚠️     | Shown but not visually distinct |
| Dark mode                    | ❌     | None                            |

---

### 9. rescheduling

| Item                     | Status | Notes                                                     |
| ------------------------ | ------ | --------------------------------------------------------- |
| Preheader text           | ❌     | None                                                      |
| Table-based layout       | ❌     | Div-based                                                 |
| Inline styles            | ❌     | Uses classes                                              |
| Old vs new date contrast | ⚠️     | Both in same block; "old" vs "new" not visually different |
| Dark mode                | ❌     | None                                                      |

---

### 10. peer_booking_confirmed_client

| Item                             | Status | Notes                                    |
| -------------------------------- | ------ | ---------------------------------------- |
| Preheader text                   | ❌     | None                                     |
| Table-based layout               | ❌     | Div-based                                |
| Inline styles                    | ❌     | Uses classes                             |
| Credit-info block styling        | ⚠️     | Yellow tint; may not render consistently |
| Peer vs standard booking clarity | ⚠️     | Text only; no icon or badge              |
| Dark mode                        | ❌     | None                                     |

---

### 11. peer_booking_confirmed_practitioner

| Item                    | Status | Notes                                      |
| ----------------------- | ------ | ------------------------------------------ |
| Preheader text          | ❌     | None                                       |
| Table-based layout      | ❌     | Div-based                                  |
| Inline styles           | ❌     | Uses classes                               |
| Credits earned emphasis | ⚠️     | Green block; fallback if green unsupported |
| Dark mode               | ❌     | None                                       |

---

### 12. peer_credits_deducted

| Item                     | Status | Notes                       |
| ------------------------ | ------ | --------------------------- |
| Preheader text           | ❌     | None                        |
| Table-based layout       | ❌     | Div-based                   |
| Inline styles            | ❌     | Uses classes                |
| Credit amount prominence | ⚠️     | Same weight as other fields |
| Dark mode                | ❌     | None                        |

---

### 13. peer_credits_earned

| Item                   | Status | Notes                            |
| ---------------------- | ------ | -------------------------------- |
| Preheader text         | ❌     | None                             |
| Table-based layout     | ❌     | Div-based                        |
| Inline styles          | ❌     | Uses classes                     |
| Positive reinforcement | ⚠️     | "Credits Earned!" in header only |
| Dark mode              | ❌     | None                             |

---

### 14. peer_booking_cancelled_refunded

| Item                   | Status | Notes                        |
| ---------------------- | ------ | ---------------------------- |
| Preheader text         | ❌     | None                         |
| Table-based layout     | ❌     | Div-based                    |
| Inline styles          | ❌     | Uses classes                 |
| Refund amount emphasis | ⚠️     | In block but not highlighted |
| Dark mode              | ❌     | None                         |

---

### 15. message_notification_guest

| Item                    | Status | Notes                                                 |
| ----------------------- | ------ | ----------------------------------------------------- |
| Preheader text          | ❌     | None                                                  |
| Table-based layout      | ❌     | Div-based                                             |
| Inline styles           | ❌     | Uses classes                                          |
| Message preview styling | ⚠️     | Block exists; no quote styling                        |
| Strong “reply” CTA      | ⚠️     | "View and reply" is clear but visually same as others |
| Dark mode               | ❌     | None                                                  |

---

### 16. booking_request_practitioner

| Item                                     | Status | Notes            |
| ---------------------------------------- | ------ | ---------------- |
| Preheader text                           | ❌     | None             |
| Table-based layout                       | ❌     | Div-based        |
| Inline styles                            | ❌     | Uses classes     |
| Action urgency (e.g. “Respond within X”) | ❌     | No time pressure |
| Address / location prominence            | ⚠️     | In details block |
| Dark mode                                | ❌     | None             |

---

### 17. mobile_request_accepted_client

| Item                          | Status | Notes          |
| ----------------------------- | ------ | -------------- |
| Preheader text                | ❌     | None           |
| Table-based layout            | ❌     | Div-based      |
| Inline styles                 | ❌     | Uses classes   |
| Success/celebration treatment | ⚠️     | Generic header |
| Date/time block               | ⚠️     | Plain text     |
| Dark mode                     | ❌     | None           |

---

### 18. mobile_request_declined_client

| Item                       | Status | Notes                                            |
| -------------------------- | ------ | ------------------------------------------------ |
| Preheader text             | ❌     | None                                             |
| Table-based layout         | ❌     | Div-based                                        |
| Inline styles              | ❌     | Uses classes                                     |
| Empathy / alternative path | ⚠️     | "Find Another Slot" exists; copy could be warmer |
| Dark mode                  | ❌     | None                                             |

---

### 19. mobile_request_expired_client

| Item               | Status | Notes                    |
| ------------------ | ------ | ------------------------ |
| Preheader text     | ❌     | None                     |
| Table-based layout | ❌     | Div-based                |
| Inline styles      | ❌     | Uses classes             |
| Clear next step    | ✅     | "Submit New Request" CTA |
| Dark mode          | ❌     | None                     |

---

### 20. welcome_client

| Item                                 | Status | Notes                                  |
| ------------------------------------ | ------ | -------------------------------------- |
| Preheader text                       | ❌     | None                                   |
| Table-based layout                   | ❌     | Div-based                              |
| Inline styles                        | ❌     | Uses classes                           |
| Onboarding steps / value proposition | ❌     | Single paragraph; no steps or benefits |
| Logo/brand in header                 | ❌     | None                                   |
| Warm welcome tone                    | ⚠️     | Short; could be more engaging          |
| Dark mode                            | ❌     | None                                   |

---

### 21. welcome_practitioner

| Item                    | Status | Notes                             |
| ----------------------- | ------ | --------------------------------- |
| Preheader text          | ❌     | None                              |
| Table-based layout      | ❌     | Div-based                         |
| Inline styles           | ❌     | Uses classes                      |
| Onboarding steps        | ❌     | Single paragraph                  |
| Logo/brand in header    | ❌     | None                              |
| "Get started" checklist | ❌     | No profile/availability checklist |
| Dark mode               | ❌     | None                              |

---

## Shared Issues (All 21 Emails)

| Issue                         | Status   | Notes                                                                   |
| ----------------------------- | -------- | ----------------------------------------------------------------------- |
| **Preheader**                 | ✅ Fixed | Hidden preheader per template (2026-03-15)                              |
| **Logo in header**            | ✅ Fixed | Configurable logo URL; TheraMate mascot default (2026-03-15)            |
| **Dark mode**                 | ✅ Fixed | `@media (prefers-color-scheme: dark)` in BASE_STYLES (2026-03-15)       |
| **Google Fonts via `<link>`** | ⚠️       | Blocked by some clients; Lato + fallbacks specified                     |
| **`<style>` blocks**          | ⚠️       | Juice inlines critical styles; some clients may still strip             |
| **Div-based layout**          | ❌       | Outlook desktop expects tables; MJML layout used but not table-compiled |
| **Footer duplication**        | —        | Unsubscribe/Privacy repeated; some clients require it                   |
| **Social pills on dark**      | ⚠️       | May have contrast issues in some clients                                |

---

## Recommended Next Steps (UX Designer Perspective)

### Quick wins (no new packages) – **IMPLEMENTED 2026-03-15**

1. ~~**Add preheader**~~ – ✅ Hidden preheader with ~50–130 chars per template; improves inbox preview.
2. ~~**Specify fallback fonts**~~ – ✅ `font-family: 'Lato', Arial, Helvetica, sans-serif` and `'DM Serif Text', Georgia, 'Times New Roman', serif`.
3. ~~**Inline critical styles**~~ – ✅ Header, content div, and all CTA `<a>` tags now have inline styles.
4. ~~**Introduce primary CTA**~~ – ✅ Primary CTA uses darker green (#6b7c2a), larger font; secondary use #8e9b53.
5. ~~**Increase CTA tap area**~~ – ✅ `min-height: 48px`, `padding: 16px 32px` on all CTAs.

### Medium effort (with tooling)

1. **Use MJML or React Email** – Compiles to table-based HTML and handles many client quirks.
2. **Run Premailer (or similar)** – Inline CSS and improve deliverability.
3. **Add a header logo** – Hosted image with `alt` text for branding.
4. **Add dark mode** – `@media (prefers-color-scheme: dark)` or dark-mode meta tags where supported.

### Larger effort

1. **Redesign layout** – Table-based structure for Outlook and older clients.
2. **Test in Litmus/Email on Acid** – Verify across clients.
3. **Define an email design system** – Shared components, spacing, typography, and CTAs across all 20 templates.

---

## Roadmap: Medium & Larger Effort

**Detailed implementation guide:** [`docs/product/EMAIL_UX_ROADMAP_MEDIUM_EFFORT.md`](./EMAIL_UX_ROADMAP_MEDIUM_EFFORT.md)

| Item                                     | Effort | Suggested Order |
| ---------------------------------------- | ------ | --------------- |
| MJML or React Email (table-based layout) | Medium | 1               |
| Premailer (full CSS inlining)            | Medium | 2               |
| Header logo asset                        | Medium | 3               |
| Dark mode support                        | Medium | 4               |
| Litmus / Email on Acid testing           | Larger | 5               |

---

## Checklist Summary Table

**As of 2026-03-15:** Preheader, Logo, Primary CTA, Mobile CTA, and Dark mode implemented across all templates.

| Template                               | Preheader | Table layout | Inline styles | Logo | Primary CTA | Mobile CTA | Dark mode |
| -------------------------------------- | --------- | ------------ | ------------- | ---- | ----------- | ---------- | --------- |
| 1 booking_confirmation_client          | ✅        | ❌           | ⚠️            | ✅   | ✅          | ✅         | ✅        |
| 2 booking_confirmation_practitioner    | ✅        | ❌           | ⚠️            | ✅   | ✅          | ✅         | ✅        |
| 3 payment_confirmation_client          | ✅        | ❌           | ⚠️            | ✅   | ✅          | ✅         | ✅        |
| 4 payment_received_practitioner        | ✅        | ❌           | ⚠️            | ✅   | ✅          | ✅         | ✅        |
| 5 session_reminder_24h                 | ✅        | ❌           | ⚠️            | ✅   | ✅          | ✅         | ✅        |
| 6 session_reminder_2h                  | ✅        | ❌           | ⚠️            | ✅   | ✅          | ✅         | ✅        |
| 7 session_reminder_1h                  | ✅        | ❌           | ⚠️            | ✅   | ✅          | ✅         | ✅        |
| 8 cancellation                         | ✅        | ❌           | ⚠️            | ✅   | ✅          | ✅         | ✅        |
| 9 rescheduling                         | ✅        | ❌           | ⚠️            | ✅   | ✅          | ✅         | ✅        |
| 10 peer_booking_confirmed_client       | ✅        | ❌           | ⚠️            | ✅   | ✅          | ✅         | ✅        |
| 11 peer_booking_confirmed_practitioner | ✅        | ❌           | ⚠️            | ✅   | ✅          | ✅         | ✅        |
| 12 peer_credits_deducted               | ✅        | ❌           | ⚠️            | ✅   | ✅          | ✅         | ✅        |
| 13 peer_credits_earned                 | ✅        | ❌           | ⚠️            | ✅   | ✅          | ✅         | ✅        |
| 14 peer_booking_cancelled_refunded     | ✅        | ❌           | ⚠️            | ✅   | ✅          | ✅         | ✅        |
| 15 message_notification_guest          | ✅        | ❌           | ⚠️            | ✅   | ✅          | ✅         | ✅        |
| 16 booking_request_practitioner        | ✅        | ❌           | ⚠️            | ✅   | ✅          | ✅         | ✅        |
| 17 mobile_request_accepted_client      | ✅        | ❌           | ⚠️            | ✅   | ✅          | ✅         | ✅        |
| 18 mobile_request_declined_client      | ✅        | ❌           | ⚠️            | ✅   | ✅          | ✅         | ✅        |
| 19 mobile_request_expired_client       | ✅        | ❌           | ⚠️            | ✅   | ✅          | ✅         | ✅        |
| 20 welcome_client                      | ✅        | ❌           | ⚠️            | ✅   | ✅          | ✅         | ✅        |
| 21 welcome_practitioner                | ✅        | ❌           | ⚠️            | ✅   | ✅          | ✅         | ✅        |

**Note:** ⚠️ Inline styles = Juice inlines critical elements; some structure classes remain. Table layout still recommended for full Outlook compatibility.

---

_“Every email is a touchpoint. Right now we’re delivering function but not the polished, trustworthy experience that matches TheraMate’s brand. Fixing layout, fonts, and preheaders would go a long way—and moving to MJML or React Email would future-proof us.”_ — Sally (UX Designer)
