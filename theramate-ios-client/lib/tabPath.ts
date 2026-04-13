/** Root href for the current tab navigator (client `(tabs)` vs practitioner `(ptabs)`). */
export type TabRootHref = "/(tabs)" | "/(practitioner)/(ptabs)";

/** First path segment for routes rendered in the practitioner stack, outside the tab group. */
const PRACTITIONER_STACK_FIRST_SEGMENTS = new Set([
  "analytics",
  "availability",
  "billing",
  "clinical-files",
  "clinical-notes",
  "credits",
  "exchange",
  "explore",
  "marketplace",
  "mobile-requests",
  "projects",
  "services",
  "stripe-connect",
  "treatment-plans",
]);

/**
 * Build a navigable path for the current shell.
 * Tab stacks use public URLs (`/bookings/…`, `/profile/…`) so they match tab `href`s and deep links;
 * tab **home** stays grouped (`/(tabs)`, `/(practitioner)/(ptabs)`) so `/` is not used (root index gate).
 * Practitioner-only stack screens keep `/(practitioner)/…`.
 */
export function tabPath(root: TabRootHref, path: string): string {
  const p = path.startsWith("/") ? path.slice(1) : path;
  if (!p) return root;
  if (root === "/(practitioner)/(ptabs)") {
    const first = p.split("/")[0] ?? "";
    if (PRACTITIONER_STACK_FIRST_SEGMENTS.has(first)) {
      return `/(practitioner)/${p}`;
    }
    return `/${p}`;
  }
  return `/${p}`;
}
