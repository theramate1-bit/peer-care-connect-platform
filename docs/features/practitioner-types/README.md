# Practitioner types — feature documentation index

**Practitioner types** (`users.therapist_type`) control **where** sessions happen and **which booking UX** clients see: **clinic_based**, **mobile**, **hybrid**. This is separate from **`users.user_role`** (therapist discipline such as `sports_therapist`).

## Read order

| #   | Doc                                                                                       | What it covers                                       |
| --- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | [Therapist type field & products](./01-therapist-type-field-and-products.md)              | DB columns, `service_type` on products               |
| 2   | [Clinic-based](./02-clinic-based.md)                                                      | Clinic-only practice                                 |
| 3   | [Mobile](./03-mobile.md)                                                                  | Home-visit practice, requests                        |
| 4   | [Hybrid](./04-hybrid.md)                                                                  | Both clinic and mobile                               |
| 5   | [Booking UX by type (web & native)](./05-booking-ux-by-type-web-and-native.md)            | Explore CTAs, hybrid chooser, product filters        |
| 6   | [Slots, conflicts & directional buffers](./06-slots-conflicts-and-directional-buffers.md) | Lead times, `get_directional_booking_buffer_minutes` |
| 7   | [Onboarding, profile & practice locations](./07-onboarding-profile-and-locations.md)      | Validation, hybrid base↔clinic sync                  |

## Canonical product narratives (detail + diagrams)

- [Clinic, mobile & hybrid flows](../clinic-mobile-hybrid-flows.md) — full reference (names of UI components may differ by branch).
- [PRACTITIONER_TYPE_CLINIC_BASED.md](../../product/PRACTITIONER_TYPE_CLINIC_BASED.md), [PRACTITIONER_TYPE_MOBILE.md](../../product/PRACTITIONER_TYPE_MOBILE.md), [PRACTITIONER_TYPE_HYBRID.md](../../product/PRACTITIONER_TYPE_HYBRID.md) — behaviour matrices; trace code under repo-root **`src/`** / **`theramate-ios-client/`** when paths in those docs lag.

## Related

- [USER_TYPES_OVERVIEW.md](../../product/USER_TYPES_OVERVIEW.md)
- [Database schema](../../architecture/database-schema.md) — `therapist_type`, addresses, radius

## Maintenance

Prefer updating **this folder** for file paths in **`src/`** / **`theramate-ios-client/`**. Adjust the three **`PRACTITIONER_TYPE_*`** docs when behaviour changes materially.
