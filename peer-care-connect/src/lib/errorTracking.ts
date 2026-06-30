/**
 * Optional Sentry for web (Vite). No-op when VITE_SENTRY_DSN is unset.
 */
import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
let initialized = false;

export function initErrorTracking(): void {
  if (initialized || !dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  });
  initialized = true;
}

export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!dsn) return;
  if (!initialized) initErrorTracking();
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "warning",
  context?: Record<string, unknown>,
): void {
  if (!dsn) return;
  if (!initialized) initErrorTracking();
  Sentry.captureMessage(message, { level, extra: context });
}
