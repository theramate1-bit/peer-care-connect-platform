# Practitioner Mobile View Remediation Plan

Last updated: 2026-03-08
Owner: Product + Frontend
Status: Draft for implementation

Companion backlog template: `docs/product/PRACTITIONER_MOBILE_VIEW_REMEDIATION_BACKLOG_TEMPLATE.md`

## Goal

Close high and medium mobile UX gaps across practitioner surfaces so core workflows (diary, client management, messaging, services, profile, treatment exchange) are usable on phone widths without horizontal panning or clipped actions.

## Scope

- In scope: practitioner-facing responsive layout, interaction ergonomics, and mobile-safe navigation patterns.
- Out of scope: backend business logic changes, payment logic changes, and non-practitioner web apps.

## Confirmed Findings (from code review)

| ID     | Area                                 | Priority | Gap                                                                                | Recommended mobile pattern                                                                                             | Evidence                                                                                                                      |
| ------ | ------------------------------------ | -------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| MOB-01 | Diary calendar                       | High     | Week/day/month force `min-w-[800px]`, requiring horizontal pan on phones           | Replace fixed min width with breakpoint-aware layouts; mobile defaults to agenda/day stack with progressive disclosure | `peer-care-connect/src/components/BookingCalendar.tsx`                                                                        |
| MOB-02 | Client management sessions           | High     | Sessions table is desktop-first with fixed headers and no mobile overflow strategy | Add mobile card/list mode or explicit horizontal scroll container with sticky key columns                              | `peer-care-connect/src/pages/practice/PracticeClientManagement.tsx`                                                           |
| MOB-03 | Messaging                            | Medium   | `h-[calc(100vh-200px)]` and crowded header degrade on mobile keyboard/chrome       | Use dynamic viewport (`dvh`) strategy and split header into stacked rows on small screens                              | `src/components/messaging/RealTimeMessaging.tsx`                                                                              |
| MOB-04 | Services & pricing (hybrid)          | Medium   | Header and 3-tab bar compress with long labels                                     | Stack header actions and switch tab row to scrollable segmented control on mobile                                      | `peer-care-connect/src/components/practitioner/ProductManager.tsx`                                                            |
| MOB-05 | Profile view/edit tabs               | Medium   | Fixed 4-tab layouts compress on narrow screens                                     | Use horizontal scroll tabs or section accordion/sheet mode under `md`                                                  | `peer-care-connect/src/components/profiles/ProfileViewer.tsx`, `peer-care-connect/src/components/profiles/ProfileBuilder.tsx` |
| MOB-06 | Treatment exchange flows             | Medium   | Legacy custom overlays and `grid-cols-2` forms are weak on phones                  | Migrate to shared responsive `Dialog`/`Sheet`; collapse two-column forms to one column on mobile                       | `peer-care-connect/src/pages/practice/TreatmentExchange.tsx`, `peer-care-connect/src/pages/practice/ExchangeRequests.tsx`     |
| MOB-07 | Practice schedule booking-link strip | Low      | URL + copy action stay in one cramped row                                          | Stack URL and action on mobile with truncation and full-copy affordance                                                | `peer-care-connect/src/pages/practice/PracticeSchedule.tsx`                                                                   |

Note: Dashboard is relatively healthy on mobile compared with the list above and is not a primary remediation target.

## User Stories

### US-MOB-01 Diary on phone

As a practitioner using my phone, I want to view and act on my diary without horizontal panning so I can manage sessions quickly while mobile.

### US-MOB-02 Client sessions on phone

As a practitioner using Client Management on mobile, I want sessions rendered in a readable and tappable layout so I can open details and notes without zooming.

### US-MOB-03 Messaging on phone

As a practitioner messaging clients from my phone, I want stable chat height and non-overlapping controls so I can read and reply when the keyboard opens.

### US-MOB-04 Services and pricing on phone

As a hybrid practitioner, I want service tabs and actions to remain readable and selectable on small screens so I can manage offerings without layout breakage.

### US-MOB-05 Profile tabs on phone

As a practitioner editing/viewing profile content on mobile, I want section navigation that does not squash labels so I can move between sections confidently.

### US-MOB-06 Treatment exchange on phone

As a practitioner handling exchange requests on mobile, I want dialogs/forms that fit narrow widths so I can complete request flows in one pass.

### US-MOB-07 Booking link strip on phone

As a practitioner sharing my booking link from mobile, I want easy copy/share controls with readable text so I can send my link quickly.

## Acceptance Criteria

### AC-MOB-01 Diary responsiveness

- No forced horizontal panning at `360px` width for default diary workflow.
- Calendar content remains fully operable with touch targets >= 44px for primary actions.
- Day/week/month views either adapt responsively or provide mobile-first alternative mode.

### AC-MOB-02 Client management sessions

- Session list is readable at `360px` and `390px` widths without clipped key values.
- Primary actions (`View`, notes entry points, status actions) remain visible and tappable.
- If table remains, mobile has explicit horizontal scroll affordance and no hidden critical columns.

### AC-MOB-03 Messaging behavior

- Chat container remains usable under mobile keyboard open/close cycles.
- Header content wraps or stacks without overlapping action buttons.
- Message input and send action stay pinned and visible on modern mobile browsers.

### AC-MOB-04 Services and pricing

- Hybrid tabs do not truncate into unreadable labels on phone widths.
- Header actions wrap/stack without collision.
- Tab switching and add/edit flows are reachable without zoom.

### AC-MOB-05 Profile navigation

- Profile tab controls support narrow widths via scrolling, stacking, or accordion behavior.
- All profile sections are reachable with consistent interaction patterns on mobile.

### AC-MOB-06 Treatment exchange

- Modal/sheet surfaces fit within viewport height/width on phones.
- Two-column form content collapses to one column under mobile breakpoints.
- Core request/response actions are visible without horizontal scroll.

### AC-MOB-07 Booking link strip

- Link text and copy action do not collide at `360px`.
- User can copy full URL in one tap.
- Visual hierarchy remains clear (label, URL, action).

## QA Checking Checklist

### Device and viewport matrix

- [ ] iPhone SE / 375x667
- [ ] iPhone 12/13/14 / 390x844
- [ ] Pixel 7 / 412x915
- [ ] Small Android / 360x800

### Flow checks by area

- [ ] Diary: open day/week/month and confirm no forced pan for core tasks
- [ ] Client Management: open Sessions tab, inspect readability, tap `View` and notes path
- [ ] Messaging: enter conversation, open keyboard, send message, switch threads
- [ ] Services/Pricing: switch all tabs in hybrid mode, verify labels and actions
- [ ] Profile Viewer/Builder: navigate all major sections on mobile widths
- [ ] Treatment Exchange + Exchange Requests: open modal/sheet flows and complete primary action
- [ ] Practice Schedule: copy booking link on narrow width

### Regression and accessibility checks

- [ ] No horizontal scrollbar on primary screen containers unless explicitly intended
- [ ] Tap targets >= 44x44 for main interactive controls
- [ ] Focus states visible for keyboard and accessibility navigation
- [ ] No text overlap/truncation on critical labels and buttons
- [ ] Dark mode still readable in remediated surfaces

## Priority Order for Implementation

1. MOB-01 Diary
2. MOB-02 Client Management Sessions
3. MOB-03 Messaging
4. MOB-04 Services/Pricing
5. MOB-05 Profile tabs
6. MOB-06 Treatment exchange flows
7. MOB-07 Booking-link strip
