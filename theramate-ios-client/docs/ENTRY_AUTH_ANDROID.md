# Entry flow, auth gate, and Android Metro

This note captures fixes for **routing from `app/index.tsx`**, **Expo Router’s root-layout requirement**, and **Android bundling**. Keep it next to other app docs under `docs/`.

---

## 1. Auth gate + welcome (localito-style flow)

**Goal:** Native splash (from `app.config.js`) → short in-app loading state → **welcome** (unauthenticated) or **tabs** (authenticated). Marketing UI is not the first paint on `/`; it lives on **`/(auth)/welcome`**.

| File | Role |
|------|------|
| `app/index.tsx` | **Gate only:** white background + spinner + “Loading…” until `isInitialized`, then `router.replace`. |
| `app/(auth)/welcome.tsx` | Theramate headline, **Sign in**, **Create account**, browse, web — same as the old root landing. |
| `app/(auth)/_layout.tsx` | Declares the `welcome` screen in the auth stack. |

**Loading UI:** Uses `Colors.white` and sage `ActivityIndicator`, **not** cream `#FFFDF8`, so it does not look like a stuck native splash.

---

## 2. Must wait for root navigation before `router.replace`

**Error:** `Attempted to navigate before mounting the Root Layout component`.

**Cause:** Calling `router.replace(...)` in `useEffect` as soon as `isInitialized` is true can run **before** the root navigator is mounted.

**Fix:** Gate navigation on Expo Router’s root state, same class of check as splash hide in `app/_layout.tsx`:

```tsx
import { router, useRootNavigationState } from "expo-router";

const rootNavigation = useRootNavigationState();

useEffect(() => {
  if (rootNavigation?.key == null) return;
  if (!isInitialized || didNavigate.current) return;
  didNavigate.current = true;
  // router.replace("/(tabs)") or router.replace("/(auth)/welcome")
}, [rootNavigation?.key, isAuthenticated, isInitialized]);
```

---

## 3. Android: run Metro from the app directory

**Symptom:** Red screen / Metro 500, e.g. missing `LogBox` assets or wrong `react-native` resolution.

**Cause:** Starting Metro from the **monorepo root** with `npx expo start path/to/theramate-ios-client` can resolve **`node_modules`** incorrectly for RN internals.

**Fix:** Start the dev server **inside** `theramate-ios-client`:

```bash
cd theramate-ios-client
npx expo start --port 8081
```

**Script:** `scripts/dev-android-emulator.sh` starts Metro with `cd "$CLIENT_DIR"` and `npx expo start --port "$PORT"` (not from the repo root).

**Emulator → host JS:** Still use:

```bash
adb reverse tcp:8081 tcp:8081
```

---

## 4. Quick retest checklist

1. Emulator running, `adb reverse tcp:8081 tcp:8081`.
2. Metro from `theramate-ios-client` on `8081`.
3. Launch app → brief **Loading…** → **Theramate** welcome with **Sign in** / **Create account**.
4. **Sign in** → **Welcome Back** / email / password (login screen).

---

*Last updated to match the auth gate + `useRootNavigationState` navigation fix and Android Metro cwd fix.*
