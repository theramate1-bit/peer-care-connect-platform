import type { AuthChangeEvent } from "@supabase/supabase-js";

/** Do not re-run full profile sync on token refresh noise. */
export function isSessionOnlyAuthEvent(event: AuthChangeEvent): boolean {
  return event === "TOKEN_REFRESHED";
}

export function shouldInvalidateProfileCache(event: AuthChangeEvent): boolean {
  return event === "SIGNED_IN" || event === "USER_UPDATED";
}

/** Use cache on INITIAL_SESSION / TOKEN_REFRESHED to avoid duplicate fetches. */
export function shouldSkipProfileSyncOnAuthEvent(event: AuthChangeEvent): boolean {
  return event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED";
}
