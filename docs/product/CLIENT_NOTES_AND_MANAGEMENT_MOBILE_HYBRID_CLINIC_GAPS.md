# Client Notes & Management: Mobile, Hybrid, Clinic Gaps

**Scope:** Practitioner client management and client notes (SOAP/treatment notes) in the context of **mobile**, **hybrid**, and **clinic** practitioners.

---

## Summary

- **Session detail view** (calendar → session) and **booking/emails** already use “booking record first” for location (`appointment_type`, `visit_address`).
- **Practice Client Management** (client list, session list, notes modal) does **not** load or show session location. Practitioners cannot see at a glance which sessions are clinic vs visit, and the note editor has no location context.

---

## 1. Where Things Are Consistent (No Gap)

| Area                                             | Behaviour                                                                                                                                                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SessionDetailView** (`/practice/sessions/:id`) | Fetches `appointment_type`, `visit_address`; shows "Location" / "Visit address" and directions using `getSessionLocation`-style logic. Used when navigating from **BookingCalendar**.                 |
| **BookingCalendar**                              | Uses `select('*', ...)` so sessions include location fields; maps `location` via `getSessionLocation(session, session.therapist)` for events and modal.                                               |
| **Credits** (exchange session list)              | Preserves and displays session location (clinic vs visit).                                                                                                                                            |
| **Emails & notifications**                       | Use `getBookingEmailLocationData` / session location for confirmations and in-app notifications (see `docs/features/session-location-rule.md` and `docs/product/EMAIL_AND_BOOKING_LOCATION_GAPS.md`). |

So: **clinic vs mobile/hybrid location is handled correctly** in session detail (from calendar), calendar, credits, and emails.

---

## 2. Gaps: Practice Client Management & Notes

### 2.1 Session list does not show or use location

**Where:** `peer-care-connect/src/pages/practice/PracticeClientManagement.tsx`

- **loadData** (lines ~1907–1931): The `client_sessions` select does **not** include `appointment_type` or `visit_address` (or `start_time` in the first query). Only a fixed set of columns is selected and mapped into `ClientSession`.
- **ClientSession** interface (lines 95–114): No `appointment_type`, `visit_address`, or location-related fields.
- **Sessions tab table** (lines ~3460–3560): Columns are Date, Session, Type, Status, Note, Pre-assessment. There is **no “Location” or “Clinic / Visit” column**, and no filter by session type (clinic vs mobile).

**Impact:**

- Mobile and hybrid practitioners cannot see from the session list which appointments are at clinic vs at the client’s address.
- They cannot filter or sort by location type.

### 2.2 Note editor has no session location context

**Where:** Same file; note editor is opened via `handleEditSessionNote(session)` with `session` from the Practice Client Management session list.

- `editingSession` is typed as `ClientSession`, which has no location fields.
- The note modal/editor does not display “Clinic” vs “Visit at [address]” for the session being documented.

**Impact:**

- When writing or completing SOAP/treatment notes from the client management screen, practitioners do not see whether the session was at clinic or at the client’s home.
- Context that is visible when opening the same session from the calendar (SessionDetailView) is missing when opening from the session list.

### 2.3 Two entry points, different context

| Entry point                                                          | Session data includes location? | Location shown in UI?                       |
| -------------------------------------------------------------------- | ------------------------------- | ------------------------------------------- |
| **Calendar** → “View” → `/practice/sessions/:id` (SessionDetailView) | Yes                             | Yes (Location / Visit address + directions) |
| **Practice Client Management** → Sessions tab → “View” (note modal)  | No                              | No                                          |

So behaviour differs depending on whether the practitioner opens the session from the calendar or from the client/session list.

---

## 3. Recommendations

1. **Session list (Practice Client Management)**
   - Add `appointment_type`, `visit_address`, and `start_time` to the `client_sessions` select and to the `ClientSession` type (and mapping).
   - Add a **Location** column (and optionally a small badge “Clinic” / “Visit”) using the same rule as elsewhere: `getSessionLocation(session, practitioner)`.
   - Optionally: filter or label by “Clinic” vs “Visit” for hybrid practitioners.

2. **Note editor / modal**
   - When opening the note editor, show session context that includes location: e.g. “Session at clinic: [address]” or “Visit at: [client address]” (using the same “booking record first” rule).
   - Either extend `ClientSession` and the list query as above and pass that into the modal, or fetch the single session with `appointment_type` and `visit_address` when opening the note modal.

3. **Consistency**
   - Reuse `getSessionLocation(session, practitioner)` (and practitioner from profile or a minimal join if needed) so that Practice Client Management uses the same rule as SessionDetailView, BookingCalendar, and emails (see `docs/features/session-location-rule.md`).

---

## 4. File reference

- **Practice Client Management:** `peer-care-connect/src/pages/practice/PracticeClientManagement.tsx`
  - Session list query: ~1907–1931
  - `ClientSession` interface: ~95–114
  - Sessions table: ~3460–3560
  - Note editor: `editingSession`, `handleEditSessionNote`
- **Location rule and helpers:**
  - `docs/features/session-location-rule.md`
  - `peer-care-connect/src/utils/sessionLocation.ts` → `getSessionLocation`
- **Session detail (with location):** `peer-care-connect/src/components/sessions/SessionDetailView.tsx`

---

_Last updated: March 2025_
