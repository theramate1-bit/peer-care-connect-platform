# Email UX Roadmap – Medium & Larger Effort Items

**Owner:** UX Designer (Sally) + Dev (Amelia)  
**Date:** 2026-03-15  
**Prerequisites:** Quick wins completed (preheader, font fallbacks, inline CTAs, primary CTA hierarchy, tap targets)  
**Reference:** `docs/product/EMAIL_20_UX_DESIGN_AUDIT_CHECKLIST.md`

---

## Overview

| Item                           | Effort | Status  | Completed  |
| ------------------------------ | ------ | ------- | ---------- |
| MJML (table-based layout)      | Medium | ✅ Done | 2026-03-15 |
| Juice (full CSS inlining)      | Medium | ✅ Done | 2026-03-15 |
| Header logo asset              | Medium | ✅ Done | 2026-03-15 |
| Dark mode support              | Medium | ✅ Done | 2026-03-15 |
| Litmus / Email on Acid testing | Larger | ✅ Doc  | 2026-03-15 |

---

## 1. MJML or React Email (Table-Based Layout)

### Why

Outlook (desktop), Lotus Notes, and many older email clients expect **table-based** HTML. Div-based layouts collapse or misalign. MJML and React Email compile to table-based HTML automatically and handle many client quirks (Outlook conditional comments, Gmail fixes).

### Options

| Tool            | Pros                                                     | Cons                                    | Fit for Supabase Edge Functions              |
| --------------- | -------------------------------------------------------- | --------------------------------------- | -------------------------------------------- |
| **MJML**        | Mature, battle-tested, simple syntax, compiles to tables | Build step; output is static HTML       | ✅ Use at build time, ship compiled HTML     |
| **React Email** | React components, preview in dev, Resend integration     | Heavier; React runtime not in Deno edge | ⚠️ Use at build time; compile to static HTML |
| **Maizzle**     | Tailwind for email, MJML-like                            | Newer, smaller community                | ⚠️ Possible; similar build step              |

**Recommendation:** MJML. Widely used, stable, compiles to table-based HTML. Add MJML templates alongside current HTML; build script compiles to `dist/` or inlined strings for `send-email`.

### Implementation Notes

- **Location:** Either:
  - New dir `supabase/functions/email-templates/` with `.mjml` files + build script, or
  - In-repo MJML strings compiled by a Node script run before deploy.
- **Build step:** `mjml input.mjml -o output.html` or `mjml2html` API.
- **Integration:** `generateEmailTemplate()` in `send-email/index.ts` could import pre-compiled HTML from a generated file, or the Edge Function receives pre-rendered HTML from an upstream build.
- **Data binding:** MJML doesn’t do templating natively. Options: (a) Handlebars/Mustache inside MJML, (b) compile MJML to HTML, then run a simple JS template (e.g. `replace(/\{\{.*?\}\}/g, ...)`), or (c) one MJML source per email type with placeholders.

### Acceptance Criteria

- [ ] MJML (or chosen tool) integrated in project
- [ ] At least 1 template (e.g. `booking_confirmation_client`) converted and rendering correctly
- [ ] Output is table-based HTML (inspect `<table>` in compiled output)
- [ ] All 21 templates migrated
- [ ] Build/deploy pipeline updated

### Files to Touch

- `supabase/functions/send-email/index.ts` – swap or extend `generateEmailTemplate()`
- New: `supabase/functions/email-templates/*.mjml` (or equivalent)
- New: `package.json` script for `mjml` compile (or `email:build`)
- `.github/workflows/` or deploy script – run email build before deploy

---

## 2. Premailer (Full CSS Inlining)

### Why

When `<style>` blocks are stripped, layout breaks. Inlining CSS on each element (what Premailer does) keeps styling intact in clients that strip `<style>`.

### Options

