/**
 * App Configuration
 * Environment variables and app-wide constants
 */

import Constants from "expo-constants";

type PublicEnvKey =
  | "EXPO_PUBLIC_SUPABASE_URL"
  | "EXPO_PUBLIC_SUPABASE_ANON_KEY"
  | "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY"
  | "EXPO_PUBLIC_WEB_URL"
  | "EXPO_PUBLIC_POSTHOG_API_KEY"
  | "EXPO_PUBLIC_SENTRY_DSN";

/** Metro inlines `EXPO_PUBLIC_*` from `.env`; `app.config.js` `extra` fills gaps via `expo-constants` (EAS/CI). */
function envPublic(key: PublicEnvKey): string | undefined {
  const fromProcess = process.env[key];
  if (fromProcess != null && String(fromProcess).trim() !== "") {
    return String(fromProcess).trim();
  }
  const extra = Constants.expoConfig?.extra as
    | Record<string, string | undefined>
    | undefined;
  const v = extra?.[key];
  if (v != null && String(v).trim() !== "") return String(v).trim();
  return undefined;
}

// Theramate Supabase (project ref aikqnvltuwwgifuocvto). Prefer `EXPO_PUBLIC_*` in `.env`.
const DEFAULT_SUPABASE_URL = "https://aikqnvltuwwgifuocvto.supabase.co";
/** Public anon key (JWT); safe in client with RLS — rotate in dashboard if needed. */
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac";

// API Configuration
export const API_CONFIG = {
  // Supabase - Same backend as web app
  SUPABASE_URL: envPublic("EXPO_PUBLIC_SUPABASE_URL") ?? DEFAULT_SUPABASE_URL,
  SUPABASE_ANON_KEY:
    envPublic("EXPO_PUBLIC_SUPABASE_ANON_KEY") ?? DEFAULT_SUPABASE_ANON_KEY,

  // Stripe
  STRIPE_PUBLISHABLE_KEY: envPublic("EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY") ?? "",
  STRIPE_MERCHANT_ID: "merchant.com.theramate",

  // PostHog Analytics (optional)
  POSTHOG_API_KEY: envPublic("EXPO_PUBLIC_POSTHOG_API_KEY") ?? "",
  POSTHOG_HOST: "https://app.posthog.com",

  // Sentry Error Tracking (optional)
  SENTRY_DSN: envPublic("EXPO_PUBLIC_SENTRY_DSN") ?? "",
} as const;

// App Constants
export const APP_CONFIG = {
  NAME: "Theramate",
  VERSION: "1.0.0",
  BUNDLE_ID: "com.theramate.client",

  // Deep linking (override with EXPO_PUBLIC_WEB_URL for staging / white-label)
  SCHEME: "theramate",
  OAUTH_CALLBACK_PATH: "oauth-callback",
  RESET_PASSWORD_PATH: "reset-password-confirm",
  WEB_URL: (envPublic("EXPO_PUBLIC_WEB_URL") ?? "https://theramate.com").replace(
    /\/$/,
    "",
  ),

  // Support
  SUPPORT_EMAIL: "support@theramate.com",
  PRIVACY_URL: "https://theramate.com/privacy",
  TERMS_URL: "https://theramate.com/terms",
  HELP_URL: "https://theramate.com/help",
} as const;

// Session/Booking Constants
export const BOOKING_CONFIG = {
  // Slot holding time in minutes
  SLOT_HOLD_MINUTES: 10,

  // Default session durations
  DEFAULT_DURATION_MINUTES: 60,
  AVAILABLE_DURATIONS: [30, 45, 60, 90, 120],

  // Cancellation policy
  CANCELLATION_WINDOW_HOURS: 24,

  // Booking buffer time (minimum hours before session)
  MIN_BOOKING_BUFFER_HOURS: 2,

  // Max advance booking days
  MAX_ADVANCE_BOOKING_DAYS: 90,
} as const;

// UI Constants
export const UI_CONFIG = {
  // Animation durations (ms)
  ANIMATION_FAST: 150,
  ANIMATION_NORMAL: 300,
  ANIMATION_SLOW: 500,

  // Debounce/throttle times
  SEARCH_DEBOUNCE_MS: 300,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,

  // Toast durations (ms)
  TOAST_DURATION_SHORT: 2000,
  TOAST_DURATION_NORMAL: 3500,
  TOAST_DURATION_LONG: 5000,

  // Pull to refresh
  REFRESH_CONTROL_OFFSET: 40,
} as const;

// Map Configuration
export const MAP_CONFIG = {
  // Default UK location (London)
  DEFAULT_LATITUDE: 51.5074,
  DEFAULT_LONGITUDE: -0.1278,
  DEFAULT_DELTA: 0.1,

  // Search radius options (km)
  RADIUS_OPTIONS: [5, 10, 25, 50],
  DEFAULT_RADIUS_KM: 25,

  // Nominatim rate limiting
  GEOCODING_DELAY_MS: 1000,
} as const;

// Specializations (matching web app)
export const SPECIALIZATIONS = [
  { value: "sports_therapy", label: "Sports Therapy" },
  { value: "massage_therapy", label: "Massage Therapy" },
  { value: "osteopathy", label: "Osteopathy" },
  { value: "physiotherapy", label: "Physiotherapy" },
  { value: "chiropractic", label: "Chiropractic" },
  { value: "acupuncture", label: "Acupuncture" },
  { value: "rehabilitation", label: "Rehabilitation" },
] as const;

export type Specialization = (typeof SPECIALIZATIONS)[number]["value"];

// Session Status (matching database enum)
export const SESSION_STATUSES = {
  scheduled: { label: "Scheduled", color: "info" },
  confirmed: { label: "Confirmed", color: "success" },
  in_progress: { label: "In Progress", color: "warning" },
  completed: { label: "Completed", color: "success" },
  cancelled: { label: "Cancelled", color: "error" },
  no_show: { label: "No Show", color: "error" },
} as const;

export type SessionStatus = keyof typeof SESSION_STATUSES;

// Payment Status
export const PAYMENT_STATUSES = {
  pending: { label: "Pending", color: "warning" },
  paid: { label: "Paid", color: "success" },
  refunded: { label: "Refunded", color: "info" },
  failed: { label: "Failed", color: "error" },
} as const;

export type PaymentStatus = keyof typeof PAYMENT_STATUSES;
