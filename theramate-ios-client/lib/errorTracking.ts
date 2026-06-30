/**
 * Optional Sentry for Expo. No-op when EXPO_PUBLIC_SENTRY_DSN is unset.
 */
import * as Sentry from "@sentry/react-native";
import { API_CONFIG } from "@/constants/config";

let initialized = false;

export function initErrorTracking(): void {
  const dsn = API_CONFIG.SENTRY_DSN?.trim();
  if (initialized || !dsn) return;
  Sentry.init({
    dsn,
    enableAutoSessionTracking: true,
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  });
  initialized = true;
}

export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!API_CONFIG.SENTRY_DSN?.trim()) return;
  if (!initialized) initErrorTracking();
  Sentry.captureException(error, { extra: context });
}
