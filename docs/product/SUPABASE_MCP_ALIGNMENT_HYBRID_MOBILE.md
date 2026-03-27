# Supabase MCP alignment – hybrid mobile plan

This document records the state of the database (via Supabase MCP) against the [Hybrid mobile eligibility and operations plan](.cursor/plans/hybrid_mobile_eligibility_and_ops_b7ce41be.plan.md).

## Applied migrations (via MCP)

The following migrations were applied to project `aikqnvltuwwgifuocvto` using the Supabase MCP `apply_migration` tool:

| Migration name                                 | Purpose                                                                                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hybrid_buffer_clinic_to_mobile`               | `get_directional_booking_buffer_minutes`: 30 min for clinic→mobile and mobile→mobile (hybrid/mobile)                                                                      |
| `mobile_requests_return_session_id`            | `get_practitioner_mobile_requests`: return `session_id` so UI can link accepted requests to the created session                                                           |
| `hybrid_require_base_for_mobile`               | `create_mobile_booking_request`: require `base_latitude`/`base_longitude` for mobile and hybrid; no clinic fallback; supports `p_pre_assessment_payload` and `expires_at` |
| `create_booking_mobile_visit_address_required` | `create_booking_with_validation`: when `p_appointment_type = 'mobile'`, return error if `p_visit_address` is null or blank                                                |

## Verification (post-apply)

- **Buffer:** `get_directional_booking_buffer_minutes('hybrid','clinic','mobile')` = 30, `('hybrid','mobile','mobile')` = 30.
- **Session link:** `get_practitioner_mobile_requests` return type includes `session_id`.
- **Mobile request:** `create_mobile_booking_request` enforces base coords only and returns “Practitioner base location is not configured for mobile requests” when base is missing.
- **Internal booking:** `create_booking_with_validation` includes `MISSING_VISIT_ADDRESS` validation for mobile.

## Local migration files

The same logic lives in local migrations (for version control and other environments):

- `supabase/migrations/20260313100000_hybrid_require_base_for_mobile.sql`
- `supabase/migrations/20260313100100_hybrid_buffer_clinic_to_mobile.sql`
- `supabase/migrations/20260313100200_mobile_requests_return_session_id.sql`
- `supabase/migrations/20260313100300_create_booking_mobile_visit_address_required.sql`

When running `supabase db push` or similar, these will apply in order. The MCP-applied names above are the snake_case names used with `apply_migration`; the timestamps in the filenames are for ordering only.

## Plan checklist vs database

| Plan item                                                    | Backend (Supabase)                                                        | Frontend (repo)                                                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1. Hybrid mobile eligibility (base only, no clinic fallback) | `create_mobile_booking_request` requires base; clear error message        | `canRequestMobile` and geo-search use base only; setup-required message in `MobileBookingRequestFlow` |
| 2. Buffer: clinic→mobile, mobile→mobile 30 min               | `get_directional_booking_buffer_minutes` returns 30 for those cases       | `slot-generation-utils` has same rules; flows pass `therapistType` and `requestedAppointmentType`     |
| 3. Request→session handoff                                   | `get_practitioner_mobile_requests` returns `session_id`                   | `MobileRequestManagement` shows “View session” for accepted requests                                  |
| 4. Dashboard clinic/mobile visibility                        | N/A (data already in `client_sessions`)                                   | `SessionData` has `appointment_type`/`visit_address`; cards show Clinic/Mobile and location           |
| 5. Internal mobile booking hardening                         | `create_booking_with_validation` rejects mobile without `p_visit_address` | `PracticeClientManagement` validates visit address and passes buffer context to slot picker           |

Last verified via Supabase MCP: 2026-03-13 (project `aikqnvltuwwgifuocvto`).
