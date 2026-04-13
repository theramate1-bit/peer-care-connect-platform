/**
 * Dismiss native splash as aggressively as needed. Uses expo-splash-screen JS API and
 * optional direct ExpoSplashScreen native calls (same as the Swift module).
 * Import this file AFTER `expo-router/entry` so the RN / Expo native bridge is ready.
 */
import { AppState, InteractionManager } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import * as SplashScreen from "expo-splash-screen";

const NativeSplash = requireOptionalNativeModule("ExpoSplashScreen");

function hide() {
  try {
    SplashScreen.hide();
  } catch {
    /* ignore */
  }
  try {
    NativeSplash?.hide?.();
  } catch {
    /* ignore */
  }
  try {
    const p = NativeSplash?.internalMaybeHideAsync?.();
    if (p && typeof p.then === "function") {
      p.then(undefined, () => {});
    }
  } catch {
    /* ignore */
  }
}

// Do not call hide() synchronously on import: native SplashScreenManager.initWith(rootView)
// may run after the first JS tick, so early hide() no-ops (loadingView nil). Start after a tick.
const delays = [50, 100, 200, 400, 600, 800, 1200, 2000, 3500];
delays.forEach((ms) => setTimeout(hide, ms));

if (AppState.currentState === "active") {
  setTimeout(hide, 16);
}

if (typeof requestAnimationFrame !== "undefined") {
  requestAnimationFrame(() => {
    hide();
    try {
      InteractionManager.runAfterInteractions(() => {
        hide();
      });
    } catch {
      /* bridge not ready */
    }
  });
}

const sub = AppState.addEventListener("change", (next) => {
  if (next === "active") {
    hide();
  }
});

setTimeout(() => {
  try {
    sub.remove();
  } catch {
    /* older RN */
  }
}, 120000);
