# Observability

## Sentry (errors)

| Surface     | Env var                  | Init                                                     |
| ----------- | ------------------------ | -------------------------------------------------------- |
| Web (Vite)  | `VITE_SENTRY_DSN`        | `peer-care-connect/src/main.tsx` → `initErrorTracking()` |
| iOS/Android | `EXPO_PUBLIC_SENTRY_DSN` | `theramate-ios-client/app/_layout.tsx`                   |

Optional native source maps (EAS build):

- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` in EAS secrets
- Enables `@sentry/react-native/expo` plugin in `app.config.js` when org + project are set

### Setup checklist

1. Create Sentry project(s) for `theramate-web` and `theramate-mobile`.
2. Set DSN in Vercel (`VITE_SENTRY_DSN`) and EAS (`EXPO_PUBLIC_SENTRY_DSN`).
3. Configure alert rules: unhandled errors, spike in `stripe-payment` failures (via log drain if added later).
4. Verify: trigger a test error in staging build; confirm event in Sentry.

## PostHog (product analytics, optional)

`EXPO_PUBLIC_POSTHOG_API_KEY` — see `theramate-ios-client/constants/config.ts`.

## Supabase logs

Edge function logs and Postgres logs: Supabase Dashboard → Logs. Use for payment and exchange incidents.

## Release correlation

Tag releases in Sentry with EAS build number / web deploy SHA.
