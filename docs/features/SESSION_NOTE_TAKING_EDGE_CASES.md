# Session Note-Taking Edge Cases

**Date:** March 2025  
**Status:** 🔍 Discovery & Tracking  
**Scope:** treatment_notes, session_recordings, SOAP, DAP, FREE_TEXT, LiveTreatmentNotes, PracticeClientManagement

---

## Overview

Edge cases, failure modes, and gaps in session note-taking—treatment notes (SOAP, DAP, Free Text), session recordings, completion checks, guest sessions, and RLS.

---

## 🔴 CRITICAL – Data & Access

### 1. **RLS blocks finalizing notes (draft → completed)** ✅ Fixed
**Was:** Policy had `WITH CHECK (status = 'draft')`; transition to `completed` failed.

**Now:** Migration `20260310110000_treatment_notes_allow_finalize` allows `status IN ('draft', 'completed')` in WITH CHECK. Practitioners can finalize notes; completed notes still cannot be re-edited (USING requires status = 'draft').

### 2. **Guest clients cannot view their notes** ⚠️ Verified
**Current:** RLS "Clients can view their treatment notes" uses `auth.uid() = client_id`. Guest sessions use `upsert_guest_user` → `client_id` is set. When guest logs in as that user, they can view notes. Notes with `client_id` null (standalone) are practitioner-only. Unauthenticated guests cannot view (no token-based access).

### 3. **Session deleted – notes cascade**
**Current:** `treatment_notes.session_id` has `ON DELETE CASCADE`.

**Impact:** Deleting a session permanently deletes all notes—no soft delete, no audit trail.

---

## 🟠 HIGH PRIORITY – Flow & Data

### 4. **LiveTreatmentNotes requires clientId** ✅ Fixed
**Was:** Props required `clientId: string`; guest sessions could not pass null.

**Now:** `clientId: string | null | undefined`; insert uses `clientId ?? null`. Same for EnhancedTreatmentNotes.

### 5. **onNotesUpdate stale closure** ✅ Fixed
**Was:** `onNotesUpdate` used stale `notes` from closure.

**Now:** Use functional `setNotes(prev => { const next = ...; onNotesUpdate?.(next); return next; })` so callback receives current state. Applied to LiveTreatmentNotes and EnhancedTreatmentNotes.

### 6. **DAP / FREE_TEXT completion not counted** ✅ Fixed
**Was:** `checkTreatmentNotesCompletion` filtered by `template_type = 'SOAP'` only.

**Now:** Fetches all treatment_notes for session; any note with `status = 'completed'` counts. SOAP section check still scoped to SOAP notes only.

### 7. **Auto-save loss on navigate** ✅ Fixed
**Was:** User could navigate away before auto-save (2s/3s) → content lost.

**Now:** `beforeunload` handler warns when unsaved content exists. LiveTreatmentNotes and EnhancedTreatmentNotes both use it.

### 8. **Dual completion paths**
**Current:** Completion via `session_recordings` (status = completed) OR `treatment_notes` (SOAP status = completed). Different tables, different flows.

**Impact:** Inconsistent state if one path succeeds and the other fails or is missed.

---

## 🟡 MEDIUM PRIORITY – UX & Consistency

### 9. **Standalone notes excluded from completion**
**Current:** `session_id` is nullable; notes can exist without a session. `checkTreatmentNotesCompletion` is session-scoped.

**Impact:** Standalone notes never count toward "session notes complete."

### 10. **New note requires client (no guest path)** ✅ Fixed
**Was:** `TreatmentNotes` handleSaveNewNote required `client_id`; could not create standalone/guest notes.

**Now:** Client is optional; "None (standalone note)" option added. Insert uses `client_id: newNoteData.client_id || null`. Standalone notes display as "Standalone" in the list.

### 11. **Practitioner role vs template choice** ✅ Fixed
**Was:** Template defaulted to SOAP regardless of practitioner role.

**Now:** When opening session notes with no existing notes, `loadStructuredNotes` uses role-appropriate default: osteopath→SOAP, sports_therapist→DAP, massage_therapist→DAP (per practitioner-roles.mdc). Existing notes still determine template when present.

