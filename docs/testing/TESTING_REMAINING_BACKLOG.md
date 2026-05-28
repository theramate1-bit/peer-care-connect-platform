# Testing – What’s Left to Do

**Current state:** 1039 tests passing, 13 skipped, 100/102 suites pass.

---

## Already covered

| Area | Status |
|------|--------|
| **lib/** | validators, utils, date, block-time, cancellation-policy, session-state-machine, slot-generation, profile-completion, notification-utils, metrics, form-utils, security, file-path, constants, error-handling, onboarding, my-sessions-filters |
| **emails/** | All 20 templates, formatting, send flow |
| **services/** | practitionerServices, bookingService, stripeService |
| **utils/** | sessionLocation, pricing |
| **types/** | roles |
| **config/** | platform-fees |
| **integration/** | DB (sessions, credits, bookings, notifications, profiles, qualifications, payments), API (Stripe webhooks, email), treatment-exchange flow |

---

## Skipped tests (intentional)

- **address-validation.test** – uses `import.meta.env`; needs refactor for Jest.
- **treatment-exchange.test** – excluded in `testPathIgnorePatterns`.
- Other excluded specs: AuthRouter, BookingFlow, GuestBookingFlow, PreAssessmentForm, LiveSOAPNotes, etc.

---

## Gaps – suggested next work

### 1. Hooks (0 tests)

- `useEarnings` – earnings calculations
- `useTherapistProfile` – practitioner profile fetch
- `useOnboardingProgress`, `useSupabaseOnboardingProgress`
- `useRealtimeSubscription`, `use-realtime`
- `useScrollValue`, `useMousePosition`, `use-mobile`, `use-toast`

### 2. Lib – core services (thin/partial tests)

- **notification-system.ts** – email/notification logic (integration-style tests exist, but not full unit coverage)
- **treatment-exchange.ts** – main service (skipped)
- **reschedule-service.ts**
- **exchange-notifications.ts**
- **slot-holding.ts**
- **messaging.ts**

### 3. Components (1 test file)

- Only `alert.test.tsx` exists.
- Many UI components are untested (forms, tables, modals, dashboards).

### 4. Integrations

- `supabase/client` – exercised indirectly via mocks in integration tests.
- No dedicated integration tests for external APIs.

### 5. Optional / low priority

- **address-validation** – fix `import.meta.env` usage and re-enable.
- **treatment-exchange** – re-enable or adjust `testPathIgnorePatterns` if needed.
- **populate scripts** (`populate-test-practitioners`, `populate-existing-practitioners`) – scripts, rarely need unit tests.

---

## Suggested order of work

1. Add unit tests for one or two hooks (e.g. `use-mobile`, `use-toast`).
2. Add tests for lib services: `reschedule-service`, `exchange-notifications`, `slot-holding`.
3. Add tests for important components (forms, booking flows).
4. Re-enable or fix `address-validation` and `treatment-exchange` if desired.
5. Add integration tests for Supabase/external APIs where risk is high.

---

## Commands

```bash
npm test                    # Full suite
npm run test:emails         # Email tests only
npm run test:integration    # Integration tests only
```
