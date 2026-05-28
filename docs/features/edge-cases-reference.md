# Edge Cases Reference – What Happens Where

**Audience:** Junior developers

> **Repo paths:** Several “Where” links below still use a legacy **`peer-care-connect/...`** prefix. In this monorepo the web app lives under **`src/`** (e.g. `src/components/booking/BookingFlow.tsx`). If a link 404s, search `src/` or follow the adjacent product doc link.

This document consolidates edge cases across booking, treatment exchange, notifications, messaging, and other flows. It answers: "In scenario X, what happens, and where is it handled?"

---

## 1. Booking Mode Edge Cases

**Source:** [BOOKING_MODE_EDGE_CASES_AND_ACCEPTANCE_CRITERIA](../product/BOOKING_MODE_EDGE_CASES_AND_ACCEPTANCE_CRITERIA.md), [BOOKING_MODE_EDGE_CASE_QA_MATRIX](../testing/BOOKING_MODE_EDGE_CASE_QA_MATRIX.md)

### 1.1 Surface × Practitioner Type

| Surface                     | Clinic-only          | Mobile-only                            | Hybrid                                               |
| --------------------------- | -------------------- | -------------------------------------- | ---------------------------------------------------- |
| Public profile              | "Book" → Clinic flow | "Request mobile session" → Mobile flow | Chooser: "Book at clinic" / "Request mobile session" |
| Marketplace                 | Same                 | Same                                   | Same                                                 |
| Direct `/book/:slug`        | Same                 | Same                                   | Same                                                 |
| Profile viewer              | Same                 | Same                                   | Same                                                 |
| Client rebook (My Sessions) | Same                 | Same                                   | Same                                                 |

**Edge case:** Wrong-flow recovery – if clinic flow opens for mobile-only practitioner (stale data), user is auto-redirected to mobile flow with message.

**Where:** [src/components/booking/BookingFlow.tsx](../../src/components/booking/BookingFlow.tsx), [docs/features/clinic-mobile-hybrid-flows.md](../features/clinic-mobile-hybrid-flows.md)

---

### 1.2 Guest vs Client

| Scenario                                      | Guest                                             | Client                                     |
| --------------------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Post-booking success CTA                      | Guest-safe route `/booking/view/:id?token=...`    | `/client/sessions`                         |
| Mobile request accepted                       | "View session" → guest view                       | "View session" → `/client/sessions`        |
| Same-day clinic approval                      | Held payment until practitioner accepts           | Same                                       |
| Pre-assessment                                | Required every time (email-based skip for repeat) | Required first session; skip for returning |
| Rebooking practitioner who became mobile-only | Redirect to mobile flow                           | Redirect to mobile flow                    |

**Where:** [src/components/booking/BookingFlow.tsx](../../src/components/booking/BookingFlow.tsx) (guest vs signed-in), [src/pages/client/ClientBooking.tsx](../../src/pages/client/ClientBooking.tsx) (`?guest=1`), [docs/product/GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md](../product/GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md)

---

### 1.3 No Clinic Products (Hybrid)

**Scenario:** Hybrid practitioner has only mobile products. User taps "Book at clinic."

**What happens:** Explicit message: "No clinic services available." CTA: "Request Visit to My Location" if mobile eligible; otherwise fallback guidance.

**Where:** [src/components/booking/BookingFlow.tsx](../../src/components/booking/BookingFlow.tsx) (or HybridBookingChooser)

---

### 1.4 Mobile Request Preconditions

**Scenario:** Client enters address outside practitioner's radius.

**What happens:** Validation blocks submit. Message: address outside service area.

**Where:** [theramate-ios-client/lib/api/mobileRequests.ts](../../theramate-ios-client/lib/api/mobileRequests.ts) (native); search `src/` for any web mobile-request UI, backend `create_mobile_booking_request`

---

### 1.5 Pending Payment Slot Race

**Scenario:** Two users pick same slot; one pays first.

**What happens:** `pending_payment` hold ~5 min. Second user's checkout fails; return to step 1. `expire_pending_payment_bookings` cleans expired holds.

**Where:** `theramate-ios-client` practitioner tabs + `src/pages/practice/` (search `expire_pending_payment` / same-day) (calls `expire_pending_payment_bookings`), Stripe webhook

---

## 2. Treatment Exchange Edge Cases

### 2.1 Recipient Delays (Slot Hold Expiry)

