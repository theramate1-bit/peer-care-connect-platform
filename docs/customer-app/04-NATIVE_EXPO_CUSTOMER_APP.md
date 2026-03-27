# Native customer app (`theramate-ios-client`)

**Monorepo path:** `theramate-ios-client/`  
**Framework:** Expo SDK ~52, Expo Router, React Native 0.76  
**Targets:** iOS and Android (same codebase)

**Theramate** customer native code lives in **`theramate-ios-client/`** only. The repo-root **`customer-app/`** folder is a different product (Localito); see [`10-TWO_NATIVE_CODEBASES.md`](10-TWO_NATIVE_CODEBASES.md). Native is not yet store-complete vs web — see [`05-PARITY_MATRIX.md`](05-PARITY_MATRIX.md).

## File-based routes (verified on disk)

| Route       | File                            | Tab / stack                             |
| ----------- | ------------------------------- | --------------------------------------- |
| Root layout | `app/_layout.tsx`               | Stripe, React Query, auth init, `Stack` |
| Auth stack  | `app/(auth)/_layout.tsx`        |                                         |
| Login       | `app/(auth)/login.tsx`          |                                         |
| Tabs layout | `app/(tabs)/_layout.tsx`        | Bottom tabs                             |
| Home        | `app/(tabs)/index.tsx`          | “Home” — placeholder refresh; links     |
| Explore     | `app/(tabs)/explore/index.tsx`  | Discovery                               |
| Bookings    | `app/(tabs)/bookings/index.tsx` | Sessions list                           |
| Messages    | `app/(tabs)/messages/index.tsx` | Messaging                               |
| Profile     | `app/(tabs)/profile/index.tsx`  | Profile                                 |

## Declared but missing files

`app/_layout.tsx` registers a **`booking` modal** screen. There is **no** `app/booking/` directory in the repo yet — implement when building full booking modals.

## Supabase client

| File                  | Role                                          |
| --------------------- | --------------------------------------------- |
| `lib/supabase.ts`     | `createClient` + **Expo SecureStore** adapter |
| `constants/config.ts` | URL, anon key, Stripe publishable key         |

## State

| Module                | Role                      |
| --------------------- | ------------------------- |
| `stores/authStore.ts` | Session + `users` profile |
| `hooks/useAuth.ts`    | Consumer hook             |

## API helpers (partial)

| Module                  | Role          |
| ----------------------- | ------------- |
| `lib/api/messages.ts`   | Messages API  |
| `lib/api/sessions.ts`   | Sessions      |
| `lib/api/therapists.ts` | Practitioners |

## Gaps vs web (customer)

1. **No** `/client/dashboard` parity — home tab is simplified.
2. **No** full `BookingFlow` / `GuestBookingFlow` / `MobileBookingRequestFlow` parity.
3. **No** guest URLs (`/book/:slug`, `/guest/mobile-requests`) as native routes yet.
4. **No** role split — store assumes client-style usage; practitioner app would be a **separate app or role gate** later.
5. **`booking` modal** route missing on disk.

## Commands (from package)

- `npm run start` — Expo dev
- `npm run ios` / `npm run android` — platform runners
- `npm run build:ios` — EAS (configure profiles)

See [`05-PARITY_MATRIX.md`](05-PARITY_MATRIX.md) for phased alignment.
