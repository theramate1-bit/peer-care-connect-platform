# Booking Mode Edge Cases and Acceptance Criteria

Date: 2026-03-08  
Companion doc: `docs/product/BOOKING_MODE_UX_CONSISTENCY_AUDIT_VERIFIED.md`
Last re-verified: 2026-03-08 (MCP + frontend flow wiring + AC-09 fix)

## Purpose

Define testable edge cases and acceptance criteria for booking mode behavior (`clinic`, `mobile`, `hybrid`) across all key entry surfaces:

- Marketplace
- Direct booking page
- Public therapist profile page
- Profile viewer
- Client booking page

This document now includes **current implementation status** (`Pass` / `Partial` / `Fail`) for each acceptance criterion based on latest code and MCP verification.

## Global Rules (Target Behavior)

1. **Mode correctness:** clinic bookings must use clinic flow; mobile bookings must use mobile request flow.
2. **Hybrid clarity:** hybrid practitioners must always present explicit choice:
   - `Book at Clinic`
   - `Request Visit to My Location`
3. **Wrong-flow recovery:** if clinic flow is opened for a mobile-only practitioner, user is rerouted to mobile flow seamlessly.
4. **CTA consistency:** labels communicate intent consistently:
   - direct booking action = `Book`
   - request/approval flow action = `Request`
5. **Location consistency:** session location display follows shared rule in `docs/features/session-location-rule.md`.

## Edge Case Matrix

| ID    | Surface         | Practitioner Type              | Trigger             | Expected Outcome                                                                                                |
| ----- | --------------- | ------------------------------ | ------------------- | --------------------------------------------------------------------------------------------------------------- |
| EC-01 | Public profile  | Hybrid                         | Tap primary CTA     | Explicit mode chooser appears, no generic booking modal                                                         |
| EC-02 | Public profile  | Mobile only                    | Tap primary CTA     | Mobile request flow opens directly                                                                              |
| EC-03 | Public profile  | Clinic only                    | Tap primary CTA     | Clinic booking flow opens directly                                                                              |
| EC-04 | Marketplace     | Hybrid                         | Geo search inactive | Mobile CTA behavior follows agreed global policy (either globally disabled or globally allowed, but consistent) |
| EC-05 | Marketplace     | Hybrid                         | Geo in-range        | Both CTAs usable; route selected flow correctly                                                                 |
| EC-06 | Client booking  | Mobile-only stale profile data | Open clinic flow    | User redirected to mobile flow via wrong-flow recovery                                                          |
| EC-07 | Profile viewer  | Mobile-only stale profile data | Open clinic flow    | User redirected to mobile flow via wrong-flow recovery                                                          |
| EC-08 | Direct booking  | Hybrid                         | Choose clinic       | Clinic flow opens and completes via clinic path                                                                 |
| EC-09 | Direct booking  | Hybrid                         | Choose mobile       | Mobile request flow opens and completes via mobile request path                                                 |
| EC-10 | Any             | No active products             | Tap booking CTA     | Clear blocking message; no dead-end modal                                                                       |
| EC-11 | Any             | Mobile-only                    | CTA labels          | Must never show generic `Book Session` as sole action                                                           |
| EC-12 | Booking success | Mobile session                 | Add to calendar     | Location reflects visit address rule (not generic practitioner location only)                                   |

## Acceptance Criteria (Given / When / Then)

### AC-01: Public profile must be mode-aware

- **Given** a practitioner with `therapist_type = hybrid` and active clinic + mobile products
- **When** a user opens the public therapist page and taps the main booking CTA
- **Then** the user sees explicit modality choice (`Book at Clinic`, `Request Visit to My Location`)
- **And** no legacy generic booking modal is used.
- **Status:** **Pass**

### AC-02: Public profile must route single-mode practitioners correctly

- **Given** a practitioner that is mobile-only
- **When** booking is initiated from public therapist page
- **Then** mobile request flow opens directly.

- **Given** a practitioner that is clinic-only
- **When** booking is initiated from public therapist page
- **Then** clinic booking flow opens directly.
- **Status:** **Pass**

### AC-03: Hybrid chooser interaction pattern must be standardized

- **Given** any hybrid practitioner on any booking surface
- **When** user initiates booking
- **Then** the same interaction pattern is used everywhere (single standardized chooser pattern)
- **And** CTA text is consistent across surfaces.
- **Status:** **Pass** (single inline chooser interaction pattern is now used across targeted surfaces)

### AC-04: Mobile entry gating policy must be globally consistent

- **Given** a hybrid/mobile practitioner and an eligible user
- **When** the user starts mobile flow from marketplace, direct booking, profile viewer, or client booking
- **Then** mobile gating behavior is the same on every surface (same preconditions, same messaging, same disabled/enabled rules).
- **Status:** **Pass** (pre-search gate removed from marketplace; validation remains in flow)

### AC-05: Wrong-flow recovery must be wired everywhere

- **Given** stale profile/service data where clinic flow opens for a mobile-only practitioner
- **When** booking flow validates mode capability
- **Then** clinic modal closes and mobile flow opens automatically
- **And** user receives a clear informational message
- **And** this behavior works on marketplace, direct booking, profile viewer, and client booking.
- **Status:** **Pass**

