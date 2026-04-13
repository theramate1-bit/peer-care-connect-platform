import { APP_CONFIG } from "@/constants/config";
import { tryMapWebUrlToRoute } from "@/lib/notificationUrlOpen";
import { tabPath, type TabRootHref } from "@/lib/tabPath";
import { getMainAppHref } from "@/lib/postAuthRoute";

export type NotificationNavResult =
  | { kind: "route"; path: string }
  | { kind: "url"; url: string };

/** Reject push payloads that would navigate to web URLs or traversal — those surface as unmatched routes. */
function isSafeInAppRoute(path: string): boolean {
  const p = path.trim();
  if (!p.startsWith("/")) return false;
  if (p.includes("..") || p.includes("//")) return false;
  if (/^[a-z]+:/i.test(p.slice(1))) return false;
  return true;
}

/**
 * Notification payloads sometimes carry stale route strings from older app versions.
 * Allow only route shapes that exist in this app so we avoid "unmatched route" navigations.
 */
function isKnownInAppRoute(path: string): boolean {
  const p = path.trim().split("?")[0] ?? "";
  return (
    p === "/" ||
    /^\/\((auth|tabs|practitioner)\)(\/.*)?$/.test(p) ||
    /^\/(login|register|forgot-password|hero|welcome|onboarding|oauth-callback|auth\/callback)$/.test(
      p,
    ) ||
    /^\/(settings|settings\/privacy|settings\/subscription)$/.test(p) ||
    /^\/(help|privacy|terms|cookies|contact|pricing|how-it-works|find-therapists|diagnostics)$/.test(
      p,
    ) ||
    /^\/(notifications|review|booking-success|subscription-success|stripe-customer-portal|hosted-web)$/.test(
      p,
    ) ||
    /^\/(booking(\/.*)?|book\/[^/]+)$/.test(p) ||
    /^\/therapist\/[^/]+\/public$/.test(p) ||
    /^\/(guest\/mobile-requests|mobile-booking\/(success|pending))$/.test(p) ||
    /^\/(profile|messages|bookings|explore|schedule)(\/.*)?$/.test(p) ||
    /^\/(analytics|availability|billing|clients|clinical-files|clinical-notes|credits|exchange|marketplace|mobile-requests|projects|services|stripe-connect|treatment-plans)(\/.*)?$/.test(
      p,
    )
  );
}

