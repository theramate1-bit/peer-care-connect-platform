# OAuth & deep links — implementation checklist (customer mobile)

Actionable checklist for **Supabase Auth**, **custom URL scheme**, and **https** app links so email and OAuth flows match web. **Code constants** live in `theramate-ios-client/constants/config.ts` (`SCHEME`, `WEB_URL`, `BUNDLE_ID`).

---

## 1. Supabase Dashboard (Auth)

- [ ] **Site URL** — production web origin (e.g. `https://app.theramate.com` or your Vercel URL).
- [ ] **Redirect URLs** — include every variant:
  - `theramate://*` (or your scheme) **Auth callback** path
  - `exp://*` / Expo Go dev URLs for local testing
  - `https://auth.expo.io/@...` if using Expo proxy during dev
  - Web OAuth return URLs already used by `peer-care-connect`
- [ ] **Email templates** — magic links point to URLs that **redirect** into app or web consistently.

---

## 2. Expo / app config

- [x] **Scheme** — `theramate` in `app.json` / `app.config` (`scheme`) aligned with `StripeProvider` `urlScheme` and `APP_CONFIG.SCHEME`.
- [x] **Associated domains** (iOS) — `applinks:theramate.com` + `www` in config; `app.config.js` now auto-adds host variants from `EXPO_PUBLIC_WEB_URL` at build time.
- [x] **Intent filters** (Android) — HTTPS hosts configured with autoVerify; `app.config.js` now auto-adds `EXPO_PUBLIC_WEB_URL` host variants and a defensive custom-scheme VIEW filter.
- [ ] **Universal Links / App Links** JSON hosted at `https://yourdomain.com/.well-known/` — apple-app-site-association + assetlinks.json.

---

## 3. Paths to support (customer)

From [`02-GUEST_AND_PUBLIC_FLOWS.md`](02-GUEST_AND_PUBLIC_FLOWS.md):

| Path pattern               | Purpose             |
| -------------------------- | ------------------- |
| `/book/:slug`              | Direct booking      |
| `/booking/view/:sessionId` | Email session view  |
| `/booking/find`            | Lookup              |
| `/review`                  | Guest review        |
| `/guest/mobile-requests`   | Guest mobile        |
| `/auth/callback`           | OAuth code exchange |
| `/mobile-booking/success`  | Success             |

**Native:** routes below are implemented in **`theramate-ios-client/lib/deepLinking.ts`** (plus root `_layout` OAuth handling). OAuth also recognizes **HTTPS** `/auth/callback` and `/oauth-callback` on the configured web host (same session exchange as `theramate://oauth-callback`). Added auth/onboarding route handling for `/auth/verify-email`, `/auth/registration-success`, `/auth/role-selection`, `/auth/oauth-completion`, `/onboarding`, and `/auth/reset-password-confirm`.

---

## 4. Stripe (native)

- [x] **Return URL** for PaymentSheet configured (`theramate://booking-success`); keep Edge Function return URLs in sync.
- [x] **Merchant identifier** (`STRIPE_MERCHANT_ID`) configured in app plugin / constants (`merchant.com.theramate`).

---

## 5. Testing

- [ ] Cold start from email link (iOS + Android).
- [ ] OAuth round-trip (Google/Apple if enabled).
- [ ] Logout → login → deep link still works.

---

## Related

- [`15-MOBILE_PLATFORM_READINESS.md`](15-MOBILE_PLATFORM_READINESS.md) §6
- [`21-DEVELOPER_QUICKSTART_CUSTOMER_MOBILE.md`](21-DEVELOPER_QUICKSTART_CUSTOMER_MOBILE.md)
