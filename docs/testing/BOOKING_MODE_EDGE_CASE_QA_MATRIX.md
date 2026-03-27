# Booking Mode Edge-Case QA Matrix

Date: 2026-03-09  
Source: Consolidated code-verified findings across client and guest booking flows.

## Scope

This matrix tracks edge cases across:

- actor (`client`, `guest`)
- practitioner mode (`clinic`, `mobile`, `hybrid`)
- entry point/surface
- expected behavior vs current behavior
- risk and execution priority

## Matrix

| ID     | Risk   | Actor          | Practitioner Mode                                      | Entry Point                                                | Scenario                                                   | Expected Behavior                                                                                                             | Actual Behavior (Current)                                                                                                                                                             | Status    |
| ------ | ------ | -------------- | ------------------------------------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| BM-001 | High   | Guest          | Mobile                                                 | Mobile request status                                      | Accepted mobile request CTA from status view               | `View session` should route guest to guest-safe session page (`/booking/view/:sessionId`)                                     | Guest path now routes to `/booking/view/:sessionId`; authenticated users continue to `/client/sessions`                                                                               | Confirmed |
| BM-002 | High   | Guest          | Clinic / Hybrid (clinic path)                          | Booking success page                                       | Post-booking success navigation and create-account CTA     | Guest should stay on guest-safe booking/session routes                                                                        | Guest booking CTA now uses guest-safe booking view route; account-creation redirect updated to authenticated sessions route                                                           | Confirmed |
| BM-003 | High   | Guest          | Clinic / Hybrid (clinic path)                          | Guest clinic flow                                          | Same-day approval branch parity with signed-in clinic flow | Guest clinic flow should honor approval checks (`requires_approval`, `pending_approval`) before payment/session progression   | Guest flow now sets held payment state when `pending_approval`/`requires_approval` is present, matching same-day approval handling intent                                             | Confirmed |
| BM-004 | High   | Client         | Mobile-only practitioner reached from clinic rebooking | Rebooking surfaces (`MySessions`, `MyBookings`, dashboard) | Rebooking when practitioner mode changed to mobile-only    | Clinic flow should auto-reroute into mobile request flow (no user dead-end)                                                   | Rebooking surfaces now wire `onRedirectToMobile` and redirect into client booking mobile mode                                                                                         | Confirmed |
| BM-005 | High   | Guest          | Mobile                                                 | Mobile request lifecycle                                   | Guest continuity after submit and while pending            | Guests should have clear follow-up actions (status tracking, cancel if pending, session view if accepted)                     | Success now offers guest request tracking; guest pending cancel is enabled via guest-safe cancellation RPC; accepted session view uses guest-safe route                               | Confirmed |
| BM-006 | High   | Client         | Mobile                                                 | Email notification links                                   | Mobile request email deep links for authenticated users    | Emails should deep-link authenticated users to `/client/mobile-requests`                                                      | Email deep links now route by actor: authenticated clients -> `/client/mobile-requests`, guests -> guest request route                                                                | Confirmed |
| BM-007 | Medium | Shared         | Clinic / Mobile / Hybrid                               | Mode eligibility gate                                      | Booking mode availability by products + geo config         | Mode availability should require compatible active products; mobile requires radius + base coordinates                        | Works as designed; rule is implemented in booking mode resolution                                                                                                                     | Confirmed |
| BM-008 | Medium | Client + Guest | Clinic / Hybrid (clinic path)                          | Clinic checkout                                            | Temporary pending booking + race handling                  | `pending_payment` hold with ~5-minute expiry; return to step 1 if slot blocked/taken                                          | Works as designed in both client and guest clinic flows                                                                                                                               | Confirmed |
| BM-009 | Medium | Shared         | Mobile / Hybrid (mobile path)                          | Mobile request flow validation                             | Mobile request preconditions before submit                 | Must block if no mobile services, missing base coords/radius, or out-of-radius address                                        | Works as designed with blocking validations                                                                                                                                           | Confirmed |
| BM-010 | Medium | Shared         | Mobile / Hybrid (mobile path)                          | DB lifecycle controls                                      | Duplicate pending request prevention + TTL expiry          | Duplicate pending requests (same client/practitioner/date/time) prevented; pending auto-expires in ~60 minutes; hold released | Implemented in migration logic and lifecycle functions                                                                                                                                | Confirmed |
| BM-011 | Medium | Client + Guest | Clinic / Hybrid (clinic path)                          | Pre-assessment step                                        | Repeat booker path divergence                              | Required/skip logic should support shorter flow for repeat bookers in both guest and client paths                             | Implemented in both flows (skip branch present)                                                                                                                                       | Confirmed |
| BM-012 | Medium | Shared         | Clinic / Hybrid (clinic path)                          | Booking modal service filtering                            | No clinic-compatible products available                    | User should receive explicit blocking message (not silent failure) and clear next step                                        | Modal now shows explicit clinic-unavailable message and offers `Request Visit to My Location` recovery when mobile path is available; otherwise shows clear fallback guidance         | Confirmed |
| BM-013 | Low    | Shared         | Hybrid                                                 | Mode chooser UI by surface                                 | Hybrid modality chooser consistency                        | Same interaction pattern and copy across marketplace/direct/public/profile/client surfaces                                    | Shared `HybridBookingChooser` now used consistently across marketplace, direct booking, profile viewer, public therapist profile, and client booking with aligned labels and behavior | Confirmed |

## Priority Run Order

1. BM-013 (consistency polish)
2. BM-001 to BM-012 (regression checks for confirmed fixes and safeguards)

## Suggested Execution Columns (for QA tracker export)

- `ID`
- `Actor`
- `Practitioner Mode`
- `Entry Point`
- `Expected Behavior`
- `Actual Behavior`
- `Risk`
- `Status`
- `Tester`
- `Build/Commit`
- `Evidence URL / Screenshot`
