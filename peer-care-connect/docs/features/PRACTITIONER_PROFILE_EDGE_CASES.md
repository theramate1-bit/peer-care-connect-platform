# Practitioner Profile Edge Cases

**Date:** March 2025  
**Status:** 🔍 Discovery & Tracking  
**Scope:** Profile.tsx, ProfileViewer, ProfileCompletionWidget, qualifications, photo upload, address fields

---

## Overview

Edge cases, failure modes, and gaps in the practitioner profile workflow—from editing professional info through photo upload, qualifications, and marketplace visibility.

---

## 🔴 CRITICAL – Data & UX

### 1. **Unsaved changes lost on navigate/close** ✅ Fixed
**Was:** No `beforeunload` handler; user could lose edits on tab close or refresh.

**Now:** `beforeunload` handler warns when `hasChanges` is true.

### 2. **Partial save failures** ✅ Mitigated
**Was:** Generic "Update 1 failed" messaging when one of multiple updates failed.

**Now:** Human-readable labels per update (Personal info, Professional info, Professional statement, Preferences, Notification settings). User sees which part failed. No rollback (architectural); clearer errors help retry.

### 3. **Qualification add: upload vs DB atomicity** ✅ Fixed
**Was:** If storage upload succeeded but `practitioner_qualification_documents` insert failed, orphaned file remained in storage.

**Now:** On insert failure, `uploadQualificationDocument` deletes the uploaded file from storage before rethrowing. Qualification add flow already deletes qualification row if document upload fails.

---

## 🟠 HIGH – Consistency & Validation

### 4. **Profile CTA dismissed but still incomplete** ✅ Fixed
**Was:** Practitioner dismisses CTA; widget disappeared with no way to restore; could forget about incomplete products/availability.

**Now:** When dismissed, a compact card shows "Your profile is X% complete. Add services and availability to appear in the marketplace." with a "Show checklist" button that restores the full CTA.

### 5. **Address/type consistency for mobile/hybrid** ⚠️ Verified
**Current:** `validateForm()` already enforces: mobile → base_address + radius required; hybrid → clinic_address + base_address + radius required; clinic_based → clinic_address required. Uses `validateDetailedStreetAddress` for base_address.

**Impact:** Mitigated; save is blocked if invalid. Schema verified via Supabase MCP: users has base_address, clinic_address, therapist_type, mobile_service_radius_km.

### 6. **Real-time overwrite of unsaved changes** ✅ Mitigated
**Was:** User could navigate away via Link/useNavigate and lose unsaved changes with no prompt.

**Now:** `unstable_usePrompt` blocks in-app navigation when `hasChanges`; user sees "You have unsaved changes. Are you sure you want to leave?" before navigating. Tab close/refresh still covered by `beforeunload`. Real-time toast remains (no conflict resolution; user can choose to save or discard).

### 7. **Stale profile in marketplace** ✅ Fixed
**Was:** Practitioner edits profile; client with marketplace open saw stale cards until refresh or opening a modal.

**Now:** Marketplace listens for `visibilitychange`; when user returns to the tab, `loadPractitioners()` refetches. Plus refetch when booking modal opens.

---

## 🟡 MEDIUM – UX & Parity

### 8. **ClientProfile vs Profile photo upload** ✅ Fixed
**Was:** ClientProfile had minimal validation (image type only), no size limit or retry.

**Now:** ClientProfile matches practitioner Profile: file type validation, 5MB limit, 3 retries with backoff.

### 9. **Hash tab `#billing` not in handler** ✅ Fixed
**Was:** `handleHashChange` validTabs omitted `billing`; `#billing` did not switch tab.

**Now:** `billing` added to validTabs in handleHashChange.

### 10. **Profile completion vs marketplace eligibility** ✅ Fixed
**Was:** Practitioner could have high completion % but lack products/availability; connection to marketplace not explicit.

**Now:** ProfileCompletionWidget shows explicit hint when `!hasAvailability || productsCount === 0`: "Services and availability are required to appear in the marketplace."

---

## 📋 Summary Table

| # | Edge Case | Severity | Status |
|---|-----------|----------|--------|
| 1 | Unsaved changes lost on navigate/close | 🔴 Critical | ✅ Fixed |
| 2 | Partial save failures | 🔴 Critical | ✅ Mitigated |
| 3 | Qualification upload vs DB atomicity | 🔴 Critical | ✅ Fixed |
| 4 | Profile CTA dismissed, still incomplete | 🟠 High | ✅ Fixed |
| 5 | Address/type consistency mobile/hybrid | 🟠 High | ⚠️ Verified |
| 6 | Real-time overwrite of unsaved changes | 🟠 High | ✅ Mitigated |
| 7 | Stale profile in marketplace | 🟠 High | ✅ Fixed |
| 8 | ClientProfile vs Profile photo parity | 🟡 Medium | ✅ Fixed |
| 9 | Hash tab #billing not in handler | 🟡 Medium | ✅ Fixed |
| 10 | Profile completion vs marketplace eligibility | 🟡 Medium | ✅ Fixed |

---

---

## Supabase MCP Verification (March 2025)

- **users:** profile_photo_url, bio, clinic_address, base_address, therapist_type, mobile_service_radius_km all exist (text/integer, nullable as expected).
- **Tables for profile save:** users, therapist_profiles, notification_preferences, qualifications, practitioner_qualification_documents all exist.
- **Storage:** qualifications bucket used for qualification documents; cleanup on insert failure uses `supabase.storage.from('qualifications').remove([filePath])`.
- **Address validation:** validateForm() enforces base_address + radius for mobile/hybrid; validateDetailedStreetAddress for full address.

---

## Related Docs

- [PRACTITIONER_DASHBOARD_EDGE_CASES.md](./PRACTITIONER_DASHBOARD_EDGE_CASES.md)
- [BOOKING_MODAL_EDGE_CASES.md](./BOOKING_MODAL_EDGE_CASES.md)
- [MARKETPLACE_BOOKING_EDGE_CASES.md](./MARKETPLACE_BOOKING_EDGE_CASES.md)
- [EDGE_CASES_OPEN.md](./EDGE_CASES_OPEN.md)
