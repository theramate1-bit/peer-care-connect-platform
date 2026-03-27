# Practitioner Mobile View Remediation Backlog Template

Last updated: 2026-03-08
Owner: Product + Frontend
Program: Practitioner mobile UX hardening
Linked plan: `docs/product/PRACTITIONER_MOBILE_VIEW_REMEDIATION_PLAN.md`
Release window: TBD
Status: Ready for ticket grooming

## How to Use This Backlog

- Create one engineering ticket per seeded item (`MOB-01` to `MOB-07`).
- Keep ticket IDs stable so QA evidence and acceptance mapping remain traceable.
- Ship in priority order unless dependencies force resequencing.

## Standard Ticket Template (Jira-style)

Use this template for each remediation ticket.

| Field          | Required | Notes                                           |
| -------------- | -------- | ----------------------------------------------- |
| Ticket ID      | Yes      | Example: `MOB-01`                               |
| Title          | Yes      | Short, outcome-based title                      |
| User story     | Yes      | Use the matching `US-MOB-*` story from the plan |
| Priority       | Yes      | High / Medium / Low                             |
| Scope          | Yes      | What must be changed                            |
| Non-goals      | Yes      | What is intentionally excluded                  |
| Affected paths | Yes      | File paths likely touched                       |
| AC mapping     | Yes      | Link to `AC-MOB-*` items                        |
| QA evidence    | Yes      | Screenshots/video + test device/viewport        |
| Risks          | Optional | UX or regression risk                           |
| Rollback       | Optional | Safe fallback if release fails                  |
| Dependencies   | Optional | Upstream/downstream requirements                |

## Seeded Tickets

### MOB-01 - Make diary calendar mobile-responsive

- **Priority:** High
- **User story:** `US-MOB-01`
- **User impact:** Practitioners on phone cannot use diary efficiently due to horizontal panning.
- **Scope:**
  - Remove forced fixed-width behavior in mobile breakpoints.
  - Provide mobile-first rendering mode for day/week/month.
  - Preserve existing desktop behavior.
- **Non-goals:** Rewriting booking logic or calendar data source.
- **Affected paths:** `peer-care-connect/src/components/BookingCalendar.tsx`
- **AC mapping:** `AC-MOB-01`
- **QA evidence placeholders:**
  - Before/after screenshot at `360x800`
  - Before/after screenshot at `390x844`
  - Quick recording of view switching (day/week/month)
- **Risks:** Calendar density regressions on tablet widths.
- **Rollback:** Revert component-level responsive layout changes.

### MOB-02 - Make client sessions list mobile-safe

- **Priority:** High
- **User story:** `US-MOB-02`
- **User impact:** Session data and actions become cramped or clipped on small screens.
- **Scope:**
  - Introduce mobile list/card layout or explicit horizontal scroll strategy.
  - Keep `View` and notes actions immediately tappable.
- **Non-goals:** Session status business rules.
- **Affected paths:** `peer-care-connect/src/pages/practice/PracticeClientManagement.tsx`
- **AC mapping:** `AC-MOB-02`
- **QA evidence placeholders:**
  - Sessions tab screenshots at `360x800` and `390x844`
  - Interaction proof for `View` and notes actions
- **Risks:** Inconsistent data density between desktop and mobile layouts.
- **Rollback:** Restore current sessions table rendering path.

### MOB-03 - Stabilize messaging layout for mobile viewport + keyboard

- **Priority:** Medium
- **User story:** `US-MOB-03`
- **User impact:** Keyboard and browser chrome can reduce chat usability and hide controls.
- **Scope:**
  - Replace fragile fixed viewport height with dynamic viewport strategy.
  - Reflow active chat header to avoid collisions on narrow widths.
- **Non-goals:** Message transport, notification, or backend logic.
- **Affected paths:** `src/components/messaging/RealTimeMessaging.tsx`
- **AC mapping:** `AC-MOB-03`
- **QA evidence placeholders:**
  - Keyboard-open screenshots on iOS and Android
  - Send-message flow recording while keyboard is open
