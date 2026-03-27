# Jest Coverage Scope (Web + Backend + Supabase)

This document describes what is included in Jest unit/integration coverage across the monorepo.

## Web (peer-care-connect)

**Coverage collection** (`collectCoverageFrom`):

- `src/lib/**/*.{ts,tsx}` – all library modules
- `src/services/**/*.{ts,tsx}` – booking, Stripe, practitioner services
- `src/utils/**/*.{ts,tsx}` – session location, pricing, populate scripts
- `src/hooks/**/*.{ts,tsx}` – custom hooks
- `src/config/**/*.{ts,tsx}` – platform fees, pricing config
- `src/emails/**/*.{ts,tsx}` – email render, templates, utilities
- `src/integrations/**/*.{ts,tsx}` – Supabase client and types
- `src/types/**/*.ts` – shared types

**Excluded**: test files, mocks, setup, `main.tsx`, `polyfills.ts`, `vite-env.d.ts`.

**Thresholds**: Currently set to `0` so coverage reports include all application code. Increase as tests are added.

## Backend (Supabase Edge Functions shared logic)

**Coverage collection** (`collectCoverageFrom`):

- `supabase/functions/_shared/validation.ts`
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/_shared/security-headers.ts`
- `supabase/functions/_shared/booking-email-data.ts`

**Tested** via Jest in Node. Shared modules that use only standard APIs (no Deno URLs) run directly.

**Not Jest-tested** (require Deno or live Supabase):

- `csrf.ts` – uses `createClient` from `https://esm.sh/...` and Supabase auth; best tested with Supabase CLI or E2E.
- `rate-limit.ts` – uses `createClient` from URL import and `Deno.env`; best tested in Deno or E2E.
- Individual Edge Function handlers (`send-email`, `stripe-webhooks`, etc.) – run with Supabase CLI or E2E.

## Running tests

```bash
# Web unit/integration
npm run test --workspace=peer-care-connect

# Backend (Supabase shared)
npm run test --workspace=backend

# Both
npm run test

# With coverage and CI flags
npm run test:ci
```

## Test suites added (lib, utils, edge cases)

**Web lib unit tests** (`src/lib/__tests__/`):

- `utils.test.ts` – cn(), formatCurrency()
- `validators.test.ts` – validateData, sessionSchema, productSchema, paymentSchema
- `date.test.ts` – parseDateSafe, formatDateSafe, formatTimeHHMM, formatTimeWithoutSeconds, isToday
- `form-utils.test.ts` – formValidation (email, phone, password)
- `error-messages.test.ts` – ErrorMessageService
- `error-handling.test.ts` – getErrorType, createLoadingState, createRetryConfig, createRetryWithBackoff
- `block-time-utils.test.ts` – isTimeOverlapping
- `constants.test.ts` – PAIN_AREAS, JOINTS, STRENGTH_GRADES, STRENGTH_VALUE_MAP, MOVEMENTS
- `file-path-sanitizer.test.ts` – sanitizeFileName, sanitizePathSegment, buildSafePath, validatePathWithinBase
- `timezone-utils.test.ts` – getCommonTimezones, isValidTimezone, convertTime, getCurrentTimeInTimezone
- `slot-generation-utils.test.ts` – hasConflictWithBuffer, generate15MinuteSlots, generate15MinuteSlotsWithStatus
- `notification-utils.test.ts` – normalizeNotification, parseNotificationRows, cleanNotificationMessage, resolveNotificationDestination
- `onboarding-validation.test.ts` – validateOnboardingStep, validateOnboardingData, getNextIncompleteStep, getOnboardingProgress
- `goal-templates.test.ts` – GOAL_TEMPLATES, calculateTargetFromTemplate, getTargetDateFromTemplate

**Web unit/integration** (`tests/unit/`, `tests/integration/`):

- `booking-flow-type.test.ts` – canBookClinic, canRequestMobile, defaultBookingFlowType, getEffectiveProductServiceType
- `dashboard-routing.integration.test.ts` – getDashboardRoute, shouldRedirectToOnboarding, getOnboardingRoute, canAccessRoute
- `sessionLocation.test.ts` – getSessionLocation() for clinic vs mobile
- `platform-fees.test.ts` – calculateApplicationFee, calculatePractitionerAmount, formatAmount, parseAmount, getFeeBreakdown, validatePricing

**Web services** (`src/services/__tests__/`):

- `practitionerServices.test.ts` – getServiceCategories, getPractitionerServices, getActiveServices, getServiceById (with mocked Supabase)

**Web emails** (`src/emails/__tests__/`):

- `formatting.test.ts` – formatBookingReference, formatTimeForEmail
- `maps.test.ts` – generateGoogleMapsUrl, generateAppleMapsUrl, generateMapsUrl
- `calendar.test.ts` – generateCalendarUrl

**Treatment exchange** (`src/lib/treatment-exchange/__tests__/`):

- `matching.test.ts` – getStarRatingTier, calculateDistance
- `credits.test.ts` – calculateRequiredCredits

**Practitioner types & roles**:

