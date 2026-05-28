# Practitioner Flows Edge Cases

**Date:** March 2025  
**Status:** 🔍 Discovery & Tracking  
**Scope:** Calendar settings, Services/products, Messaging, CPD

---

## Overview

Edge cases for practitioner flows that previously had no dedicated documentation: Calendar Settings, Services Management, Offer Services, Real-Time Messaging, and CPD.

---

## Calendar Settings (`/practice/calendar`)

### 1. **Google OAuth popup closed before completion**

**Current:** `handleConnectGoogleCalendar` opens popup; listens for `google-calendar-connected` message. If user closes popup without completing OAuth, `checkClosed` interval clears `isConnecting` and removes listener.

**Edge case:** Popup closed mid-OAuth (e.g. user clicks X after entering Google credentials). No toast; user may retry. Listener cleanup prevents stray events.

**Status:** ⚠️ Verified – no "Connection cancelled" feedback when popup closed early.

---

### 2. **Origin check for postMessage**

**Current:** `handleMessage` checks `event.origin !== window.location.origin` before processing.

**Status:** ✅ Verified – prevents cross-origin message injection.

---

### 3. **Tokens stored in calendar_sync_configs**

**Current:** `saveCalendarSettings` upserts `access_token`, `refresh_token` into `calendar_sync_configs`. Tokens are sensitive.

**Edge case:** If DB is compromised, tokens allow calendar access. Supabase typically encrypts at rest; token refresh is Google's responsibility.

**Recommendation:** Confirm Supabase column-level encryption or consider not storing raw tokens if edge function can exchange on demand.

---

### 4. **Working hours: start after end**

**Current:** No validation that `start < end` for each day. User could set Monday 17:00–09:00.

**Impact:** Slot generation and booking logic may produce no slots or unexpected availability.

**Recommendation:** Validate `start < end` on save; show error if invalid.

---

### 5. **Non-Google providers: Sync without connection**

**Current:** For `provider !== 'google'`, `CalendarSyncStatus` is shown with `handleSync`, but `CalendarIntegrationService` and sync implementation may only support Google.

**Edge case:** User selects Outlook/Apple/iCal, enables sync, clicks Sync – may fail with unclear error. "Import Calendar" button is disabled.

**Status:** ⚠️ Outlook/Apple/iCal integration not implemented; UI suggests they exist.

---

### 6. **Export: guest sessions client_name**

**Current:** `exportCalendar` maps `session.client_name` directly: `title: \`${session.session_type || 'Session'} with ${session.client_name}\``. Guest sessions may have empty or null `client_name`.

**Impact:** ICS shows "Session with " or "Session with undefined" for guests.

**Recommendation:** Add fallback: `session.client_name || (session.is_guest_booking ? 'Guest' : 'Client')`.

---

### 7. **google-calendar-sync Edge Function missing**

**Current:** `GoogleCalendarService` calls `google-calendar-sync` edge function. No `supabase/functions/google-calendar-sync` in repo.

**Edge case:** 404 or "Function not found" when connecting/syncing. User sees generic "Failed to connect" toast.

**Status:** ⚠️ Verify function exists and is deployed; if not, Calendar sync is non-functional.

---

## Services / Products (`/practice/scheduler`, `/offer-services`)

### 8. **ServicesManagement: Profile completion gate**

**Current:** Requires 5 of 6 non-service checks (availability, qualifications, docs, etc.). `calculateProfileActivationStatus` used; products excluded for gate.

**Edge case:** Practitioner completes all but one check; sees "Profile Completion Required" with ProfileCompletionWidget. If check is transient (e.g. qualifications count from race), could briefly block access.

**Status:** ✅ Reasonable – avoids practitioners listing services without profile/qualifications.

---

### 9. **ProductManager: No Stripe Connect**

**Current:** If `!userProfile?.stripe_connect_account_id`, `hasConnectAccount` is false. ProductManager shows "Stripe Connect Setup Required" alert with "Set Up Payments" → `/profile#subscription` and "Learn More" → Stripe Connect docs.

**Status:** ✅ Mitigated – CTA present when no Connect.

---

### 10. **Product realtime: stale hasConnectAccount in callback**

**Current:** `loadProducts` in subscription callback uses `hasConnectAccount` from closure. `hasConnectAccount` is set in `checkConnectAccount` before subscription runs.

**Edge case:** User connects Stripe in another tab; subscription fires; `hasConnectAccount` might still be false in closure (React state async). Callback could skip `loadProducts`.

**Status:** ⚠️ Subscription deps include `userProfile?.stripe_connect_account_id`; component re-mounts when Connect changes. Closure may be stale within same render cycle.

---

### 11. **Duration validation (ProductForm)**

**Current:** `productSchema` and `ALLOWED_DURATION_MINUTES` enforce 30, 45, 60, 75, 90. `slot-generation-utils` falls back to 60 for invalid durations.

**Status:** ✅ Fixed – validators.ts, ProductForm use schema; schema aligns with DB CHECK.

