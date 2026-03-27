# Mobile customer app — platform readiness

Single place to see **what is already aligned** between web and native for the **customer** experience, and **what work remains**. This complements the feature checklist in [`05-PARITY_MATRIX.md`](05-PARITY_MATRIX.md).

---

## Status at a glance

| Area                        | Status                               | Notes                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend / auth / data**   | **Yes — ready**                      | Supabase + JWT + RLS + Edge Functions are **platform-agnostic**. Web and native use the **same** project, anon key, and security model. Native must use **SecureStore** (or equivalent) for session persistence, not duplicate business logic.                                                                                                                  |
| **Shared TypeScript types** | **Ready to add**                     | Generated DB types (`Database` from Supabase) can power both `peer-care-connect` and Expo via a **`packages/shared`** (or similar) workspace — **not mandatory on day one**, but reduces drift as soon as two clients query the same tables.                                                                                                                    |
| **Native UI codebase**      | **Advanced beta — not store “done”** | Canonical app: **`theramate-ios-client/`** (see [`10-TWO_NATIVE_CODEBASES.md`](10-TWO_NATIVE_CODEBASES.md)). Repo-root [`customer-app/`](../../customer-app/README.md) is **not** Theramate. Native has booking modal, PaymentSheet/Checkout, most client tabs; remaining work is parity polish, store assets, and device-tested deep links.                    |
| **Business rules**          | **Mostly server-side — good**        | Postgres, RLS, RPC, and Edge Functions own enforcement. **Native must not re-implement** guest/client rules, booking modes, or credits logic in UI-only code. Call the **same** queries, RPCs, and `functions.invoke` paths as web. See [`08-GUEST_VS_CLIENT_PRODUCT_RULES.md`](08-GUEST_VS_CLIENT_PRODUCT_RULES.md).                                           |
| **Payments / Stripe**       | **Ready in principle**               | `@stripe/stripe-react-native` + **PaymentSheet** is the right stack. Charges and Connect state must stay aligned with existing **Edge Functions** (`stripe-payment`, `mobile-payment`, etc.) and **webhooks** — same as web. No duplicate payment intent creation outside server contract.                                                                      |
| **Deep links / OAuth**      | **Partial — verify on device**       | In-app routing for `book/*`, `booking/find`, `booking/view/*`, review, notifications, OAuth callback, etc. is implemented in **`lib/deepLinking.ts`** + root `_layout`. **Still required:** Supabase Dashboard redirect URLs, **Universal Links** / **App Links** verification (`apple-app-site-association`, Digital Asset Links), and QA on physical devices. |

---

## 1. Backend / auth / data (ready)

**Contracts**

- **Auth:** `supabase.auth` — PKCE on web; session in **SecureStore** on Expo (see `theramate-ios-client/lib/supabase.ts`).
- **Data:** All reads/writes go through Supabase client with user JWT → **RLS** applies automatically.
- **Privileged operations:** `supabase.functions.invoke(...)` with user session or service role only on server — same as web.

**Docs:** [`06-DATA_SUPABASE_REALTIME.md`](06-DATA_SUPABASE_REALTIME.md), [`14-CLIENT_SHARED_LIBRARIES.md`](14-CLIENT_SHARED_LIBRARIES.md).

**Anti-pattern:** Duplicating “validation” only in React Native that the DB does not enforce — if web relies on RLS, native must too.

---

## 2. Shared TypeScript types (ready to add)

**Why:** `peer-care-connect` already uses generated `Database` types under `integrations/supabase/types`. Expo apps should import the **same** shape to avoid column name drift.

**How (suggested):**

1. Generate types from Supabase (CLI or MCP `generate_typescript_types` where available).
2. Add a workspace package, e.g. `packages/supabase-types`, and depend on it from **web** and **Expo**.
3. Optionally share thin **query helpers** (not full UI) in `packages/api-client` later.

**When:** Before or during the first **large** native feature (full marketplace + booking), not necessarily before replacing mocks on Home.

---

## 3. Native UI codebase (advanced beta)

