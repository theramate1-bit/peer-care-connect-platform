# Clinic-based practitioners

## Definition

**`therapist_type === 'clinic_based'`** — sessions are at the practitioner’s **clinic**. No client-facing “mobile visit request” path for this type.

## Client UX

### Native

**`theramate-ios-client/app/(tabs)/explore/[id].tsx`**

- **`canBookClinic`** — `therapistMode !== "mobile"` → **true** for clinic_based.
- **`canRequestMobile`** — only `mobile` or `hybrid` → **false** for clinic_based.

Primary CTA opens **`/booking`** with **`practitionerId`** (standard clinic booking modal).

### Web

**`src/components/booking/BookingFlow.tsx`** loads products with **`fetchPractitionerProducts(..., { clinicBooking: true })`** — excludes mobile-only services.

**`src/pages/practice/ManualBooking.tsx`** creates sessions with **`p_appointment_type: 'clinic'`** (v1 pay-at-clinic manual bookings).

## Profile / validation

**`validatePracticeLocations`** requires:

- Clinic address + clinic map pin for **`clinic_based`** (and hybrid).

No base address requirement for pure clinic_based.

## Geo / marketplace

Distance and marketplace eligibility for clinic practitioners typically use **clinic coordinates** (see legacy **`PRACTITIONER_TYPE_CLINIC_BASED.md`** §2–3 and geo RPCs). This repo’s **`src/pages/discovery/TherapistSearch.tsx`** lists **`therapist_type`** for display; advanced geo parity may live in Supabase or future web work.

## Backend session shape

Clinic bookings use **`appointment_type = 'clinic'`** on **`client_sessions`** (see RPC **`create_booking_with_validation`** and related migrations).