---

### 12. **OfferServices: Non-functional UI**

**Current:** "Update Status" and "Update Schedule" call `toast.info('... coming soon!')`. Service list is from `users.specializations` or role-based defaults; not `practitioner_products`. Inputs for duration/credits are uncontrolled (no `value`/`onChange` state).

**Edge case:** Practitioner edits duration/credits; clicks save (none exists); no persistence. Services are display-only; Schedule controls do nothing.

**Status:** ⚠️ Documented in EDGE_CASES_OPEN – "OfferServices: update status, schedule functionality" TODO.

---

## Messaging (`/messages`, `/client/messages`)

### 13. **Conversation list: conversationId from URL**

**Current:** `searchParams.get('conversation')` compared to `conv.id`. If URL has invalid ID, no match; selected stays null or unchanged.

**Status:** ✅ Safe – no crash; conversation just not selected.

---

### 14. **loadMessages + mark as read race**

**Current:** `loadMessages` fetches messages then calls `markMessagesAsRead`. If two tabs open same conversation, both may mark read; last write wins.

**Status:** ⚠️ Acceptable – read status is eventually consistent; no critical race.

---

### 15. **retryOperation only for loadConversations**

**Current:** `retryOperation` wraps `loadConversations` (3 retries, backoff). `loadMessages`, `sendMessage` have no retry.

**Edge case:** Transient network failure on send – user sees error; message not delivered. Must retry manually.

**Recommendation:** Add retry for `sendMessage` with optimistic UI (show sent, rollback on final failure).

---

### 16. **Session context: guest sessions**

**Current:** `fetchSessionContext` uses `client_id` in OR filter. Guest sessions have `client_id` from `upsert_guest_user`; should match.

**Edge case:** Conversation between practitioner and guest-who-registered; `client_id` may differ pre/post conversion. Session lookup could miss or return wrong session.

**Status:** ⚠️ Depends on conversation `participant2_id` – if guest converted, should align. Document if guest conversations need special handling.

---

### 17. **Message subscription: full reload on INSERT/UPDATE**

**Current:** On any `INSERT` or `UPDATE` in messages, `loadMessages` is called – full refetch. High traffic could cause many requests.

**Status:** ⚠️ Low risk for typical usage; consider appending single message for INSERT when payload contains new row.

---

## CPD (`/cpd`)

### 18. **External links – no validation**

**Current:** Hardcoded URLs to external CPD providers (e.g. sportstherapyassociation.com). `window.open(provider.url, '_blank')`.

**Edge case:** If URL is wrong or domain expired, user gets 404. No runtime validation.

**Status:** ⚠️ Low priority – static content; links should be reviewed periodically.

---

## Summary Table

| # | Flow | Edge Case | Severity | Status |
|---|------|-----------|----------|--------|
| 1 | Calendar | OAuth popup closed – no feedback | 🟡 Medium | ⚠️ Open |
| 2 | Calendar | postMessage origin check | 🟢 Low | ✅ Mitigated |
| 3 | Calendar | Tokens in DB | 🟡 Medium | ⚠️ Verify |
| 4 | Calendar | Working hours start > end | 🟠 High | ⚠️ Open |
| 5 | Calendar | Non-Google providers unimplemented | 🟡 Medium | ⚠️ Open |
| 6 | Calendar | Export guest client_name | 🟡 Medium | ⚠️ Open |
| 7 | Calendar | google-calendar-sync function | 🔴 Critical | ⚠️ Verify |
| 8 | Services | Profile gate | 🟢 Low | ✅ Verified |
| 9 | Services | No Connect CTA | 🟢 Low | ✅ Mitigated |
| 10 | Services | Product realtime closure | 🟡 Medium | ⚠️ Open |
| 11 | Services | Duration validation | 🟢 Low | ✅ Fixed |
| 12 | OfferServices | Non-functional UI | 🟠 High | ⚠️ Documented |
| 13 | Messaging | Invalid conversation ID in URL | 🟢 Low | ✅ Safe |
| 14 | Messaging | Read-status race | 🟢 Low | ⚠️ Acceptable |
| 15 | Messaging | No send retry | 🟡 Medium | ⚠️ Open |
| 16 | Messaging | Guest session context | 🟡 Medium | ⚠️ Open |
| 17 | Messaging | Full reload on message event | 🟢 Low | ⚠️ Minor |
| 18 | CPD | External link validity | 🟢 Low | ⚠️ Open |

---

## Related Docs

- [PRACTITIONER_DASHBOARD_EDGE_CASES.md](./PRACTITIONER_DASHBOARD_EDGE_CASES.md)
- [PRACTITIONER_PROFILE_EDGE_CASES.md](./PRACTITIONER_PROFILE_EDGE_CASES.md)
- [EDGE_CASES_OPEN.md](./EDGE_CASES_OPEN.md)
- [SUPABASE_SCHEMA_EDGE_CASES.md](./SUPABASE_SCHEMA_EDGE_CASES.md)