- `types/__tests__/roles.test.ts` – hasRole, isClient, isPractitioner, isAdmin, hasPermission, getRoleDisplayName, ROLE_PERMISSIONS for sports_therapist, massage_therapist, osteopath
- `tests/unit/lib/practitioner-types.test.ts` – getServiceTypeDisplayName, getServiceTypeDescription, validateServicePricing for sports_therapy, massage_therapy, osteopathy
- `tests/unit/lib/booking-flow-type.test.ts` – clinic_based, mobile, hybrid therapist types; canBookClinic, canRequestMobile
- `tests/integration/dashboard-routing.integration.test.ts` – getDashboardRoute for all practitioner types; getOnboardingRoute; canAccessRoute for /practice/\*
- `src/lib/__tests__/onboarding-validation.test.ts` – practitioner step 1 validation for sports_therapist, massage_therapist, osteopath
- `src/lib/__tests__/slot-generation-utils.test.ts` – hasConflictWithBuffer with hybrid mobile→clinic, clinic→mobile, clinic_based buffers

**Backend** (`backend/tests/`):

- `unit/validation.test.ts` – validateEmail, validateUUID, validateRequired, validateRequiredString, validatePositiveInteger, validatePositiveNumber, validateStringLength, validateURL, validateEnum, sanitizeString, validateJSONBody (incl. 10MB limit), validateStripeSignature; null/empty edge cases
- `unit/booking-email-data.test.ts` – getBookingEmailLocationData() for clinic/mobile, visit address override, fallbacks, trimming, null appointment_type
- `unit/security-headers.test.ts` – standard headers, origin handling, empty-string origin
- `integration/cors.integration.test.ts` – known origins, unknown fallback, ALLOWED_ORIGINS env, CORS header structure

**Additional lib tests**:

- `validation.test.ts` – emailSchema, nameSchema, sanitizeInput, validateEmail, validatePassword, validatePhone, validateUrl, validateRateLimit, sanitizeSqlInput, userRegistrationSchema, reviewSchema
- `typography-tokens.test.ts` – typography display/heading/body, fontWeights, typographyClass
- `smart-search/training-data.test.ts` – conditionsDatabase structure, practitioner recommendations per condition
- `session-state-machine.test.ts` – canTransition, validateTransition, getValidNextStatuses, isTerminalStatus, canStartSession, canCompleteSession (peer booking, payment guards)
- `next-available-slot.test.ts` – formatNextAvailableLabel
- `profile-completion.test.ts` – calculateProfileCompletion, calculateProfileActivationStatus (6-check activation)
- `session-display-status.test.ts` – getDisplaySessionStatusLabel, isPractitionerSessionVisible, isClientSessionVisible
- `cancellation-policy.test.ts` – CancellationPolicyService.getPolicy default fallback, custom policy (mocked Supabase)
- `security.test.ts` – SecurityService.sanitizeInput, validateEmail, validatePassword, validateFile
- `metric-defaults.test.ts` – getDefaultMaxValue, getDefaultUnit for pain_level, strength, mobility, flexibility, function
- `progress-calculations.test.ts` – calculateMetricTrend, calculateGoalProgress
- `live-chat-config.test.ts` – LIVE_CHAT_CONFIG structure, shouldShowLiveChat
- `service-defaults.test.ts` – SERVICE_DEFAULTS for sports/massage/osteopath services

**Extended suites** (`*-extended.test.ts`, `*matrix*.test.ts`):

- Parameterized and edge-case tests: validators-extended, date-extended, utils-extended, error-messages-extended, error-handling-extended, session-state-machine-extended, typography-extended, live-chat-extended, service-defaults-extended, metric-defaults-extended, profile-completion-extended, form-utils-extended, session-display-extended, cancellation-policy-extended
- error-type-matrix.test.ts – getErrorType code mapping
- constants-extended, block-time-extended, slot-generation-extended, booking-flow-extended, smart-search-extended
- validation-extended, emails/formatting-extended
- final-batch.test.ts, utils-format.test.ts, file-path-extended.test.ts

**Test count**: 982+ passing (995 total including skipped).

**Database integration tests** (`tests/integration/database/`):

- `booking-operations.test.ts` – CancellationPolicyService.getPolicy RPC, calculateRefund RPC, create_booking params contract, error handling
- `credit-system.test.ts` – calculateRequiredCredits (pure), user_credits query pattern
- `sessions.test.ts` – session_bookings queries (practitioner, client), calendar_events blocked time
- `notifications.test.ts` – notifications table query and update

**Ignored** (require refactor for Jest):

- `address-validation.test.ts` – module uses `import.meta.env`, not supported in Node/CJS.

## Expanding coverage

1. **Web**: Add tests under `src/**/__tests__/` or `tests/unit/`, `tests/integration/`.
2. **Backend**: Add tests in `backend/tests/unit/` or `backend/tests/integration/`.
3. **Supabase functions using URL imports**: Refactor pure logic into separate files without `https://` imports to enable Jest testing, or rely on Deno/Supabase E2E tests.