| Tool                                 | Pros                | Cons                |
| ------------------------------------ | ------------------- | ------------------- |
| **Premailer (Ruby)**                 | Industry standard   | Ruby dependency     |
| **juice (Node)**                     | JS, inlines CSS     | Node needed         |
| **@react-email/components** inlining | Built-in            | Tied to React Email |
| **Resend inlining**                  | If Resend offers it | Check Resend docs   |

**Recommendation:** `juice` (npm). Run as a build or runtime step: take HTML, inline CSS, output final HTML. Can run in a Node script before deploy or in a separate “email processor” service.

### Implementation Notes

- **When to run:** After MJML compile (if using MJML). Pipeline: MJML → HTML → juice → final HTML.
- **Location:** Add to email build script. E.g. `node scripts/build-emails.js` reads compiled HTML, runs juice, writes to `dist/` or embeds in `send-email`.
- **Edge Function:** Deno Edge Functions can’t run Node. Options: (a) pre-inline at build time and ship final HTML, or (b) call a small Node/Cloud Function that inlines and returns HTML (adds latency).

### Acceptance Criteria

- [ ] Juice (or chosen inliner) integrated
- [ ] All email HTML processed through inliner
- [ ] Inline styles present on critical elements (header, content, CTAs) in output
- [ ] No regression in Gmail/Outlook appearance
- [ ] Build/deploy pipeline updated

### Files to Touch

- New: `scripts/build-emails.js` (or extend existing email build)
- `package.json` – add `juice`, `email:build` script
- Deploy pipeline – run `email:build` before `supabase functions deploy`

---

## 3. Header Logo Asset

### Why

Header is text-only; weak brand. A logo improves trust and recognition.

### Implementation Notes

- **Asset:** Theramate logo (PNG or GIF, no SVG for wide compatibility). Recommended: 120–200px wide, transparent or white-on-transparent for dark header.
- **Hosting:** Supabase Storage (public bucket), or CDN. Needs a stable, absolute URL.
- **HTML:** `<img src="https://..." alt="TheraMate" width="150" height="auto" style="display:block;max-width:150px;" />`
- **Alt text:** Required for accessibility and when images are blocked.
- **Fallback:** If images blocked, ensure `alt` or adjacent text still shows “TheraMate”.

### Acceptance Criteria

- [ ] Logo asset created/approved (suitable for dark header)
- [ ] Logo hosted at stable public URL
- [ ] Logo added to header in all 21 templates (or shared header component)
- [ ] `alt` text set for accessibility
- [ ] Tested with images off (alt/fallback visible)

### Files to Touch

- `supabase/functions/send-email/index.ts` – header section in `generateEmailTemplate()` or shared header helper
- New: `supabase/storage/buckets/public/assets/logo-email.png` (or similar)
- Possibly `getEmailFooter()` if logo is in a shared header/footer block

---

## 4. Dark Mode Support

### Why

Gmail, Apple Mail, and others support dark mode. Hard-coded light backgrounds can be unreadable (e.g. white text on white).

### Implementation Notes