### AC-06: CTA taxonomy must clearly communicate booking semantics

- **Given** a direct-confirmation path
- **When** CTA is rendered
- **Then** CTA uses `Book` language.

- **Given** an approval/request path
- **When** CTA is rendered
- **Then** CTA uses `Request` language.
- **Status:** **Partial** (hybrid-choice labels are standardized; non-hybrid generic labels remain on some single-mode surfaces)

### AC-07: Clinic payload must remain clinic-specific

- **Given** a clinic flow booking
- **When** booking RPC is created
- **Then** payload uses clinic-compatible fields (`appointment_type='clinic'`, no visit address requirement)
- **And** mobile-only fields are not required in clinic RPC completion.
- **Status:** **Pass** (confirmed via Supabase MCP function signatures and active flow wiring)

### AC-08: Mobile payload must remain request-specific

- **Given** a mobile flow booking
- **When** request RPC is created
- **Then** request payload includes address/geo validation and mobile request lifecycle fields
- **And** payment proceeds via hold/capture flow after practitioner decision.
- **Status:** **Pass** (confirmed via Supabase MCP function signatures and request flow behavior)

### AC-09: Session location rendering must use shared rule

- **Given** any booked session shown in confirmation/success/calendar/email contexts
- **When** location is resolved
- **Then** resolution follows:
  1. `session.visit_address`
  2. `session.appointment_type` mobile fallback label
  3. `practitioner.clinic_address`
  4. `practitioner.location`
- **Status:** **Pass** (`BookingSuccess` now resolves via shared location rule precedence)

### AC-10: No duplicate request cards

- **Given** duplicated historical data anomalies in `mobile_booking_requests`
- **When** practitioner request list is loaded
- **Then** duplicate rows are not shown (server-side and UI guardrails)
- **And** expired requests are hidden by default.
- **Status:** **Pass**

## Current Acceptance Summary

| AC    | Title                                      | Status  |
| ----- | ------------------------------------------ | ------- |
| AC-01 | Public profile mode-aware                  | Pass    |
| AC-02 | Public profile single-mode routing         | Pass    |
| AC-03 | Hybrid chooser interaction standardization | Pass    |
| AC-04 | Mobile gating consistency                  | Pass    |
| AC-05 | Wrong-flow recovery wiring                 | Pass    |
| AC-06 | CTA taxonomy consistency                   | Partial |
| AC-07 | Clinic payload semantics                   | Pass    |
| AC-08 | Mobile payload semantics                   | Pass    |
| AC-09 | Session location shared rule               | Pass    |
| AC-10 | Duplicate/expired mobile request UX        | Pass    |

Current status snapshot:

- Pass: 9
- Partial: 1 (`AC-06`)
- Fail: 0

## Non-Functional Acceptance Criteria

- **Consistency:** same practitioner + same mode yields same interaction regardless of entry surface.
- **Explainability:** blocked actions always show actionable reason text.
- **Recoverability:** wrong-flow opens reroute user without dead-end states.
- **Observability:** events/logs include selected mode and entry surface for diagnosis.

## Regression Checklist

1. Public profile no longer opens `UnifiedBookingModal` for mode-aware bookings. **(Pass)**
2. Marketplace/direct/profile/client all expose consistent hybrid choice behavior. **(Pass)**
3. `onRedirectToMobile` equivalent behavior is active on all surfaces opening clinic flow. **(Pass)**
4. Mobile gating behavior matches product decision globally. **(Pass)**
5. CTA labels match taxonomy rules. **(Partial)**
6. Booking success and calendar location output follow session-location rule. **(Pass)**
7. Duplicate/expired mobile request UX remains clean in practitioner list. **(Pass)**

## Suggested Test Pack (Manual + E2E)

- `TC-HYB-01`: Hybrid practitioner, unauthenticated, public profile entry.
- `TC-HYB-02`: Hybrid practitioner, authenticated client, marketplace entry.
- `TC-MOB-01`: Mobile-only practitioner, stale clinic open attempt, reroute validation.
- `TC-MOB-02`: Mobile request hold -> accept path.
- `TC-MOB-03`: Mobile request hold -> decline/release path.
- `TC-CLN-01`: Clinic-only direct booking path.
- `TC-LOC-01`: Booking success location correctness for clinic vs mobile sessions.
- `TC-UI-01`: CTA copy consistency snapshot across all surfaces.

## Ready for Build

Use this document as the baseline for:

- implementation backlog breakdown (`issue`, `impact`, `fix`, `owner`, `priority`),
- QA traceability matrix (`edge case -> AC -> test case`),
- release sign-off criteria.

Priority remaining gaps:

1. Close `AC-06` by standardizing remaining generic CTA copy outside scoped hybrid-choice contexts.

## Related Post-Booking Docs

- `docs/product/POST_BOOKING_REMEDIATION_TABLE.md`
- `docs/product/POST_BOOKING_REMEDIATION_BACKLOG_TEMPLATE.md`