function pickStr(
  p: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const k of keys) {
    const v = p[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

function payloadRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

/**
 * Maps notification payload (+ optional inbox row fields) to an in-app route or external URL.
 * Prefer native `route` targets; `url` is for absolute links from the payload only.
 */
export function resolveNotificationNavigation(options: {
  payload: unknown;
  /** Inbox row overrides; push payloads may include the same keys inline. */
  sourceType?: string | null;
  sourceId?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  role: string | null | undefined;
}): NotificationNavResult | null {
  const p = payloadRecord(options.payload);
  const root: TabRootHref = getMainAppHref(options.role);
  const isClientShell = root === "/(tabs)";
  const webBase = APP_CONFIG.WEB_URL.replace(/\/$/, "");

  const explicitRoute = typeof p.route === "string" && p.route.trim() ? p.route : null;
  if (
    explicitRoute &&
    isSafeInAppRoute(explicitRoute) &&
    isKnownInAppRoute(explicitRoute)
  ) {
    return { kind: "route", path: explicitRoute.trim() };
  }

  const screenLc = pickStr(p, "screen")?.toLowerCase() ?? null;
  if (screenLc === "notifications" || screenLc === "inbox") {
    return { kind: "route", path: "/notifications" };
  }

  if (
    screenLc === "treatment_plan" ||
    screenLc === "treatment-plans" ||
    screenLc === "care_plan" ||
    screenLc === "care-plans"
  ) {
    const planId = pickStr(
      p,
      "planId",
      "plan_id",
      "treatment_plan_id",
      "planID",
    );
    if (planId) {
      if (root === "/(practitioner)/(ptabs)") {
        return { kind: "route", path: tabPath(root, `treatment-plans/${planId}`) };
      }
      return {
        kind: "route",
        path: tabPath(root, `profile/treatment-plans/${planId}`),
      };
    }
  }

  if (screenLc === "exchange" || screenLc === "treatment_exchange") {
    if (isClientShell) {
      return { kind: "route", path: tabPath(root, "profile/credits") };
    }
    return { kind: "route", path: tabPath(root, "exchange") };
  }

  if (screenLc === "mobile_requests" || screenLc === "mobile-booking") {
    const mid = pickStr(
      p,
      "mobile_request_id",
      "mobileRequestId",
      "mobile_booking_request_id",
      "request_id",
      "requestId",
    );
    if (isClientShell) {
      if (mid && !mid.includes(" ")) {
        return {
          kind: "route",
          path: tabPath(root, `profile/mobile-requests/${mid}`),
        };
      }
      return { kind: "route", path: tabPath(root, "profile/mobile-requests") };
    }
    if (mid && !mid.includes(" ")) {
      return { kind: "route", path: tabPath(root, `mobile-requests/${mid}`) };
    }
    return { kind: "route", path: tabPath(root, "mobile-requests") };
  }

  if (
    screenLc === "bookings" &&
    pickStr(p, "session_id", "sessionId")
  ) {
    const sid = pickStr(p, "session_id", "sessionId")!;
    return { kind: "route", path: tabPath(root, `bookings/${sid}`) };
  }

  if (
    screenLc === "messages" &&
    pickStr(p, "conversation_id", "conversationId")
  ) {
    const cid = pickStr(p, "conversation_id", "conversationId")!;
    return { kind: "route", path: tabPath(root, `messages/${cid}`) };
  }

  if (
    screenLc === "explore" &&
    pickStr(p, "practitioner_id", "practitionerId")
  ) {
    const pid = pickStr(p, "practitioner_id", "practitionerId")!;
    return { kind: "route", path: tabPath(root, `explore/${pid}`) };
  }

  const relatedType = (
    options.relatedEntityType ??
    pickStr(p, "related_entity_type", "relatedEntityType") ??
    ""
  ).toLowerCase();
  const relatedId =
    options.relatedEntityId ??
    pickStr(p, "related_entity_id", "relatedEntityId");

  const sessionId =
    pickStr(p, "sessionId", "session_id") ??
    (relatedType.includes("session") && relatedId ? relatedId : null);

  const treatmentPlanId =
    pickStr(p, "planId", "treatment_plan_id", "plan_id") ??
    (relatedType.includes("treatment_plan") && relatedId ? relatedId : null);

  const conversationId = pickStr(p, "conversationId", "conversation_id");
  const practitionerId = pickStr(p, "practitionerId", "practitioner_id");

  const mobileReqId = pickStr(
    p,
    "mobile_request_id",
    "mobileRequestId",
    "mobile_booking_request_id",
  );

  if (sessionId) {
    return { kind: "route", path: tabPath(root, `bookings/${sessionId}`) };
  }

  if (treatmentPlanId) {
    if (root === "/(practitioner)/(ptabs)") {
      return {
        kind: "route",
        path: tabPath(root, `treatment-plans/${treatmentPlanId}`),
      };
    }
    return {
      kind: "route",
      path: tabPath(root, `profile/treatment-plans/${treatmentPlanId}`),
    };
  }

  const st = (
    options.sourceType ??
    pickStr(p, "source_type", "sourceType") ??
    ""
  ).toLowerCase();
  if (
    st.includes("treatment_exchange") ||
    st.includes("slot_hold") ||
    st.includes("exchange")
  ) {
    if (isClientShell) {
      return { kind: "route", path: tabPath(root, "profile/credits") };
    }
    return { kind: "route", path: tabPath(root, "exchange") };
  }

  const srcId =
    options.sourceId ?? pickStr(p, "source_id", "sourceId") ?? null;

  if (st.includes("mobile") || mobileReqId) {
    const mid = mobileReqId || srcId;
    if (isClientShell) {
      if (mid && !mid.includes(" ")) {
        return {
          kind: "route",
          path: tabPath(root, `profile/mobile-requests/${mid}`),
        };
      }
      return { kind: "route", path: tabPath(root, "profile/mobile-requests") };
    }
    if (mid && !mid.includes(" ")) {
      return { kind: "route", path: tabPath(root, `mobile-requests/${mid}`) };
    }
    return { kind: "route", path: tabPath(root, "mobile-requests") };
  }

  if (conversationId) {
    return { kind: "route", path: tabPath(root, `messages/${conversationId}`) };
  }

  if (practitionerId) {
    return { kind: "route", path: tabPath(root, `explore/${practitionerId}`) };
  }

  const webPath = pickStr(p, "web_path", "href", "url");
  if (webPath) {
    const url = webPath.startsWith("http")
      ? webPath
      : `${webBase}${webPath.startsWith("/") ? "" : "/"}${webPath}`;
    const mappedRoute = tryMapWebUrlToRoute(url, options.role);
    if (mappedRoute && isSafeInAppRoute(mappedRoute) && isKnownInAppRoute(mappedRoute)) {
      return { kind: "route", path: mappedRoute };
    }
    return { kind: "url", url };
  }

  return null;
}

/** Convenience for Expo push `content.data` objects (fields may be top-level). */
export function resolveNotificationNavigationFromPushData(
  rawData: unknown,
  role: string | null | undefined,
): NotificationNavResult | null {
  const p = payloadRecord(rawData);
  return resolveNotificationNavigation({
    payload: p,
    sourceType: pickStr(p, "source_type", "sourceType"),
    sourceId: pickStr(p, "source_id", "sourceId"),
    relatedEntityType: pickStr(p, "related_entity_type", "relatedEntityType"),
    relatedEntityId: pickStr(p, "related_entity_id", "relatedEntityId"),
    role,
  });
}