- **Approach 1:** `@media (prefers-color-scheme: dark)` – override colors for dark mode.
- **Approach 2:** `color-scheme: light dark` meta + semantic colors.
- **Approach 3:** Dark-mode meta tags some clients use (e.g. `meta name="color-scheme" content="light dark"`).
- **Considerations:**
  - Backgrounds: avoid pure white in dark; use off-white or allow client to invert.
  - Text: ensure contrast in both modes.
  - CTAs: test green (#8e9b53, #6b7c2a) on dark backgrounds.
  - Images: consider a dark variant of logo if needed.

### Acceptance Criteria

- [ ] Dark mode media query or meta added
- [ ] Backgrounds and text adjusted for dark mode
- [ ] CTAs readable in dark mode
- [ ] Tested in Gmail (mobile + web) and Apple Mail dark mode

### Files to Touch

- `supabase/functions/send-email/index.ts` – add `<style>` block with `@media (prefers-color-scheme: dark)` overrides
- `BASE_STYLES` or equivalent – dark variants
- Header/CTA inline styles – may need `!important` or duplicated dark rules

---

## 5. Litmus / Email on Acid Testing

### Why

Real client rendering is unpredictable. Litmus and Email on Acid provide screenshots across dozens of clients (Outlook, Gmail, Yahoo, Apple Mail, etc.) to catch layout and rendering issues before sending to users.

### Implementation Notes

- **Services:** Litmus, Email on Acid, or Mail Tester (basic deliverability).
- **Workflow:** Send test HTML to Litmus/Email on Acid, review screenshots, fix regressions.
- **When:** After each major change (MJML migration, Premailer, dark mode, logo).
- **Cost:** Both are paid. Consider trial or budget for ongoing testing.

### Acceptance Criteria

- [ ] Account setup (Litmus or Email on Acid)
- [ ] Test suite created for all 21 template types
- [ ] Baseline screenshots captured for key clients (Gmail, Outlook desktop, Apple Mail, Yahoo)
- [ ] Process documented: when to run tests, who reviews, how to fix failures
- [ ] CI or manual checklist to run before release

### Files to Touch

- New: `docs/product/EMAIL_TESTING_PROCESS.md` – process and client list
- Optional: Script to POST HTML to Litmus/Email on Acid API for automated tests
- `.github/workflows/` – optional automated test job (if API available)

---

## Implementation Summary (2026-03-15)

| Item            | What Was Done                                                                                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MJML**        | `scripts/email-templates/base.mjml` – table wrapper; `scripts/build-emails.js` – compiles MJML, runs juice; `_layout-compiled.ts` – generated output; `send-email` imports and wraps all templates |
| **Juice**       | Integrated in `scripts/build-emails.js`; runs after MJML compile                                                                                                                                   |
| **Header logo** | `getEmailHeader(baseUrl, title)` – logo img + title; `getLogoUrl(baseUrl)` – uses `EMAIL_LOGO_URL` or `baseUrl/logo-email.png`                                                                     |
| **Dark mode**   | `@media (prefers-color-scheme: dark)` in `BASE_STYLES`; `meta name="color-scheme" content="light dark"` in head                                                                                    |
| **Litmus**      | `docs/product/EMAIL_TESTING_PROCESS.md` – process, clients, checklist                                                                                                                              |

**Before deploy:** Run `npm run email:build` if you change `scripts/email-templates/base.mjml`. The generated `_layout-compiled.ts` is committed so deploy works without build.

**Logo:** Add `logo-email.png` (150px wide, transparent/white) to `https://theramate.co.uk/logo-email.png` or set `EMAIL_LOGO_URL` in Supabase Edge Function secrets.

---

## Suggested Implementation Order

1. **MJML** – Establish table-based layout; improves Outlook and older clients.
2. **Premailer/Juice** – Inline CSS on MJML output; improves Gmail and others that strip `<style>`.
3. **Header logo** – Independent of layout; quick visual win.
4. **Dark mode** – Add media queries and overrides.
5. **Litmus/Email on Acid** – Use after 1–4 to validate and lock in a baseline.

---

## Quick Reference: Key Paths

| Artifact                 | Path                                                 |
| ------------------------ | ---------------------------------------------------- |
| Send-email Edge Function | `supabase/functions/send-email/index.ts`             |
| Email template generator | `generateEmailTemplate()` in send-email              |
| Footer                   | `getEmailFooter()` in send-email                     |
| UX Audit                 | `docs/product/EMAIL_20_UX_DESIGN_AUDIT_CHECKLIST.md` |
| 20 Templates Audit       | `docs/product/EMAIL_20_TEMPLATES_AUDIT.md`           |

---

_"Start with MJML – it's the foundation. Once we have table-based HTML that actually renders in Outlook, the rest becomes much easier to validate."_ — Sally (UX Designer)
