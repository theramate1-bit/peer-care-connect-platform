# UX Affordances & User Journey Gaps

**Date:** 2026-03-14  
**Scope:** Post-booking, cancelling, emails, messages, and **Affordances & Signifiers** (UI self-explanatory clarity).  
**Builds on:** POST_BOOKING_REMEDIATION_TABLE, EMAIL_AUDIT_AND_TRIGGERS, TREATMENT_EXCHANGE_UX_GAPS, EMAIL_20_TEMPLATES_AUDIT

---

## Fixes Applied (2026-03-14)

| Fix                                                             | File(s)                                                                                                                                                        |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard "confirmed when it wasn't"** for treatment exchange | `notification-utils.ts`: Map `notification_type`→`type`; broaden `isPendingExchangeRequest` (source_type, title) so pending requests never show " · Confirmed" |
| **Selected card highlight** when modal open                     | `ExchangeRequests.tsx`: Card ring when `selectedRequest?.id === request.id`                                                                                    |
| **Tooltips for disabled buttons**                               | `TherapistDashboard`, `ExchangeRequests`: Native `title` on disabled Accept/Decline ("Request already accepted", "Processing…", etc.)                          |
| **BookingSuccess location**                                     | `BookingSuccess.tsx`: Location in Session Details via `getSessionLocation`                                                                                     |
| **Client Cancel for confirmed**                                 | `SessionDetailView.tsx`: Cancel shown for both `scheduled` and `confirmed`                                                                                     |

---

## Executive Summary

Gaps identified and partially addressed. Remaining:

1. **MySessions** uses therapist default location instead of booking-record `appointment_type` / `visit_address`.
2. **Guest reschedule** is not self-serve; copy says "contact practitioner."
3. **Tooltips** – Native `title` added for Exchange buttons; icon-only actions could use a Tooltip component.

---

## 1. Affordances & Signifiers Checklist

### ☐ Can users understand what is clickable without instructions?

| Area                       | Finding                                                                                                           | Evidence                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **Buttons**                | Generally good—Button component has hover states (`hover:bg-primary/85`, etc.) and clear affordances              | `button.tsx` variants            |
| **Links**                  | Some `variant="link"` buttons may be mistaken for text; `hover:underline` helps                                   | BookingSuccess "View full terms" |
| **Exchange Request cards** | Accept/Decline/Cancel are clear; cards themselves are **not** clickable to select—only action buttons open modals | ExchangeRequests.tsx             |
| **Notifications**          | List items navigate on click; icon-only "mark read" / "dismiss" may not be obvious                                | RealTimeNotifications.tsx        |
| **Dropdown triggers**      | "Add to Calendar" with ChevronDown is recognizable; DropdownMenuTrigger may lack `aria-haspopup` in some cases    | BookingSuccess                   |

**Gap:** Icon-only actions (e.g. notification bell, mark-read) lack visible affordance. No `title` or tooltip to clarify.

---

### ☐ Are selected items visually different from unselected ones?

| Area                                | Finding                                                                                                                          | Evidence                     |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **Exchange Requests tabs**          | Yes—active tab uses `variant="default"` vs `ghost`                                                                               | ExchangeRequests.tsx:181–197 |
| **Exchange Request cards**          | Only when `focusedRequestId` matches—`ring-2 ring-primary/40`; no card-level "selected" for `selectedRequest` when modal is open | ExchangeRequests.tsx:211     |
| **Notification list**               | Unread vs read—background/indicator; no explicit "selected conversation" pattern                                                 | RealTimeNotifications        |
| **Session cards in MySessions**     | Collapsible expand state; no persistent "selected session" visual when SessionDetailView is shown elsewhere                      | MySessions.tsx               |
| **TherapistDashboard New Bookings** | `selectedExchangeRequest` drives modal; selected row highlight unclear                                                           | TherapistDashboard.tsx       |

**Fixed (2026-03-14):** Exchange Requests cards now highlight when `selectedRequest` matches (modal open). Use `ring-2 ring-primary/40` for both `focusedRequestId` and `selectedRequest?.id`.

---

### ☐ Are disabled elements clearly inactive?

| Area                        | Finding                                                                                                                 | Evidence                             |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Buttons**                 | Yes—`disabled:pointer-events-none disabled:opacity-50`                                                                  | button.tsx:8                         |
| **SessionDetailView**       | Cancel, Suggest, etc. use `disabled={actionLoading}` / `disabled={processingCancellation}`; visual treatment via Button | SessionDetailView.tsx                |
| **ExchangeRequests**        | Accept/Decline `disabled={responding}`; no tooltip explaining why                                                       | ExchangeRequests.tsx:408, 416        |
| **MobileRequestManagement** | `disabled={processing}`; no "why disabled" cue                                                                          | MobileRequestManagement.tsx:550, 603 |
| **TherapistDashboard**      | Decline/Accept `disabled={isDisabled}`; `isDisabled` logic may be opaque to user                                        | TherapistDashboard.tsx:2492–2493     |

