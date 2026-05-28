import type { PlanId } from "@/config/pricing-display";

const STORAGE_KEY = "theramate_pending_practitioner_checkout";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface PendingPractitionerCheckout {
  plan: PlanId;
  billing: "monthly" | "yearly";
  savedAt: number;
}

function isPlanId(v: string | null): v is PlanId {
  return v === "practitioner" || v === "pro";
}

function isBilling(v: string | null): v is "monthly" | "yearly" {
  return v === "monthly" || v === "yearly";
}

/** Read plan + billing from URL (e.g. /register?plan=pro&billing=yearly) */
export function readCheckoutFromSearchParams(searchParams: URLSearchParams): {
  plan: PlanId;
  billing: "monthly" | "yearly";
} | null {
  const plan = searchParams.get("plan");
  const billing = searchParams.get("billing");
  if (!isPlanId(plan) || !isBilling(billing)) return null;
  return { plan, billing };
}

export function setPendingPractitionerCheckout(plan: PlanId, billing: "monthly" | "yearly") {
  try {
    const payload: PendingPractitionerCheckout = {
      plan,
      billing,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage may be blocked
  }
}

export function getPendingPractitionerCheckout(): {
  plan: PlanId;
  billing: "monthly" | "yearly";
} | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPractitionerCheckout;
    if (!isPlanId(parsed.plan) || !isBilling(parsed.billing)) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { plan: parsed.plan, billing: parsed.billing };
  } catch {
    return null;
  }
}

export function clearPendingPractitionerCheckout() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