### 12. **Cannot correct completed notes** ✅ Fixed (workaround)
**Was:** RLS prevents UPDATE when `status = 'completed'`; no UI for corrections.

**Now:** "Add correction" button in completed-notes view opens a modal. Inserts a new treatment_note (note_type general, template_type FREE_TEXT, status completed) with timestamped prefix. Corrections displayed in "Corrections & addenda" section. Original note remains immutable.

### 13. **template_type consistency** ✅ Fixed
**Was:** `LiveTreatmentNotes` insert omitted `template_type` (relied on DB default).

**Now:** Explicitly passes `template_type: 'FREE_TEXT'` for consistency.

---

## 🟢 LOWER PRIORITY – Resilience

### 14. **Concurrent editing conflicts**
**Current:** Real-time subscriptions; no conflict resolution.

**Impact:** Two tabs editing same note can overwrite each other.

### 15. **Whitespace-only content** ✅ Fixed
**Was:** TherapistDashboard Save Notes could insert without trim/validation; whitespace-only possible.

**Now:** TherapistDashboard validates `noteContent.trim()` before insert; shows toast if empty. Also passes `template_type: 'FREE_TEXT'`. Other insert paths already had trim checks.

### 16. **Timestamp vs session_date**
**Current:** Notes have `timestamp`; sessions have `session_date` + `start_time`.

**Impact:** Reports/filtering by "session date" vs "note timestamp" may diverge.

---

## Completed vs In-Progress States

### 17. **Multiple session_recordings per session** ✅ Fixed
**Was:** `checkTreatmentNotesCompletion` used `.limit(1)`—arbitrary row checked.

**Now:** Fetches all session_recordings for session; `recordings?.some(r => r.status === 'completed')`—any completed row counts.

### 18. **session_recordings vs treatment_notes status mismatch**
**Current:** Two tables, two status models:
- `session_recordings`: `recording` | `processing` | `completed` | `error` | `draft` | `archived`
- `treatment_notes`: `draft` | `completed`

**Impact:** Completion is OR (either table counts). Recording `completed` but treatment_notes all `draft` → session shows "notes complete". Reverse: treatment_notes `completed` but recording `recording` → also complete. No requirement that both are consistent.

### 19. **Recording status `processing` or `error`** ✅ Fixed
**Was:** Recording in `processing` or `error` → no UI guidance; practitioner could be unsure if manual completion was appropriate.

**Now:** `checkTreatmentNotesCompletion` returns `recordingProcessingOrError` when session_recordings has processing/error and no completed recording. PracticeClientManagement shows hint: "AI transcription in progress or unavailable. You can complete notes manually below."

### 20. **In-progress UI vs DB state**
**Current:** Practitioner sees "Complete" when SOAP sections filled. Completion writes to both tables. No explicit "in progress" state in UI—either draft or completed.

**Impact:** If practitioner closes before clicking Complete, in-progress work stays draft. Auto-save may have persisted to treatment_notes as draft.

---

## Table-Level Edge Cases

### 21. **session_recordings lacks template_type**
**Current:** `session_recordings` has `soap_subjective`, `soap_objective`, etc.—SOAP-only columns. `treatment_notes` has `template_type` (SOAP, DAP, FREE_TEXT).

**Impact:** DAP or FREE_TEXT completion cannot use session_recordings path; only treatment_notes. Recording flow assumes SOAP.

### 22. **client_notes table (deprecated)** ⚠️ Verified
**Current:** `client_notes` table exists; migration moved data to `treatment_notes`. Table kept for rollback.

**Verified:** No active `.from('client_notes')` references in codebase. `client_notes` as column name on other tables (e.g. `mobile_booking_requests`, `exercise_program_progress`) is unrelated.

### 23. **progress_metrics / progress_goals reference session_id**
**Current:** `progress_metrics.session_id` nullable (`ON DELETE SET NULL` per migration patterns). Notes and progress can share session.

**Impact:** Session deleted → notes CASCADE delete; progress_metrics may have `session_id` set to null. No cascade on progress tables for session delete (depends on FK).

### 24. **client_sessions ON DELETE CASCADE**
**Current:** `treatment_notes` and `session_recordings` both have `session_id REFERENCES client_sessions(id) ON DELETE CASCADE`.