**Fixed (2026-03-14):** Added native `title` tooltips on Exchange-related Accept/Decline buttons when disabled (TherapistDashboard, ExchangeRequests): "Request already accepted", "Request already declined", "Processing…", "Sending response…".

---

### ☐ Do buttons, links, and inputs look interactive?

| Area                                  | Finding                                                                                  | Evidence                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------- |
| **Primary CTAs**                      | Yes—`shadow-[var(--shadow-soft)]`, hover states                                          | button.tsx                             |
| **Outline/ghost buttons**             | Lower prominence; may blend with background on some themes                               | `variant="outline"`, `variant="ghost"` |
| **"Leave a review" inline link**      | Styled as `font-medium text-primary hover:underline`—could be more button-like on mobile | BookingSuccess.tsx:741–747             |
| **GuestBookingView "Get directions"** | Button asChild with anchor—clear                                                         | GuestBookingView.tsx                   |
| **Textarea (decline reason)**         | Standard input styling; placeholder "e.g. I'm unavailable…" helps                        | ExchangeRequests                       |

**Gap:** Some secondary actions (e.g. "View full terms") use `variant="link"` and may not read as primary management actions.

---

### ☐ Are hover, press, or tooltip cues used where helpful?

| Area                     | Finding                                                      | Evidence                              |
| ------------------------ | ------------------------------------------------------------ | ------------------------------------- |
| **Buttons**              | Hover and focus-visible rings                                | button.tsx                            |
| **Tooltips**             | **None**—no `Tooltip` / `TooltipProvider` usage in app code  | Grep: no tooltip.tsx in components/ui |
| **Dropdown menus**       | Hover on items; no tooltips on parent trigger                | Various DropdownMenu usages           |
| **Status badges**        | Color only; no tooltip explaining "Expired", "Pending", etc. | ExchangeRequests, TherapistDashboard  |
| **Notification actions** | Mark read, dismiss—icon-only, no title/tooltip               | RealTimeNotifications                 |

**Partial (2026-03-14):** Native `title` tooltips added for disabled Exchange Accept/Decline. A reusable Tooltip component (Radix) could extend coverage to icon-only actions.

---

## 2. Post-Booking Journey Gaps

| Step                                   | Expected                                                       | Current                                                                                              | Gap                                                         | Priority   |
| -------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------- |
| **Confirmation page**                  | Session details include **location** (clinic or visit address) | `BookingSuccess` now shows location in Session Details via `getSessionLocation`                      | **Fixed**                                                   | —          |
| **Guest CTAs**                         | Guest sees "View booking details" → guest-safe URL             | `viewBookingsPath` correctly routes guest to `/booking/view/${session.id}` when `isGuest && !user`   | Aligned                                                     | None       |
| **Client MySessions location**         | Correct clinic vs mobile location                              | `MySessions` selects `therapist.location` only; no `appointment_type`, `visit_address`               | Wrong location for mobile sessions                          | **High**   |
| **Guest post-booking management**      | Self-serve cancel/reschedule                                   | Guest **can** cancel via `GuestBookingView`; reschedule says "Contact your practitioner"             | Reschedule not self-serve                                   | **Medium** |
| **Client Cancel in SessionDetailView** | Client can cancel future confirmed sessions                    | Cancel now shown for both `scheduled` and `confirmed` (matches practitioner behavior)                | **Fixed**                                                   | —          |
| **Post-booking management surface**    | Clear path to manage (reschedule, cancel, message)             | Success → "View My Bookings" → MySessions; client management scattered across notes, plans, messages | Management UX is split; no single "manage this booking" hub | **Medium** |

---

## 3. Cancellation Journey Gaps

| Step                                  | Expected                               | Current                                                                | Gap       | Priority |
| ------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------- | --------- | -------- |
| **Practitioner cancel**               | Clear flow with reason, refund preview | AlertDialog with optional reason, refund calculation when applicable   | Aligned   | None     |
| **Client cancel (SessionDetailView)** | Client can cancel future sessions      | Now shows Cancel for both `scheduled` and `confirmed`                  | **Fixed** | —        |
| **Guest cancel**                      | Guest can cancel from email link       | `GuestBookingView` has Cancel when `isCancellable` (confirmed, future) | Aligned   | None     |
| **Exchange request cancel**           | Requester can cancel pending request   | Cancel button on Sent tab; `cancelExchangeRequest`                     | Aligned   | None     |
| **Cancel feedback**                   | User sees confirmation and next steps  | Toast + navigation; cancellation email sent                            | Aligned   | None     |
| **Disabled cancel states**            | Clear why (e.g. "Session has started") | No tooltip; user may not understand                                    | **Low**   | Low      |

---

## 4. Email Journey Gaps

