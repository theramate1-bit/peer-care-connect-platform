# App Store readiness (Theramate client)

## MCP / backend snapshot (run periodically)

- **Supabase:** Project `aikqnvltuwwgifuocvto` is **ACTIVE_HEALTHY** (eu-west-2). Edge function **`stripe-payment`** is **ACTIVE** (mobile app uses this for payments).
- **Stripe:** Connected account **Theramate** (`acct_1RyBwQFk77knaVva`). Manage API keys in the [Stripe Dashboard](https://dashboard.stripe.com/acct_1RyBwQFk77knaVva/apikeys).
- **Supabase security advisors:** The project reports many **database linter** items (SECURITY DEFINER views, RLS patterns, function `search_path`, Auth hardening). These are **backend hygiene**, not App Store blockers; track in Supabase → Advisors and [database linter docs](https://supabase.com/docs/guides/database/database-linter).

## Apple — before first `eas build` / `eas submit`

1. **Apple Developer Program** — Enroll; create **App ID** `com.theramate.client` (matches `app.json`).
2. **Certificates & provisioning** — Run `eas credentials` (or let EAS manage with `eas build`).
3. **App Store Connect** — New app: name, primary language, bundle ID, SKU. Note **Apple Team ID** for local `eas submit` prompts if needed.
4. **Merchant ID** — Apple Pay / Stripe: `merchant.com.theramate` is set in `app.json` plugins; create the same identifier in Apple Developer → Identifiers → Merchant IDs and link to your App ID.
5. **EAS project** — From `theramate-ios-client`: `eas init`, then set **`EAS_PROJECT_ID`** in CI or `.env` (see `app.config.js`) so builds do not use the placeholder id.
6. **Encryption export compliance** — `ITSAppUsesNonExemptEncryption` is **false** in `app.json` (standard TLS only). In App Store Connect, answer the encryption questionnaire accordingly (typically “uses encryption exempt under EAR”).
7. **Privacy Nutrition Labels** — In App Store Connect, declare data collected (account, health/fitness if applicable, location for therapist search, purchases, etc.) to match actual app behaviour and your privacy policy (`https://theramate.com/privacy` in config).
8. **Universal Links** — `associatedDomains` are set for `theramate.com` / `www`. Host **apple-app-site-association** on those domains or Universal Links will not open the app from Safari.

## Build & submit commands

```bash
cd theramate-ios-client
npm ci
eas build --platform ios --profile production
eas submit --platform ios --profile production --latest
```

`eas.json` production profile uses **`autoIncrement`** for iOS build numbers when `appVersionSource` is `remote` (already set).

## Review notes

- Provide a **demo account** if reviewers cannot register freely.
- Explain **Stripe** (in-app purchases vs physical goods / services): healthcare booking with Stripe is typically **not** IAP; align with your lawyer and Apple’s current guidelines for your jurisdiction.
- **Screenshots** — Required sizes for iPhone 6.7" and 6.5" (and others per Connect). Capture from production build or simulator.

## Google Play (optional)

Production profile sets **`buildType`: `app-bundle`**. Complete Play Console listing, Data safety form, and [asset links](https://developer.android.com/training/app-links) matching `app.json` intent filters.
