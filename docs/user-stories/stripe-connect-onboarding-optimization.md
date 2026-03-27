# User Story: Optimize Stripe Connect Onboarding Experience

## Story Type

**Performance & UX Improvement**

## Epic

**Onboarding Experience Improvement**

## User Story

**As a** practitioner during onboarding  
**I want** the Stripe Connect payment setup to be faster and more streamlined  
**So that** I can complete onboarding quickly without unnecessary delays or confusion

## Problem Statement

The current Stripe Connect onboarding process is taking too long and causing user frustration:

- Multiple loading states and checks
- Polling every 2 seconds for completion status
- Users waiting for account creation API calls
- Embedded component initialization delays
- No clear progress indication
- Potential for timeouts or errors during setup

## Acceptance Criteria

### Performance Improvements

- [ ] Account creation API call completes in < 2 seconds
- [ ] Embedded component loads in < 1 second
- [ ] Completion detection happens within 5 seconds of user finishing
- [ ] Reduce unnecessary API calls and polling
- [ ] Implement optimistic UI updates where possible

### User Experience Improvements

- [ ] Clear progress indicators showing current step
- [ ] Estimated time remaining displayed
- [ ] Pre-fill user information from profile (name, email, etc.)
- [ ] Skip unnecessary steps if information already available
- [ ] Better error messages with actionable next steps
- [ ] Allow users to save progress and return later

### Technical Improvements

- [ ] Optimize Edge Function response times
- [ ] Cache account status checks
- [ ] Reduce polling frequency with smart detection
- [ ] Implement WebSocket or Server-Sent Events for real-time status updates
- [ ] Add retry logic with exponential backoff
- [ ] Pre-warm Stripe Connect instance

## Current Implementation Analysis

### Current Flow

1. **Initial Check** (`PaymentSetupStep.tsx`)
   - Checks for existing Connect account (database query)
   - Loading state while checking
   - **Time:** ~500ms-1s

2. **Account Creation** (`handleStartStripeConnect`)
   - Calls Edge Function to create Connect account
   - Multiple API calls and error handling
   - **Time:** ~2-5 seconds

3. **Embedded Component Initialization** (`EmbeddedStripeOnboarding.tsx`)
   - Fetches client secret from backend
   - Initializes Stripe Connect JS SDK
   - **Time:** ~1-2 seconds

4. **Completion Polling**
   - Polls every 2 seconds for account status
   - Checks multiple conditions (chargesEnabled, payoutsEnabled, detailsSubmitted)
   - **Time:** Up to 30+ seconds waiting for Stripe webhooks

### Performance Bottlenecks

1. **Sequential API Calls**

   ```typescript
   // Current: Sequential calls
   await checkExistingAccount(); // ~500ms
   await createConnectAccount(); // ~2-5s
   await fetchClientSecret(); // ~1-2s
   // Total: ~3.5-7.5s before user sees form
   ```

2. **Aggressive Polling**

   ```typescript
   // Current: Polls every 2 seconds
   setInterval(checkCompletionStatus, 2000);
   // After user exits: Polls every 1 second
   setInterval(checkCompletionStatus, 1000);
   // Issues: High API usage, unnecessary load
   ```

3. **No Caching**
   - Account status checked on every poll
   - No local storage of intermediate state
   - Repeated database queries

4. **No Pre-filling**
   - User information not pre-populated in Stripe form
   - Requires manual entry of name, email, etc.

## Technical Requirements

### Phase 1: Optimize API Calls

#### 1.1 Parallel Initialization

```typescript
// Optimized: Parallel calls where possible
const [existingAccount, clientSecret] = await Promise.all([
  checkExistingAccount(), // Can run in parallel
  preFetchClientSecret(), // Pre-fetch if account exists
]);
```

#### 1.2 Optimize Edge Function

- Cache Stripe account lookups
- Use Stripe API efficiently (batch requests)
- Return structured data faster
- Add response compression

#### 1.3 Smart Polling