**Scenario:** Requester holds slot 10 min. Recipient takes 15 min to accept.

**What happens:** Slot hold may expire. Accept can fail with "slot no longer available." Recipient should select another time or requester resends.

**Where:** [theramate-ios-client/lib/api/practitionerExchange.ts](../../theramate-ios-client/lib/api/practitionerExchange.ts) – `SlotHoldingService.holdSlot`, `theramate-ios-client/app/(practitioner)/exchange/` (search `exchange` + `practitionerExchange`)

---

### 2.2 Request Expired Before Accept

**Scenario:** Recipient clicks Accept after request `expires_at`.

**What happens:** Backend rejects. UI should re-check status and show "Request expired."

**Where:** `theramate-ios-client/app/(practitioner)/exchange/` (search `exchange` + `practitionerExchange`) – `checkRequestStatus`

---

### 2.3 Insufficient Credits on Accept

**Scenario:** Recipient accepts; when booking reciprocal, requester's credits are insufficient.

**What happens:** Reciprocal booking fails. Accept may have already created `mutual_exchange_sessions`. Recipient gets reminder to book later; requester can top up credits.

**Where:** [theramate-ios-client/lib/api/practitionerExchange.ts](../../theramate-ios-client/lib/api/practitionerExchange.ts), `theramate-ios-client/app/(practitioner)/exchange/` (search `exchange` + `practitionerExchange`)

---

### 2.4 Recipient Has No Products

**Scenario:** Recipient accepts but has no active products to offer.

**What happens:** Accept-only mode: "You can book your return session later when they've added a service." No reciprocal booking step.

**Where:** `theramate-ios-client/app/(practitioner)/exchange/` (search `exchange` + `practitionerExchange`) – `services.length === 0`

---

### 2.5 Same Request in Today's Schedule vs New Bookings

**Scenario:** Pending exchange for tomorrow.

**What happens:** Appears in New Bookings and Exchange Requests page. Does **not** appear in Today's Schedule (filter: session_date = today).

**Where:** `theramate-ios-client` practitioner tabs + `src/pages/practice/` (search `expire_pending_payment` / same-day), [docs/product/DASHBOARD_AND_TREATMENT_EXCHANGE_FLOW.md](../product/DASHBOARD_AND_TREATMENT_EXCHANGE_FLOW.md)

---

## 3. Mobile Request Edge Cases

### 3.1 Mobile Request TTL Expiry

**Scenario:** Practitioner doesn't respond within ~60 min.

**What happens:** Request status → expired. Payment hold released. Client notified (mobile_request_expired_client email). Request disappears from practitioner list.

**Where:** Backend lifecycle / cron, [supabase/functions/mobile-payment/index.ts](../../supabase/functions/mobile-payment/index.ts)

---

### 3.2 Duplicate Pending Request

**Scenario:** Client submits two requests for same practitioner/date/time.

**What happens:** Backend prevents duplicate (migration logic). Second submit fails or merges.

**Where:** [supabase/migrations](../../supabase/migrations/) – dedupe logic

---

### 3.3 Accept When Slot Now Booked

**Scenario:** Practitioner accepts; between request and accept, slot was booked by someone else.

**What happens:** `create_session_from_mobile_request` may fail (conflict). UI shows "Slot no longer available"; recipient can try another time.

**Where:** `theramate-ios-client/app/(practitioner)/mobile-requests/` + [theramate-ios-client/lib/api/mobileRequests.ts](../../theramate-ios-client/lib/api/mobileRequests.ts)

---

## 4. Notification Edge Cases

### 4.1 Read vs Read_At Mismatch

**Scenario:** Legacy `read` false but `read_at` set.

**What happens:** Frontend treats `read_at` as canonical. "Mark all read" updates both.

**Where:** [theramate-ios-client/lib/api/notifications.ts](../../theramate-ios-client/lib/api/notifications.ts); search `src/` for web notification UI, [docs/product/NOTIFICATIONS_AUDIT_AND_FIXES.md](../product/NOTIFICATIONS_AUDIT_AND_FIXES.md)

---

### 4.2 Dismiss (Soft Delete)

**Scenario:** User clicks X on notification.

**What happens:** `dismissed_at` set. Row not deleted. All fetches exclude `dismissed_at IS NOT NULL`.

**Where:** [theramate-ios-client/lib/api/notifications.ts](../../theramate-ios-client/lib/api/notifications.ts); search `src/` for web notification UI – `dismissNotification`

