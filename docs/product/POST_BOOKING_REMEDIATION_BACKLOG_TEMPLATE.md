# Post-Booking Remediation Backlog Template

Date: 2026-03-08  
Companion doc: `docs/product/POST_BOOKING_REMEDIATION_TABLE.md`

Product decision: guests should be self-serve post-booking.

## Ticket Template

| Ticket Title | Owner | Priority | User Impact | Acceptance Criteria |
| ------------ | ----- | -------- | ----------- | ------------------- |
|              |       |          |             |                     |

## Seed Tickets (Fix Order 1-5)

### 1) Add session location to BookingSuccess details panel

- **Priority:** High
- **User impact:** Users cannot verify where session takes place from the confirmation details panel.
- **Acceptance criteria:**
  - `BookingSuccess` details include session location for clinic and mobile bookings.
  - Display uses shared `getSessionLocation(...)` output.
  - Location shown in details panel matches Add-to-Calendar location behavior.

### 2) Fix guest success CTAs to guest-safe routes

- **Priority:** High
- **User impact:** Guests are sent to protected/mismatched routes after booking.
- **Acceptance criteria:**
  - Guest success screen shows `View booking details` (or equivalent guest-safe wording).
  - CTA routes to public guest-safe booking/details route.
  - Guest account-creation redirect points to intended post-signup destination.

### 3) Align MySessions location model with shared session-location rule

- **Priority:** High
- **User impact:** Client list can show incorrect/insufficient location context, especially for mobile sessions.
- **Acceptance criteria:**
  - `MySessions` data query includes `appointment_type` and `visit_address`.
  - Session rendering uses `getSessionLocation(...)`.
  - Clinic and mobile sessions show correct location labels/content.

### 4) Standardize client post-booking management landing route

- **Priority:** Medium
- **User impact:** Post-booking actions are split between surfaces with inconsistent management affordances.
- **Acceptance criteria:**
  - Product decision documented for canonical client management surface.
  - Success-page routing follows that decision consistently.
  - Management actions are discoverable from landing surface.

### 5) Implement guest self-serve post-booking management

- **Priority:** Medium
- **User impact:** Guest management is currently view-only despite self-serve product intent.
- **Acceptance criteria:**
  - Guest-safe cancel/reschedule (or approved subset) is available from guest booking details/status.
  - Flows are token- or email-link-safe without requiring auth login.
  - Failure states are explicit and non-blocking (clear guidance).
