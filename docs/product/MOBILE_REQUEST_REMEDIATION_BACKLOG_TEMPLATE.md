# Mobile Request Remediation Backlog Template

Date: 2026-03-08  
Companion doc: `docs/product/MOBILE_REQUEST_REMEDIATION_TABLE.md`

Use this template to convert remediation items into implementation tickets.

## Ticket Format

| Ticket Title | Priority | Owner | Problem Statement | Acceptance Criteria |
| ------------ | -------- | ----- | ----------------- | ------------------- |
|              |          |       |                   |                     |

## Suggested First Tickets

1. **Guest accepted request handoff to safe session view** (High)
2. **Guest success screen: add direct "View my request" action** (Medium)
3. **Guest pending request cancellation support** (Medium, if product-supported)
4. **Expose request expiry (`expires_at`) in practitioner/client request UIs** (Medium)
5. **Notification route parity for authenticated vs guest users** (Low)

## Acceptance Criteria Starter Set

### 1) Guest accepted request handoff

- Guest user never hits protected `/client/sessions` from mobile request status.
- `View session` routes to a guest-safe target or is hidden/disabled with clear messaging.
- No auth redirect loop from accepted request status path.

### 2) Guest success continuity

- Guest success state exposes a clear next step to track the submitted request.
- Action routes to the guest request status surface for the newly created request.

### 3) Guest pending cancellation (if enabled)

- Guest can cancel pending mobile request from guest status screen.
- Cancel action updates request status consistently with authenticated client behavior.

### 4) Expiry visibility

- `expires_at` is visible on practitioner and client/guest request surfaces for pending requests.
- Countdown/expiry state is explicit and updates correctly.

### 5) Notification route parity

- Accepted/declined/expired email links route correctly based on user state.
- Authenticated users are sent to authenticated route parity path.
- Guests are sent to guest-safe path only.