```typescript
// Optimized: Adaptive polling
let pollInterval = 5000; // Start with 5 seconds
const maxInterval = 30000; // Max 30 seconds

const adaptivePoll = () => {
  checkCompletionStatus().then((completed) => {
    if (completed) {
      clearInterval();
    } else {
      // Increase interval if no progress
      pollInterval = Math.min(pollInterval * 1.5, maxInterval);
    }
  });
};
```

### Phase 2: Real-time Updates

#### 2.1 WebSocket Integration

- Use Supabase Realtime to listen for account status changes
- Edge Function publishes updates when Stripe webhook received
- Eliminates need for polling

#### 2.2 Server-Sent Events (SSE)

- Alternative to WebSockets
- Simpler implementation
- One-way communication (server → client)

### Phase 3: UX Improvements

#### 3.1 Progress Indicators

```typescript
interface OnboardingProgress {
  step: "account-creation" | "form-filling" | "verification" | "complete";
  progress: number; // 0-100
  estimatedTimeRemaining: number; // seconds
  currentAction: string;
}
```

#### 3.2 Pre-fill User Data

```typescript
// Pre-populate Stripe form with user data
const accountConfig = {
  contact_email: userProfile.email,
  display_name: `${userProfile.first_name} ${userProfile.last_name}`,
  identity: {
    business_details: {
      registered_name: `${userProfile.first_name} ${userProfile.last_name}`,
    },
    // Pre-fill from user profile
  },
};
```

#### 3.3 Save Progress

- Store partial completion state
- Allow users to return later
- Resume from last completed step

### Phase 4: Error Handling & Retry

#### 4.1 Exponential Backoff

```typescript
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // 1s, 2s, 4s
    }
  }
};
```

#### 4.2 Better Error Messages

- Specific error codes from Stripe
- Actionable next steps
- Support contact information
- Retry buttons with context

## Implementation Plan

### Sprint 1: Quick Wins (1-2 days)

1. ✅ Optimize Edge Function response times
2. ✅ Add progress indicators
3. ✅ Pre-fill user information
4. ✅ Reduce initial polling interval

### Sprint 2: Smart Polling (2-3 days)

1. ✅ Implement adaptive polling
2. ✅ Add caching for account status
3. ✅ Optimize completion detection
4. ✅ Add retry logic

### Sprint 3: Real-time Updates (3-5 days)

1. ✅ Set up Supabase Realtime subscription
2. ✅ Edge Function webhook handler publishes updates
3. ✅ Replace polling with real-time events
4. ✅ Fallback to polling if real-time fails

### Sprint 4: UX Polish (2-3 days)

1. ✅ Save progress functionality
2. ✅ Better error handling
3. ✅ Estimated time remaining
4. ✅ Loading state improvements

## Database Changes

### Add Progress Tracking Table

```sql
CREATE TABLE stripe_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_account_id VARCHAR(255),
  current_step VARCHAR(50),
  progress_data JSONB,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_stripe_onboarding_user ON stripe_onboarding_progress(user_id);
```

## Edge Function Optimizations

### Current Edge Function Issues

- Multiple Stripe API calls in sequence
- No caching of account data
- Slow response times

### Optimized Edge Function

```typescript
// Batch Stripe API calls
const [account, requirements] = await Promise.all([
  stripe.accounts.retrieve(accountId),
  stripe.accounts.retrieveRequirements(accountId),
]);

// Cache account status
await supabase
  .from("connect_accounts")
  .update({
    account_status: account.details_submitted ? "active" : "pending",
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    updated_at: new Date().toISOString(),
  })
  .eq("stripe_account_id", accountId);

// Publish real-time update
await supabase.channel(`connect-account-${userId}`).send({
  type: "broadcast",
  event: "account-status-updated",
  payload: { accountId, status: account.details_submitted },
});
```

## Metrics & Success Criteria

### Performance Metrics

- **Account Creation Time:** < 2 seconds (currently 2-5s)
- **Component Load Time:** < 1 second (currently 1-2s)
- **Completion Detection:** < 5 seconds (currently 10-30s)
- **Total Onboarding Time:** < 3 minutes (currently 5-10 minutes)

