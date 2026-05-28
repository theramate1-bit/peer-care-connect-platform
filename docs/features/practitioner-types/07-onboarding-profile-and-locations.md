# Onboarding, profile & practice locations

## Typescript model

**`theramate-ios-client/lib/practitionerProfile.ts`**

- **`TherapistType`** — `'clinic_based' | 'mobile' | 'hybrid'`
- **`validatePracticeLocations`** — blocking validation messages before save
- **`buildPracticeLocationUpdate`** — maps form state → Supabase **`users`** columns (including hybrid base↔clinic sync)

## Native onboarding

**`theramate-ios-client/app/(auth)/practitioner-onboarding.tsx`**

- Step count varies: **`clinic_based`** uses fewer steps than mobile/hybrid (see **`totalSteps`** logic).
- Collects **`therapist_type`**, clinic/base addresses, radius, maps pins where applicable.

## Native profile editing

| Screen                                                          | Role                                                      |
| --------------------------------------------------------------- | --------------------------------------------------------- |
| **`app/(practitioner)/(ptabs)/profile/edit-profile.tsx`**       | **`therapist_type`** picker + core profile fields         |
| **`app/(practitioner)/(ptabs)/profile/practice-locations.tsx`** | Locations + radius; uses same **`TherapistType`** options |

## Web

This repo snapshot does **not** include a full practitioner **profile editor** page under **`src/`** comparable to older wireframe inventories. Practitioner-facing pages present include **`src/pages/practice/ManualBooking.tsx`**, **`PaymentPreferences.tsx`**, **`UpcomingSessions.tsx`**.

If web practitioner onboarding lives elsewhere (another package or route), link it here when consolidated.

## Completion helper

**`theramate-ios-client/lib/completePractitionerOnboarding.ts`** — validates **`therapist_type`** among allowed values during onboarding completion.
