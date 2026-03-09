# Onboarding Performance Verification

## Goal
Validate smooth 60 FPS onboarding transitions for all roles and Stripe Connect steps with measurable budgets.

## Routes And Flows
- Practitioner onboarding: `/onboarding`
- Stripe return bridge: `/onboarding/stripe-return`
- Roles to verify: `sports_therapist`, `massage_therapist`, `osteopath`, `client`

## Baseline Capture Protocol
1. Open Chrome DevTools Performance panel with CPU throttling disabled.
2. Start recording, then run:
   - Step transition tap (`Continue`) for each onboarding step.
   - Stripe setup initialization and completion loop.
3. Stop recording and log:
   - Long tasks count (`>50ms`)
   - Worst frame time on transition
   - First visual feedback latency from tap
4. Run React Profiler for one full practitioner flow and one client flow.

## Acceptance Budgets
- Tap-to-feedback latency: `<100ms`
- Step transition frame budget: majority frames `<16.67ms`
- No repeated forced layout warnings during step transitions
- No long-task spikes during non-Stripe step changes
- Stripe embedded retries stay in-page (no full page reload)

## Scenarios

### Practitioner (Clinic)
- Select `clinic_based`
- Complete basic info and location
- Validate smooth transition into Stripe step
- Confirm back navigation remains smooth

### Practitioner (Mobile/Hybrid)
- Select `mobile` and `hybrid` separately
- Adjust radius slider and continue
- Verify preloaded Stripe step opens without layout shift

### Client
- Complete 2-step onboarding flow
- Verify transitions and no dropped-frame jank on submit

### Stripe Connect
- Initial setup path
- Resume existing incomplete account path
- Retry/error path (no `window.location.reload`)
- Completion path and return navigation

## Reporting Template

Use one row per scenario:

| Scenario | Device | Long Tasks | Worst Frame (ms) | Tap Feedback (ms) | Forced Reflow Warnings | Pass/Fail |
|---|---|---:|---:|---:|---|---|
| Practitioner clinic | Desktop |  |  |  |  |  |
| Practitioner mobile | Desktop |  |  |  |  |  |
| Practitioner hybrid | Desktop |  |  |  |  |  |
| Client | Desktop |  |  |  |  |  |
| Stripe setup/retry | Desktop |  |  |  |  |  |

## Notes
- Respect reduced motion by enabling `prefers-reduced-motion` and confirming no broken step flow.
- If any scenario fails, include the exact transition and component trace before regression fixes.