### User Experience Metrics

- **Completion Rate:** > 90% (currently ~75%)
- **Drop-off Rate:** < 10% (currently ~25%)
- **User Satisfaction:** > 4.5/5 (survey)
- **Support Tickets:** < 5% of onboarding attempts

### Technical Metrics

- **API Calls per Onboarding:** < 10 (currently 20-30)
- **Polling Requests:** < 5 (currently 15-30)
- **Error Rate:** < 2% (currently ~5%)

## Definition of Done

- [ ] All performance metrics met
- [ ] Progress indicators implemented
- [ ] User data pre-filled in Stripe form
- [ ] Smart polling or real-time updates implemented
- [ ] Error handling improved with retry logic
- [ ] Save progress functionality working
- [ ] Unit tests for optimization logic
- [ ] Integration tests for onboarding flow
- [ ] Performance testing completed
- [ ] User acceptance testing passed
- [ ] Documentation updated
- [ ] Monitoring and alerts set up

## Priority

**High** - Directly impacts user onboarding completion rate and first impression

## Story Points

**13** - Requires multiple optimizations across frontend, backend, and Edge Functions

## Dependencies

- Supabase Realtime setup (if using WebSocket approach)
- Edge Function optimization
- Database schema updates for progress tracking

## Related Stories

- Address validation in onboarding (pre-fill address data)
- Onboarding progress persistence
- Error handling improvements

## Notes

- Current implementation uses embedded Stripe Connect component
- Polling is necessary due to Stripe webhook delays
- Real-time updates would eliminate need for polling
- Consider Stripe's rate limits when optimizing

## References

- Current PaymentSetupStep: `src/components/onboarding/PaymentSetupStep.tsx`
- Current EmbeddedStripeOnboarding: `src/components/onboarding/EmbeddedStripeOnboarding.tsx`
- Edge Function: `supabase/functions/stripe-payment/index.ts`
- Stripe Connect Docs: https://stripe.com/docs/connect

## Scope & Constraints

- This story focuses **only on the Stripe Connect payment setup step** within onboarding (not on billing/subscriptions or other flows).
- We optimize the **existing embedded Connect flow**; we are not switching model (e.g. to redirect-only) in this story.
- Changes must remain compatible with current Stripe account / webhook setup (no breaking changes to live data).
- We aim to reduce perceived and actual time-to-ready, but **cannot eliminate external Stripe/Webhook delays entirely**.
- Any new realtime behaviour should degrade gracefully back to polling if unavailable.

## MVP Slice

- Parallelize safe calls during initialization (e.g. existing-account check + client-secret fetch where appropriate) to reduce pre-form wait.
- Pre-fill the embedded Stripe Connect onboarding with available profile data (name, email, clinic details) to reduce user typing.
- Introduce a clear, simple progress UI inside the onboarding Stripe step:
  - Distinct steps (“Checking account…”, “Loading Stripe…”, “Waiting for confirmation…”).
  - Obvious loading/disabled states while backend work is in progress.
- Replace the current aggressive polling with a **smarter, bounded strategy**:
  - Slightly longer initial interval and/or backoff.
  - Hard limit on total polling duration and number of requests.
- Capture a small set of metrics (e.g. time from click to first view, time to completion, number of polls) for future refinement.

## Open Questions / Decisions

- **Realtime vs polling:** For this story, do we explicitly stop at “smarter polling”, or should we include a minimal Realtime/SSE integration?
- **Timeout UX:** After a max wait (e.g. 60–90 seconds), what is the expected UX — retry CTA, background status check, or allow “continue and verify later”?
- **Progress persistence:** Do we need to persist Stripe onboarding progress server-side now, or is UI-only progress acceptable for this story?
- **Support thresholds:** What concrete targets do we consider “good enough” (e.g. 90% of users seeing the Stripe form within X seconds)?

---

**Created:** 2025-01-27  
**Last Updated:** 2025-01-27  
**Status:** Ready for Backlog