**Impact:** Cancelled/deleted session → all notes and recordings gone. No soft delete, no audit trail. GDPR/legal hold scenarios not supported.

### 25. **treatment_notes default status/type** ✅ Fixed
**Was:** Insert paths inconsistent on `template_type`; some omitted it.

**Now:** All insert paths pass `template_type: 'FREE_TEXT'` where applicable: TherapistDashboard, LiveTreatmentNotes, EnhancedTreatmentNotes, TreatmentNotes handleSaveNewNote. Status defaults to `draft` from DB; no explicit override needed.

---

## 📋 Summary Table

| # | Edge Case | Severity | Status |
|---|-----------|----------|--------|
| 1 | RLS blocks draft→completed update | 🔴 Critical | ✅ Fixed |
| 2 | Guest clients cannot view notes | 🔴 Critical | ⚠️ Verified |
| 3 | Session delete cascades notes | 🔴 Critical | |
| 4 | LiveTreatmentNotes clientId for guests | 🟠 High | ✅ Fixed |
| 5 | onNotesUpdate stale closure | 🟠 High | ✅ Fixed |
| 6 | DAP/FREE_TEXT completion not counted | 🟠 High | ✅ Fixed |
| 7 | Auto-save loss on navigate | 🟠 High | ✅ Fixed |
| 8 | Dual completion paths | 🟠 High | |
| 9 | Standalone notes excluded | 🟡 Medium | |
| 10 | New note requires client | 🟡 Medium | ✅ Fixed |
| 11 | Role-appropriate template | 🟡 Medium | ✅ Fixed |
| 12 | Cannot correct completed notes | 🟡 Medium | ✅ Fixed |
| 13 | template_type consistency | 🟡 Medium | ✅ Fixed |
| 14 | Concurrent editing conflicts | 🟢 Low | |
| 15 | Whitespace-only content | 🟢 Low | ✅ Fixed |
| 16 | Timestamp alignment | 🟢 Low | |
| 17 | Multiple session_recordings per session | 🟠 High | ✅ Fixed |
| 18 | session_recordings vs treatment_notes mismatch | 🟠 High | |
| 19 | Recording processing/error status | 🟡 Medium | ✅ Fixed |
| 20 | In-progress UI vs DB state | 🟡 Medium | |
| 21 | session_recordings SOAP-only (no DAP/FREE_TEXT) | 🟡 Medium | |
| 22 | client_notes deprecated | 🟢 Low | ⚠️ Verified |
| 23 | progress_metrics session_id on delete | 🟢 Low | |
| 24 | CASCADE delete, no audit | 🔴 Critical | |
| 25 | treatment_notes default status/type | 🟢 Low | ✅ Fixed |

---

## Supabase MCP Verification (March 2025)

- **treatment_notes UPDATE RLS:** Previously `WITH CHECK (status = 'draft')` blocked draft→completed. Applied migration to allow `status IN ('draft', 'completed')`.
- **treatment_notes schema:** `client_id` nullable; `template_type` default `FREE_TEXT`; `status` default `draft`; `note_type` CHECK (subjective, objective, assessment, plan, general).
- **treatment_notes SELECT RLS:** Clients `auth.uid() = client_id`; practitioners `auth.uid() = practitioner_id`. Guest sessions with client_id from upsert_guest_user are viewable when guest logs in.
- **treatment_notes sample:** 14 notes, all with client_id set.
- **session_recordings:** status CHECK includes `recording`, `processing`, `completed`, `error`, `draft`, `archived`. SOAP columns: soap_subjective, soap_objective, soap_assessment, soap_plan. No unique constraint on (session_id, practitioner_id).
- **treatment_notes:** status CHECK `draft` | `completed`; template_type CHECK `SOAP` | `DAP` | `FREE_TEXT`.

---

## Related Docs

- [PRACTITIONER_DASHBOARD_EDGE_CASES.md](./PRACTITIONER_DASHBOARD_EDGE_CASES.md)
- [BOOKING_MODAL_EDGE_CASES.md](./BOOKING_MODAL_EDGE_CASES.md)
- [EDGE_CASES_OPEN.md](./EDGE_CASES_OPEN.md)