---

### 4.3 Exchange Notification Type Overload

**Scenario:** Exchange notifications stored with `type = booking_confirmed` + `source_type = treatment_exchange_request`.

**What happens:** Frontend must use `source_type` and payload for routing, not `type` alone.

**Where:** [theramate-ios-client/lib/api/notifications.ts](../../theramate-ios-client/lib/api/notifications.ts); search `src/` for web notification UI – `formatNotificationPreview`, `handleNotificationNavigation`

---

## 5. Messaging Edge Cases

### 5.1 Practitioner Messages Guest

**Scenario:** Practitioner sends message; recipient is guest (user_role = 'guest').

**What happens:** Message stored. `notify-guest-message` Edge Function sends email. Link = `/login`. Guest has no inbox until signup.

**Where:** [src/components/messaging/RealTimeMessaging.tsx](../../src/components/messaging/RealTimeMessaging.tsx) – `sendMessageToGuest`, [supabase/functions/notify-guest-message/index.ts](../../supabase/functions/notify-guest-message/index.ts)

---

### 5.2 Guest Signs Up – Conversation Linking

**Scenario:** Guest had conversation; signs up with same email.

**What happens:** `AuthCallback` calls `linkGuestConversationsToUser`. RPC reassigns conversations to new user id. New client sees prior messages in inbox.

**Where:** Search `src/` for OAuth / guest conversation linking; [src/components/messaging/RealTimeMessaging.tsx](../../src/components/messaging/RealTimeMessaging.tsx)

---

## 6. Diary / Calendar Edge Cases

### 6.1 Guest vs Client Label

**Scenario:** Session has `is_guest_booking = true` but calendar infers "Client" from `client_id`.

**What happens:** Should use `session.is_guest_booking === true` for "Guest" label. Fix: prefer `is_guest_booking` over inferring from `client_id`.

**Where:** [theramate-ios-client/app/(practitioner)/(ptabs)/schedule/index.tsx](<../../theramate-ios-client/app/(practitioner)/(ptabs)/schedule/index.tsx>); [src/pages/practice/UpcomingSessions.tsx](../../src/pages/practice/UpcomingSessions.tsx), [docs/product/GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md](../product/GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md)

---

### 6.2 Pending_Payment / Expired in Diary

**Scenario:** Unconfirmed booking or expired slot.

**What happens:** Excluded from calendar. Only `scheduled`, `confirmed`, `in_progress`, `completed` shown.

**Where:** [theramate-ios-client/app/(practitioner)/(ptabs)/schedule/index.tsx](<../../theramate-ios-client/app/(practitioner)/(ptabs)/schedule/index.tsx>); [src/pages/practice/UpcomingSessions.tsx](../../src/pages/practice/UpcomingSessions.tsx)

---

## 7. Same-Day Approval vs Mobile Request

**Critical distinction:**

|               | Same-day approval                                      | Mobile request                                                             |
| ------------- | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| **Flow**      | Clinic only                                            | Mobile (and hybrid mobile)                                                 |
| **When**      | Client books clinic for today                          | Client requests mobile visit                                               |
| **Component** | Same-day approval UI (search `src/` / native practice) | Mobile request queue (`theramate-ios-client/.../mobile-requests/`, native) |
| **RPC**       | get_pending_same_day_bookings, accept/decline same-day | create_mobile_booking_request, create_session_from_mobile_request          |
| **Never**     | Used for mobile                                        | Used for clinic                                                            |

**Where:** [docs/features/clinic-mobile-hybrid-flows.md](./clinic-mobile-hybrid-flows.md)

---

## 8. Related Docs

- [Clinic, Mobile & Hybrid Flows](./clinic-mobile-hybrid-flows.md)
- [BOOKING_MODE_EDGE_CASES_AND_ACCEPTANCE_CRITERIA](../product/BOOKING_MODE_EDGE_CASES_AND_ACCEPTANCE_CRITERIA.md)
- [BOOKING_MODE_EDGE_CASE_QA_MATRIX](../testing/BOOKING_MODE_EDGE_CASE_QA_MATRIX.md)
- [GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE](../product/GUEST_VS_CLIENT_SYSTEM_LOGIC_TABLE.md)
- [DASHBOARD_AND_TREATMENT_EXCHANGE_FLOW](../product/DASHBOARD_AND_TREATMENT_EXCHANGE_FLOW.md)

---

**Last Updated:** 2026-03-15
