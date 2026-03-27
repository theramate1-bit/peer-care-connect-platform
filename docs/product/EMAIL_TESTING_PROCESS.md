# Email Testing Process – Litmus / Email on Acid

**Owner:** QA + UX Designer  
**Date:** 2026-03-15  
**Reference:** `docs/product/EMAIL_UX_ROADMAP_MEDIUM_EFFORT.md`

---

## Overview

Real email client rendering is unpredictable. Litmus and Email on Acid provide screenshots across dozens of clients to catch layout and rendering issues before sending to users.

---

## Services

| Service           | URL                         | Cost                       |
| ----------------- | --------------------------- | -------------------------- |
| **Litmus**        | https://litmus.com          | Paid (trial available)     |
| **Email on Acid** | https://www.emailonacid.com | Paid (trial available)     |
| **Mail Tester**   | https://www.mail-tester.com | Free (deliverability only) |

---

## When to Run Tests

- After each major email change (MJML migration, Premailer, dark mode, logo)
- Before production release of email-related features
- When a user reports “email looks broken in Outlook/Gmail”

---

## Recommended Test Clients (Priority)

| Client                     | Priority | Notes                       |
| -------------------------- | -------- | --------------------------- |
| Gmail (Web)                | High     | Most used                   |
| Gmail (Mobile)             | High     | Dark mode, mobile layout    |
| Outlook (Desktop, Windows) | High     | Table-based layout critical |
| Apple Mail (macOS)         | High     | Dark mode                   |
| Apple Mail (iOS)           | High     | Mobile                      |
| Yahoo Mail                 | Medium   | Common                      |
| Outlook (Web)              | Medium   |                             |
| Samsung Mail               | Low      |                             |
| Lotus Notes                | Low      | If enterprise users         |

---

## Process

### 1. Capture HTML for a Template

Use the send-email Edge Function or a test script to generate HTML for each template type. Save to `test-output/email-{template-name}.html`.

Example (manual):

1. Trigger an email (e.g. booking confirmation)
2. Copy HTML from Resend dashboard or logs, or
3. Run a local script that calls `generateEmailTemplate()` and writes output

### 2. Send to Litmus / Email on Acid

1. Log in to Litmus or Email on Acid
2. Create a new test
3. Paste HTML or upload file
4. Send to the service’s test address
5. Wait for screenshots

### 3. Review & Document

- Review screenshots for layout breaks, font issues, CTA visibility
- Document failures in a spreadsheet or `docs/product/EMAIL_TEST_RESULTS.md`
- Create tickets for fixes

### 4. Fix & Re-test

- Apply fixes in `supabase/functions/send-email/index.ts` (or MJML templates)
- Re-run `npm run email:build` if using MJML
- Re-test affected clients

---

## Checklist Before Release

- [ ] All 21 template types tested in at least Gmail + Outlook
- [ ] Dark mode checked in Gmail and Apple Mail
- [ ] CTAs visible and tappable (min 44px)
- [ ] Logo loads (or alt text shows when images blocked)
- [ ] Preheader shows in inbox preview
- [ ] No horizontal scroll on mobile
- [ ] Links go to correct URLs (not localhost)

---

## Baseline Capture

After implementing MJML, Premailer, logo, and dark mode, capture baseline screenshots for:

1. `booking_confirmation_client`
2. `payment_confirmation_client`
3. `welcome_client`
4. `session_reminder_24h`
5. `cancellation`

Store baseline references (screenshots or links) for future comparison.

---

## Optional: Automated Testing

If Litmus/Email on Acid offer an API:

1. Add a script `scripts/test-email-litmus.js` that POSTs HTML to their API
2. Add a GitHub Action or manual step to run before release
3. Document API keys in `.env.example` (never commit keys)

---

## Related Docs

- `docs/product/EMAIL_20_TEMPLATES_AUDIT.md` – template inventory
- `docs/product/EMAIL_20_UX_DESIGN_AUDIT_CHECKLIST.md` – UX gaps
- `docs/product/EMAIL_UX_ROADMAP_MEDIUM_EFFORT.md` – implementation roadmap
