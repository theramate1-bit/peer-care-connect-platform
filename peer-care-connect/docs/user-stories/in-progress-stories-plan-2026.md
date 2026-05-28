# In-Progress User Stories — Plan & Acceptance Criteria (2026)

**Source:** Jira project **TM (KAN)** — status *In Progress*  
**Last synced:** February 2026  
**Atlassian board:** [theramate.atlassian.net](https://theramate.atlassian.net)

This document lists current in-progress stories, rewritten as user stories with clear acceptance criteria suitable for development and QA in 2026.

---

## Plan overview

| # | Jira Key | Theme | Priority |
|---|----------|--------|----------|
| 1 | KAN-191 | Pre-booking health form (required vs optional) | Medium |
| 2 | KAN-184 | Practitioner profile — save services & errors | Medium |
| 3 | KAN-190 | Marketplace — mobile therapist radius vs address | Medium |
| 4 | KAN-189 | Exercise library & program visibility | Medium |
| 5 | KAN-188 | Schedule — blocked time vs working hours editing | Medium |
| 6 | KAN-183 | Onboarding → profile address sync & mobile logic | Medium |

---

## 1. KAN-191 — Pre-booking health form (required vs optional)

### User story

**As a** client or guest  
**I want** the health/pre-assessment form to be required only when I have never booked with that practitioner before  
**So that** repeat bookings and returning to the same practitioner are quicker and I am not asked for the same information again when it is already on file.

### Acceptance criteria (2026)

- **AC1 (First-time booking)**  
  When the user has **never** booked with the selected practitioner (and, for guests, when they have no linked client history with that practitioner), the health/pre-assessment form is **required** before the booking can be completed (e.g. step cannot be skipped; submit is disabled until valid completion or explicit “skip” is removed for this case).

- **AC2 (Repeat booking — same practitioner)**  
  When the user has **previously** completed at least one booking with the **same** practitioner, the health form is **optional** (e.g. user can skip or “use previous”; any existing pre-assessment data may be reused or updated).

- **AC3 (Guest vs logged-in)**  
  Logic applies consistently for both **guests** (e.g. identified by session/email/link) and **logged-in clients**, using a clear definition of “same user” and “has booked with this practitioner before” (e.g. by practitioner_id + client/session identifier).

- **AC4 (Clear UX)**  
  The UI clearly indicates when the form is required vs optional (e.g. label, helper text, or step description), and any “skip” or “use previous” option is only shown when the form is optional.

- **AC5 (Data & compliance)**  
  Stored pre-assessment/health data remains associated with the correct user and practitioner and meets existing data-retention and consent expectations (no change to compliance behaviour beyond required vs optional flow).

---

## 2. KAN-184 — Practitioner profile: save services and clearer errors

### User story

**As a** practitioner  
**I want** to save my services in profile management successfully and see clear, actionable error messages when something goes wrong  
**So that** I can correct issues quickly and trust that my service offerings are saved correctly.

### Acceptance criteria (2026)

- **AC1 (Save success)**  
  Saving services from the practitioner profile/settings (e.g. add, edit, reorder, remove) **persists correctly** to the backend and is reflected after reload and in marketplace/public profile.

- **AC2 (Clear errors)**  
  When a save fails (network, validation, server error), the user sees an **explicit, user-friendly error message** (e.g. toast or inline) that:
  - States that the save failed (no silent failure).
  - Prefers a short, actionable reason (e.g. “Connection error”, “Invalid price”, “Service name required”) where the backend or client can provide it.
  - Does not expose sensitive internals (stack traces, DB details) in production.

- **AC3 (Validation before submit)**  
  Where applicable, **client-side validation** runs before submit (e.g. required fields, numeric/format rules) with clear inline or summary messages, so users can fix issues without a server round-trip when possible.

- **AC4 (Recovery)**  
  After an error, the user can correct the data and retry save without losing unsaved edits (e.g. form state preserved or draft restored) where technically feasible.

---

## 3. KAN-190 — Marketplace: mobile therapist shows radius, not address

### User story

**As a** client or guest browsing the marketplace  
**I want** mobile therapists to be shown by **service radius** (e.g. “Serves within X km”) instead of a single clinic address  
**So that** I understand they travel to me and don’t expect a fixed location, and the listing is accurate for both mobile and clinic-based practitioners.

### Acceptance criteria (2026)

- **AC1 (Mobile therapist display)**  
  For practitioners whose type is **mobile** (or equivalent), the marketplace card/list view shows **radius-based** information (e.g. “Serves within 25 km of [base area]” or “Mobile — within X km”) and **does not** show a single clinic address as if it were a fixed venue.

- **AC2 (Guest and client)**  
  Behaviour is the same for **guests** and **logged-in clients** (no difference in what is shown for mobile vs clinic-based).

- **AC3 (Clinic-based unchanged)**  
  Practitioners with a **clinic-based** (or hybrid with primary clinic) type continue to show a clinic address/location as today; only mobile (and optionally hybrid) logic is updated to emphasise radius.

- **AC4 (Search/filters)**  
  Any location-based search or filters (e.g. “near me”, distance) treat mobile therapists by their **service radius** (e.g. base location + radius) so they appear when the client’s location falls within that radius.

- **AC5 (Consistency)**  
  Wording and UX are consistent across marketplace, public profile, and any booking flow that shows practitioner location/radius.

---

## 4. KAN-189 — Exercise library upload and program visibility (practitioner)

### User story

**As a** practitioner  
**I want** to upload media to the exercise library and to see the exercise programs I create in my own dashboard after saving  
**So that** I can build and reuse exercise programs reliably and confirm they are saved before assigning to clients.

### Acceptance criteria (2026)

- **AC1 (Exercise library upload)**  
  Practitioners can **upload** media (e.g. images, video) to the exercise library without errors under supported formats and size limits; failed uploads show a clear error message and do not leave the UI in a broken state.

- **AC2 (Program visible after save — practitioner)**  
  After a practitioner **saves** an exercise program (e.g. creates or edits and saves), the program **appears in the practitioner’s own view** (e.g. “My programs” or equivalent) without requiring a full page reload or navigating away and back; list/detail view reflects the new or updated program.

- **AC3 (Client view unchanged)**  
  Client-side behaviour remains correct: clients can still see and use programs assigned to them as they do today (no regression).

- **AC4 (Data integrity)**  
  Saved programs are stored correctly (e.g. linked to the right practitioner and exercises) and remain visible after browser refresh and across sessions.

- **AC5 (Errors)**  
  Any upload or save failure shows a clear, actionable message (no silent failure); user can retry or correct and save again.

---

## 5. KAN-188 — Schedule: blocked time editable, working hours not

### User story

**As a** practitioner  
**I want** to **edit** my blocked/unavailable time (e.g. time off, meetings) while my **working hours** are clearly separate and either read-only or edited in a dedicated place  
**So that** I don’t accidentally change my recurring availability when I only mean to block a slot, and my schedule stays predictable.

### Acceptance criteria (2026)

- **AC1 (Blocked time editable)**  
  Practitioners can **add, edit, and remove** blocked/unavailable time (e.g. date/time ranges) from the schedule. Changes persist and are reflected in availability and booking views.

- **AC2 (Working hours not mixed with blocks)**  
  **Working hours** (e.g. default weekly availability, clinic hours) are **not** editable in the same flow as blocked time; they are either:
  - Read-only in the schedule/calendar view, with a clear link/entry point to “Edit working hours” (e.g. in settings), or  
  - Edited only in a dedicated “Working hours” or “Availability settings” area, not by editing blocks on the calendar.

- **AC3 (Clear UX)**  
  The UI clearly distinguishes “blocked time” (or “time off”) from “working hours” (e.g. labels, different colours, or separate sections) so practitioners understand what they are editing.

- **AC4 (No regression)**  
  Existing behaviour for generating bookable slots from working hours minus blocked time is preserved; only editability and separation of the two concepts are improved.

---

## 6. KAN-183 — Onboarding: clinic address sync and mobile therapist logic

### User story

**As a** practitioner completing onboarding (or a product owner)  
**I want** the **clinic address** entered at onboarding to sync correctly to my profile and to the rest of the app, and **mobile therapist** logic to be correct end-to-end  
**So that** my profile and marketplace show the right location/radius and I don’t have to re-enter the same information later.

### Acceptance criteria (2026)

- **AC1 (Clinic address sync)**  
  The **clinic address** (and, if applicable, coordinates) entered during practitioner onboarding is **saved and synced** to the user/profile record (e.g. `clinic_address`, `clinic_latitude`, `clinic_longitude` or equivalent) and is visible and correct in:
  - Practitioner profile/settings.
  - Marketplace and public profile (for clinic-based or hybrid).
  - Any booking or location-based features that use clinic address.

- **AC2 (No duplicate entry)**  
  Practitioners do not need to re-enter the same clinic address in profile after onboarding when it was already provided and saved during onboarding.

- **AC3 (Mobile therapist logic)**  
  For practitioners who select **mobile** (or hybrid) during onboarding:
  - Base address / service radius (and any related fields) are saved and synced correctly.
  - Marketplace and booking flows treat them as mobile (e.g. radius-based, not single clinic address) per KAN-190.
  - No conflicting or stale “clinic only” behaviour for clearly mobile/hybrid accounts.

- **AC4 (Data consistency)**  
  Address and location fields are consistent across onboarding, profile, and availability/schedule (e.g. one source of truth or clear sync rules); edits in profile update the same fields used elsewhere.

- **AC5 (Validation)**  
  Address/location validation (e.g. required for clinic-based, format/coordinates) is applied at onboarding and in profile so invalid data is not saved and the user sees clear validation messages.

---

## Summary table (for stand-ups / planning)

| Key     | One-line goal                                      | Main AC focus                          |
|---------|-----------------------------------------------------|----------------------------------------|
| KAN-191 | Health form required only for first-time booking   | First-time vs repeat; guest + client    |
| KAN-184 | Profile services save + clear errors               | Persist save; user-facing errors       |
| KAN-190 | Mobile therapist = radius, not address in marketplace | Display + search for guests & clients |
| KAN-189 | Exercise upload works; practitioner sees program after save | Upload + practitioner visibility    |
| KAN-188 | Blocked time editable; working hours separate      | Edit blocks only; separate working hours |
| KAN-183 | Clinic address sync from onboarding; mobile logic    | Sync to profile/marketplace; mobile consistency |

---

## How to use this document

- **Development:** Use the acceptance criteria as a checklist for implementation and unit/integration tests.
- **QA:** Use ACs as the basis for test cases and regression checks.
- **Jira:** Consider copying refined user story text and ACs into the corresponding Jira issue descriptions or comments, or linking to this doc.
- **Updates:** When stories move to Done or scope changes, update this document or add a “Changelog” section with the date and change.
