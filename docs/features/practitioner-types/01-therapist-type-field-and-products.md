# Therapist type field & products

## `users.therapist_type`

Allowed values in app types (see **`theramate-ios-client/lib/practitionerProfile.ts`**):

- **`clinic_based`** — clients come to the practitioner’s clinic.
- **`mobile`** — practitioner travels to the client (visit address on sessions).
- **`hybrid`** — both; client picks clinic booking vs mobile **request** flow in native UX.

Discipline (what they are professionally) is **`users.user_role`** (e.g. `sports_therapist`) — different axis.

## Location fields (high level)

| Field(s)                                                            | Typical use                                                                        |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **`clinic_address`**, **`clinic_latitude`**, **`clinic_longitude`** | Clinic-based and hybrid                                                            |
| **`base_address`**, **`base_latitude`**, **`base_longitude`**       | Mobile (required); hybrid (can mirror clinic — see [04-hybrid.md](./04-hybrid.md)) |
| **`mobile_service_radius_km`**                                      | Mobile and hybrid — travel limit from base                                         |

Full validation rules: **`validatePracticeLocations`** in **`theramate-ios-client/lib/practitionerProfile.ts`**.

## `practitioner_products.service_type`

Drives which services appear for **clinic slot booking** vs **mobile**:

- **`clinic`**, **`mobile`**, **`both`**, or empty — interpreted when filtering products.

**Web marketplace clinic booking** filters out mobile-only rows when loading products:

- **`src/lib/clientMarketplaceBooking.ts`** — **`fetchPractitionerProducts(..., { clinicBooking: true })`** keeps `service_type` in `clinic`, `both`, or null.

**Native** **`theramate-ios-client/lib/api/booking.ts`** **`fetchPractitionerProducts`** currently loads **all** active products (no clinic filter in the function itself); clinic vs mobile **navigation** is enforced by which screen the user opened (`/booking` vs `/booking/mobile-request`). Align filters here if parity issues appear.

## Legacy nuance

Older docs describe **`booking-flow-type.ts`** (`canBookClinic` / `canRequestMobile` / product normalization). That module is **not** present under repo-root **`src/`** today; equivalent decisions are split between:

- Native **`app/(tabs)/explore/[id].tsx`** (`canBookClinic` / `canRequestMobile` from `therapist_type`),
- Product filters (web),
- Backend RPCs (conflicts, `appointment_type`).
