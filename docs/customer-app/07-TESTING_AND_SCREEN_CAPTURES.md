# Testing and screen captures (customer)

## Automated capture list (web)

**File:** `capture-all-screens.js` (repo root)

Customer-relevant entries include Phase 3 (client screens) and guest flows. **Note:** Some paths in the script may **drift** from `AppContent.tsx` — always verify against [`../product/MOBILE_WEB_FULL_SCREEN_INVENTORY.md`](../product/MOBILE_WEB_FULL_SCREEN_INVENTORY.md) Appendix A.

### Customer-oriented paths from capture script (examples)

- `/client/dashboard` … `/client/favorites`
- `/booking-success`, `/review`
- `/marketplace`

## Playwright (web)

**Workspace:** `peer-care-connect`  
Scripts in `package.json`: `test:e2e`, `test:client-journey`, `test:user-journey`.

Run from monorepo root:

```bash
npm run test:web --workspace=peer-care-connect
```

(Adjust to your CI command — see `peer-care-connect/package.json`.)

## Jest (web)

- `components/marketplace/BookingFlow.test.tsx`
- `components/marketplace/GuestBookingFlow.test.tsx`

## Native (Expo)

- `theramate-ios-client`: `npm test` (Jest) — expand as screens grow.
- Manual: Expo Go on physical devices for push, deep links, SecureStore.

## What to record per release (customer)

1. Login as **client** — smoke: dashboard, booking, sessions, messages.
2. **Guest** — open `/book/{slug}` (test slug), `/booking/find`, `/review`.
3. **Mobile request** — create request, verify email + DB row.
4. **Regression** — RLS: ensure client cannot read other clients’ sessions.

## Document updates

When a customer route or flow ships on **web** or **native**, update:

- [`01-WEB_ROUTES.md`](01-WEB_ROUTES.md) or [`04-NATIVE_EXPO_CUSTOMER_APP.md`](04-NATIVE_EXPO_CUSTOMER_APP.md)
- [`05-PARITY_MATRIX.md`](05-PARITY_MATRIX.md)
