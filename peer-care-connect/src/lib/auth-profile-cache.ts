const CACHE_KEY = "theramate_profile_cache_v1";
const CACHE_TTL_MS = 60 * 60 * 1000;

export const PROFILE_FETCH_TIMEOUT_MS = 12_000;

/** Minimal columns for routing / access policy. */
export const PROFILE_ROUTING_SELECT =
  "id, email, first_name, last_name, user_role, onboarding_status, profile_completed, stripe_connect_account_id";

/** Full profile row for shell + settings. */
export const PROFILE_FULL_SELECT =
  "id, email, first_name, last_name, user_role, onboarding_status, profile_completed, phone, bio, location, clinic_address, clinic_latitude, clinic_longitude, therapist_type, base_address, base_latitude, base_longitude, mobile_service_radius_km, service_radius_km, experience_years, professional_body, registration_number, qualification_type, professional_statement, treatment_philosophy, response_time_hours, services_offered, treatment_exchange_opt_in, has_liability_insurance, avatar_url, profile_photo_url, stripe_connect_account_id, monthly_earnings_goal, preferences, created_at, updated_at";

type CachedProfile = {
  userId: string;
  profile: Record<string, unknown>;
  cachedAt: number;
};

function readCache(): CachedProfile | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedProfile;
    if (!parsed?.userId || !parsed.profile) return null;
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function readCachedProfile(userId: string): Record<string, unknown> | null {
  const entry = readCache();
  if (!entry || entry.userId !== userId) return null;
  return entry.profile;
}

export function writeCachedProfile(
  userId: string,
  profile: Record<string, unknown>,
): void {
  try {
    const payload: CachedProfile = {
      userId,
      profile,
      cachedAt: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearCachedProfile(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

const ROUTING_STALE_KEYS = [
  "user_role",
  "onboarding_status",
  "profile_completed",
] as const;

export function isCacheStaleForProfile(
  cached: Record<string, unknown>,
  fresh: Record<string, unknown>,
): boolean {
  return ROUTING_STALE_KEYS.some((k) => cached[k] !== fresh[k]);
}
