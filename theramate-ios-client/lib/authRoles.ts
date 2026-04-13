import { THERAPIST_ROLES } from "@/lib/api/marketplace";

/**
 * Whether this `users.user_role` should land in the practitioner mobile shell.
 * DB uses therapist subtypes; the app signup path may store `practitioner` before profile completion.
 */
export function isPractitionerPortalRole(role: string | null | undefined): boolean {
  if (!role) return false;
  if (role === "practitioner") return true;
  return (THERAPIST_ROLES as readonly string[]).includes(role);
}
