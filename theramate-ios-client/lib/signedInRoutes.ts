import { tabPath, type TabRootHref } from "@/lib/tabPath";
import { getMainAppHref } from "@/lib/postAuthRoute";
import { useAuthStore } from "@/stores/authStore";

/** Tab shell for the current user (reads live profile from the auth store). */
export function getSignedInTabRoot(): TabRootHref {
  return getMainAppHref(useAuthStore.getState().userProfile?.user_role);
}

/** Path under the signed-in tab root, e.g. `bookings/123` or `profile/settings`. */
export function signedInTabPath(segment: string): string {
  return tabPath(getSignedInTabRoot(), segment);
}

/** Client `(tabs)` shell — not practitioner `(ptabs)`. */
export function isClientTabRoot(tabRoot: TabRootHref): boolean {
  return tabRoot === "/(tabs)";
}

export function isPractitionerTabRoot(tabRoot: TabRootHref): boolean {
  return tabRoot === "/(practitioner)/(ptabs)";
}
