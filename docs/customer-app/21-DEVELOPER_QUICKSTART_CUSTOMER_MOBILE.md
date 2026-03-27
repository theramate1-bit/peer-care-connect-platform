# Developer quickstart — customer mobile

Where to open code, which package to run, and which env vars matter — **without** duplicating full Expo docs.

**If this is your first time in this docs folder:** read **[`00-JUNIOR_DEV_START_HERE.md`](00-JUNIOR_DEV_START_HERE.md)** for context (what “customer app” means, web vs native, reading order). Then return here for commands.

---

## Monorepo layout (relevant paths)

| Path                                                   | What it is                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| [`peer-care-connect/`](../../peer-care-connect/)       | **Web** — React + Vite; canonical **routes** and **client** UI to mirror.                         |
| [`theramate-ios-client/`](../../theramate-ios-client/) | **Theramate customer** Expo app (iOS + Android); `app/` = file routes; **canonical** native tree. |
| [`customer-app/`](../../customer-app/)                 | **Not Theramate** — Localito Marketplace; ignore for Peer Care Connect.                           |
| [`docs/customer-app/`](README.md)                      | **This** documentation set.                                                                       |
| [`supabase/functions/`](../../supabase/functions/)     | Edge Functions — same contracts as web.                                                           |

---

## Run the web app (reference behavior)

From repo root:

```bash
npm install
npm run dev
```

Uses workspace `peer-care-connect` (see root `package.json`).

Env: `peer-care-connect/.env.local` — mirror variable **names** concepts for native (`VITE_SUPABASE_*` → `EXPO_PUBLIC_*` on native).

---

## Run native (`theramate-ios-client`)

```bash
cd theramate-ios-client
npm install
npx expo start
```

Then **i** (iOS) or **a** (Android), or use `npm run ios` / `npm run android` per `package.json`.

---

## Environment variables (native)

**Source:** `theramate-ios-client/constants/config.ts`

| Variable                             | Purpose                                                                                               |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`           | Same project as web                                                                                   |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`      | Same anon key as web `VITE_SUPABASE_ANON_KEY`                                                         |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe RN / PaymentSheet                                                                              |
| `EXPO_PUBLIC_POSTHOG_API_KEY`        | Optional — see [`19-NATIVE_ANALYTICS_AND_OBSERVABILITY.md`](19-NATIVE_ANALYTICS_AND_OBSERVABILITY.md) |
| `EXPO_PUBLIC_SENTRY_DSN`             | Optional error tracking                                                                               |

**Never commit** real keys; use EAS Secrets or local `.env` (gitignored).

---

## Deep linking config (code constants)

From `APP_CONFIG` in `constants/config.ts`:

- **URL scheme:** `theramate` (used with Stripe RN `urlScheme`)
- **Web base:** `WEB_URL` — used for legal/help links

Full checklist: [`23-OAUTH_DEEP_LINKS_IMPLEMENTATION_CHECKLIST.md`](23-OAUTH_DEEP_LINKS_IMPLEMENTATION_CHECKLIST.md).

---

## What to read first

1. [`16-MOBILE_SCREENS_BUILD_LIST.md`](16-MOBILE_SCREENS_BUILD_LIST.md) — backlog
2. [`13-NATIVE_SCREENS_IMPLEMENTATION_STATUS.md`](13-NATIVE_SCREENS_IMPLEMENTATION_STATUS.md) — mocks vs real data
3. [`11-SCREEN_BY_SCREEN_WEB_CLIENT.md`](11-SCREEN_BY_SCREEN_WEB_CLIENT.md) — web behavior to match
4. [`18-MOBILE_UI_UX_FOUNDATIONS_BMAD.md`](18-MOBILE_UI_UX_FOUNDATIONS_BMAD.md) — UI tokens

---

## TypeScript (required before merging native changes)

From **repo root**:

```bash
npm run typecheck:mobile
```

Or inside **`theramate-ios-client/`**:

```bash
npm run type-check
```

NativeWind typings: **`nativewind-env.d.ts`** (referenced from `tsconfig.json`).

## Tests

- Web: `npm run test:web` from root (see root `package.json`).
- Native: `theramate-ios-client` — `npm test` when Jest is configured for the package.

See [`07-TESTING_AND_SCREEN_CAPTURES.md`](07-TESTING_AND_SCREEN_CAPTURES.md).
