import type { TabRootHref } from "@/lib/tabPath";

import { isPractitionerPortalRole } from "@/lib/authRoles";

/**
 * Main signed-in shell: clients use `(tabs)`; practitioners land on `(practitioner)/(ptabs)`.
 * `user_role` comes from Supabase and may be `practitioner` (app) or therapist subtypes (DB).
 */
export function getMainAppHref(role: string | null | undefined): TabRootHref {
  if (isPractitionerPortalRole(role)) return "/(practitioner)/(ptabs)";
  return "/(tabs)";
}