**Truth source:** [`13-NATIVE_SCREENS_IMPLEMENTATION_STATUS.md`](13-NATIVE_SCREENS_IMPLEMENTATION_STATUS.md), [`11-SCREEN_BY_SCREEN_WEB_CLIENT.md`](11-SCREEN_BY_SCREEN_WEB_CLIENT.md).

**Minimum bar for “production-complete” (customer):**

- No **production** reliance on hard-coded therapist/session lists.
- Parity with **critical paths** in [`05-PARITY_MATRIX.md`](05-PARITY_MATRIX.md) (auth, sessions, marketplace booking, messages).
- **`booking` modal/stack** — implemented under `theramate-ios-client/app/booking/`; remaining gaps tracked in docs 05 / 13.

---

## 4. Business rules (server-side — preserve)

**Rule:** If the rule exists in SQL (CHECK, trigger), RLS, RPC, or Edge Function, **native calls that path**. UI can format messages but must not **decide** eligibility differently from web.

**Examples:** guest vs client pre-assessment, hybrid vs mobile request, credit holds — see product docs linked from [`08-GUEST_VS_CLIENT_PRODUCT_RULES.md`](08-GUEST_VS_CLIENT_PRODUCT_RULES.md).

---

## 5. Payments / Stripe (align with server)

**Web:** Checkout / Elements / Connect onboarding as implemented today.

**Native:** PaymentSheet / Connect onboarding via Stripe’s React Native SDK; **intents and Connect account state** still originate from **your** Edge Functions and webhooks.

**Checklist**

- [x] Same **Edge Function** endpoints as web for creating payment intents / checkout sessions (`lib/api/booking.ts`); re-verify when server contracts change.
- [ ] Webhook handlers unchanged — one source of truth in DB (server ops).
- [ ] Test **Connect** payouts path if practitioners use mobile for onboarding (practitioner app; still worth listing for monorepo clarity).

---

## 6. Deep links / OAuth (routing in app; hosting config remains)

| Task                   | Detail                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Supabase Dashboard** | Add redirect URLs: app scheme (`theramate://` or project-specific), Expo dev URLs, production bundle IDs.  |
| **iOS**                | Associated Domains + `apple-app-site-association` for Universal Links to `/book/*`, `/auth/callback`, etc. |
| **Android**            | Intent filters + Digital Asset Links for App Links.                                                        |
| **OAuth**              | Google/Apple sign-in: native SDK vs web flow — align with `AuthCallback` / `OAuthCompletion` expectations. |
| **Email links**        | Booking view, find booking, review — should open app if installed, else web.                               |

**Product routes to support:** [`02-GUEST_AND_PUBLIC_FLOWS.md`](02-GUEST_AND_PUBLIC_FLOWS.md).

---

## Related operational docs

| Topic                        | Doc                                                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| Email / push                 | [`09-EMAIL_PUSH_AND_NOTIFICATIONS.md`](09-EMAIL_PUSH_AND_NOTIFICATIONS.md)                           |
| Testing / captures           | [`07-TESTING_AND_SCREEN_CAPTURES.md`](07-TESTING_AND_SCREEN_CAPTURES.md)                             |
| Navigation quirks (web)      | [`12-NAVIGATION_SHELL_AND_ENTRY_POINTS.md`](12-NAVIGATION_SHELL_AND_ENTRY_POINTS.md)                 |
| OAuth / deep links checklist | [`23-OAUTH_DEEP_LINKS_IMPLEMENTATION_CHECKLIST.md`](23-OAUTH_DEEP_LINKS_IMPLEMENTATION_CHECKLIST.md) |
| Developer quickstart         | [`21-DEVELOPER_QUICKSTART_CUSTOMER_MOBILE.md`](21-DEVELOPER_QUICKSTART_CUSTOMER_MOBILE.md)           |

---

## Revision

Update this file when **shared types** land or when **native** reaches store submission readiness ([`26-RELEASE_AND_STORE_READINESS.md`](26-RELEASE_AND_STORE_READINESS.md)).