- **Risks:** Scroll anchoring regressions in long threads.
- **Rollback:** Revert viewport sizing and header layout changes.

### MOB-04 - Improve mobile tab ergonomics in services and pricing

- **Priority:** Medium
- **User story:** `US-MOB-04`
- **User impact:** Hybrid practitioners struggle with compressed tab labels/actions.
- **Scope:**
  - Stack or wrap header actions under mobile breakpoints.
  - Use scrollable segmented tabs or mobile-safe tab pattern.
- **Non-goals:** Service pricing business logic and validation rules.
- **Affected paths:** `peer-care-connect/src/components/practitioner/ProductManager.tsx`
- **AC mapping:** `AC-MOB-04`
- **QA evidence placeholders:**
  - Hybrid mode tab interaction screenshots
  - Add/edit flow screenshots at `360x800`
- **Risks:** Tab discoverability if labels are shortened.
- **Rollback:** Restore current tab/header layout.

### MOB-05 - Make profile tab navigation mobile-friendly

- **Priority:** Medium
- **User story:** `US-MOB-05`
- **User impact:** Section tabs compress and reduce navigability on phones.
- **Scope:**
  - Apply scrollable tabs, stacked controls, or accordion behavior under `md`.
  - Keep parity across profile view and profile builder.
- **Non-goals:** Profile data model changes.
- **Affected paths:** `peer-care-connect/src/components/profiles/ProfileViewer.tsx`, `peer-care-connect/src/components/profiles/ProfileBuilder.tsx`
- **AC mapping:** `AC-MOB-05`
- **QA evidence placeholders:**
  - Section navigation screenshots (view + edit)
  - End-to-end pass through all profile sections on phone width
- **Risks:** Divergence between view and edit navigation paradigms.
- **Rollback:** Revert tab control changes in both components.

### MOB-06 - Modernize treatment exchange mobile modal/form behavior

- **Priority:** Medium
- **User story:** `US-MOB-06`
- **User impact:** Legacy overlays and 2-column forms are hard to complete on phone.
- **Scope:**
  - Move to shared responsive modal/sheet primitives.
  - Collapse two-column forms to one column on mobile.
- **Non-goals:** Exchange matching logic and payment flow behavior.
- **Affected paths:** `peer-care-connect/src/pages/practice/TreatmentExchange.tsx`, `peer-care-connect/src/pages/practice/ExchangeRequests.tsx`
- **AC mapping:** `AC-MOB-06`
- **QA evidence placeholders:**
  - Modal open/submit recordings on phone widths
  - Form readability screenshots in both flows
- **Risks:** Regression in desktop modal behavior.
- **Rollback:** Revert modal primitives and form layout updates.

### MOB-07 - Improve booking-link strip layout on phone

- **Priority:** Low
- **User story:** `US-MOB-07`
- **User impact:** Copy/share affordance is cramped on narrow screens.
- **Scope:**
  - Stack URL and copy action on small widths.
  - Preserve one-tap copy of full URL.
- **Non-goals:** Booking link generation logic.
- **Affected paths:** `peer-care-connect/src/pages/practice/PracticeSchedule.tsx`
- **AC mapping:** `AC-MOB-07`
- **QA evidence placeholders:**
  - Copy interaction screenshot at `360x800`
  - Validation capture proving full URL copied
- **Risks:** Minor visual inconsistency with desktop strip.
- **Rollback:** Restore current inline strip layout.

## Recommended Execution Sequence

1. `MOB-01`
2. `MOB-02`
3. `MOB-03`
4. `MOB-04`
5. `MOB-05`
6. `MOB-06`
7. `MOB-07`

## QA Evidence Checklist (Attach to every ticket)

- [ ] Device + viewport documented
- [ ] Before/after evidence attached
- [ ] AC mapping checked (`AC-MOB-*`)
- [ ] Regression pass on adjacent practitioner surfaces
- [ ] Dark mode checked where applicable