| Area                   | Finding                                                            | Notes                                                      |
| ---------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| **Confirmation email** | `booking_confirmation_client` includes location, View Booking link | Per EMAIL_AUDIT_AND_TRIGGERS                               |
| **Cancellation email** | Triggered from SessionDetailView practitioner cancel               | Uses booking-record location                               |
| **Rescheduling email** | Triggered from RescheduleService                                   | Uses shared location helper                                |
| **Placeholders**       | Replaced with user-friendly fallbacks per EMAIL_20_TEMPLATES_AUDIT | N/A, TBC etc. removed                                      |
| **Guest links**        | Token or email param for `GuestBookingView`                        | Alignment depends on `getEmailBaseUrl()` / `VITE_SITE_URL` |
| **Session reminders**  | 24h/1h templates exist but **not triggered**                       | No cron; product decision to leave off                     |

---

## 5. Messaging Journey Gaps

| Area                         | Finding                                                                  | Notes                                  |
| ---------------------------- | ------------------------------------------------------------------------ | -------------------------------------- |
| **Post-booking message CTA** | "Message Practitioner" on BookingSuccess when `conversationId && user`   | Guests without account do not see this |
| **SessionDetailView**        | "Message Therapist" navigates to `/messages?conversation=...`            | Clear                                  |
| **Conversation creation**    | Auto-created after payment; welcome message sent                         | May fail silently (non-blocking)       |
| **Notification → messages**  | `handleNotificationNavigation` can route to `/messages?conversation=...` | Depends on notification payload        |
| **Selected conversation**    | Unknown—Messages page not audited for selected-state affordance          | Deferred                               |

---

## 6. Notification Journey Gaps

| Area                               | Finding                                                                       | Notes                                    |
| ---------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------- |
| **Real-time toast**                | New notification shows toast with title/description                           | Good                                     |
| **Unread indicator**               | Badge/count on bell                                                           | Standard                                 |
| **Mark read / dismiss**            | Icon-only actions; no tooltip                                                 | Affordance gap                           |
| **Navigation**                     | `handleNotificationNavigation` routes to session, messages, exchange requests | Works when payload has correct metadata  |
| **Exchange request notifications** | Link to `?request=<id>` for focus                                             | ExchangeRequests scrolls to focused card |

---

## 7. Recommended Fix Order

### High priority

1. ~~**Add location to BookingSuccess**~~ – **Done.** Location now shown in Session Details.
2. ~~**Client Cancel for confirmed sessions**~~ – **Done.** Cancel shown for both scheduled and confirmed.
3. **MySessions location** – Select `appointment_type`, `visit_address` from `client_sessions`; render via `getSessionLocation` or shared resolver.

### Medium priority

4. **Add Tooltip component** – Install/use Radix Tooltip (or existing); add tooltips for:
   - Disabled Accept/Decline/Cancel (e.g. "Sending…" or "Expired")
   - Icon-only notification actions
   - Status badges where meaning may be unclear
5. **Guest reschedule** – Either implement self-serve reschedule from GuestBookingView or make copy explicit: "Rescheduling is not available; contact your practitioner."
6. ~~**Selected card highlight**~~ – **Done.** Exchange Requests cards highlight when `selectedRequest?.id === request.id`.

### Low priority

7. **ARIA improvements** – Ensure `aria-haspopup`, `aria-expanded` on dropdowns; `aria-label` on icon-only buttons.
8. **Session reminder triggers** – Only if product confirms; templates exist but unused.

---

## 8. Files Referenced

| File                                                                                         | Role                                                |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `search src/ for booking success`                                                            | Post-booking confirmation; missing location         |
| `search src/ for booking pagesGuestBookingView.tsx`                                          | Guest view; cancel works; reschedule not self-serve |
| `search src/pages + native bookings`                                                         | Client session list; wrong location model           |
| `search src/ + native session detail`                                                        | Cancel logic; client Cancel only for `scheduled`    |
| `theramate-ios-client exchange routes`                                                       | Exchange UI; selected state, affordances            |
| `search src/ for notificationsRealTimeNotifications.tsx`                                     | Notifications; icon-only actions                    |
| `src/components/ui/button.tsx`                                                               | Disabled/hover styling                              |
| `theramate-ios-client/lib/sessionLocation.ts (native); search src/ for web session location` | Shared location resolver                            |
| `theramate-ios-client/lib/sessionDisplayStatus.ts (native); search src/ for web`             | displayStatus (scheduled vs confirmed)              |

---

## 9. Affordances Checklist Summary

| Check                            | Status     | Notes                                              |
| -------------------------------- | ---------- | -------------------------------------------------- |
| Can users tell what's clickable? | ⚠️ Partial | Buttons/links mostly clear; icon-only actions weak |
| Selected vs unselected?          | ⚠️ Partial | Tabs good; list selection/highlight inconsistent   |
| Disabled clearly inactive?       | ✅ Yes     | opacity-50, pointer-events-none                    |
| Buttons/inputs look interactive? | ✅ Yes     | Shadows, hover states                              |
| Hover/press/tooltip cues?        | ⚠️ Partial | Hover/focus on buttons; **no tooltips**            |
