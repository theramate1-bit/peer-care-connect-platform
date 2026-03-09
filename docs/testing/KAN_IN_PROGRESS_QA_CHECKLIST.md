# KAN In-Progress Stories – QA Checklist

Use this checklist for acceptance and regression after implementing KAN-191, KAN-184, KAN-190, KAN-189, KAN-188, KAN-183.

---

## KAN-191 Pre-assessment required/optional

- [ ] **First-time guest:** Book as guest with new email → pre-assessment step is required; no Skip.
- [ ] **Repeat guest:** Same email, same practitioner, prior completed/succeeded session → pre-assessment is optional (Skip available).
- [ ] **First-time client:** Logged-in client, first session with practitioner → pre-assessment required.
- [ ] **Repeat client:** Logged-in client, prior session with same practitioner → pre-assessment optional (Skip available).
- [ ] Guest flow uses `PreAssessmentService.checkFormRequirement(sessionId, guestUser.id)` and does not hard-code “always required”.

---

## KAN-184 Profile services (practitioner_products)

- [ ] **Save error:** Trigger a save failure (e.g. disconnect) → user sees a clear, actionable message and “Your entries are kept. You can try saving again.”
- [ ] **Load error:** Trigger load failure → user sees “Couldn’t load your services” (or similar) and a “Try again” button; list does not show stale data as success.
- [ ] **Delete error:** Trigger delete failure → error message is clear; product remains in list so user can retry.
- [ ] After a successful save, reload the page → product still appears and is available in marketplace/booking.

---

## KAN-190 Mobile therapist card and radius

- [ ] **Non-geo load:** Marketplace loads with `therapist_type`, `base_*`, `mobile_service_radius_km` so mobile/hybrid practitioners have correct data.
- [ ] **Mobile card:** Practitioner with `therapist_type === 'mobile'` shows area/city + “Serves within X km” (no exact address).
- [ ] **Hybrid card:** Shows clinic address (or location) plus “Also serves within X km”.
- [ ] **Clinic card:** Shows clinic address (or location) as before.
- [ ] **CTA – geo:** With “Search by location” active and client within radius → “Book Session” / “Request Mobile” behave correctly (e.g. Request Mobile when within mobile radius).
- [ ] **CTA – non-geo:** Mobile/hybrid with mobile_service_radius_km set show “Request Mobile” (and Book Session when they have clinic services).

---

## KAN-189 HEP upload and visibility

- [ ] **Upload errors:** Unsupported file type → clear message (e.g. “Use images JPEG/PNG/GIF/WebP or videos MP4/WebM/MOV/AVI”). File too large → clear “over 50MB” (or similar) and suggest smaller file.
- [ ] **Upload failure:** Network/storage error → message suggests checking connection / trying again.
- [ ] **Immediate visibility:** Create a new HEP for current client from session/Progress tab → after success, list of programs refreshes immediately and the new program appears without leaving or manually refreshing.

---

## KAN-188 Working hours vs blocked time

- [ ] **Labels:** “Working Hours” (first tab) is clearly described as recurring weekly availability; “Blocked Time” (second tab) as one-off blocks removed from bookable slots.
- [ ] **Help text:** Intro and card descriptions state that working hours define when clients can book and that blocked time is separate and excluded.
- [ ] **Booking validation:** Creating a booking in a blocked slot returns an error (e.g. “This time slot is blocked or unavailable”). Creating a booking outside working hours returns an error (e.g. “outside practitioner working hours”).

---

## KAN-183 Onboarding/profile/mobile address consistency

- [ ] **Onboarding:** Onboarding still writes and preserves `clinic_*`, `base_*`, `mobile_service_radius_km` (and therapist_type) as canonical fields.
- [ ] **Profile load:** Profile page loads and displays `therapist_type`, `base_address`, `base_*`, `mobile_service_radius_km` (using `mobile_service_radius_km`; fallback from `service_radius_km` if needed).
- [ ] **Profile save:** Saving professional info updates `mobile_service_radius_km`, `therapist_type`, `base_*`, `clinic_*` (canonical fields) so marketplace, geo-search, and booking use the same data.
- [ ] **Consistency:** After editing address/radius in Profile, marketplace cards and booking/geo behaviour reflect the updated canonical fields.

---

## Regression (high level)

- [ ] Guest and client booking flows (with and without pre-assessment) complete and payment/redirect work.
- [ ] Profile product save/load/delete and retry behave as above; no data loss on retry.
- [ ] Mobile vs clinic cards and CTAs correct in geo and non-geo modes.
- [ ] HEP create and list refresh work; upload errors are clear and actionable.
- [ ] Availability (working hours + blocked time) and booking validation behave as above.
- [ ] Onboarding → Profile → Marketplace address/radius path uses and updates the same canonical fields.

---

*Checklist version: 1.0 – KAN in-progress flow fixes.*
