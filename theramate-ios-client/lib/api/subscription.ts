/**
 * Practitioner / workspace subscription rows (`public.subscriptions`) and Stripe Customer Portal.
 */

import { supabase } from "@/lib/supabase";

/** Subset of columns used by the mobile app (matches verify-checkout upserts + migrations). */
export type SubscriptionRecord = {
  id: string;
  user_id: string;
  plan: string | null;
  billing_cycle: string | null;
  status: string | null;
  stripe_subscription_id: string | null;
  price_id: string | null;
  stripe_customer_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  plan_metadata: Record<string, unknown> | null;
  updated_at: string | null;
};

export type SubscriptionSummary = {
  subscription: SubscriptionRecord | null;
  /** True when Supabase returned a permission / RLS error (caller may show limited UI). */
  accessDenied: boolean;
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  practitioner: "Practitioner",
  pro: "Pro",
  clinic: "Clinic",
};

export function formatPlanLabel(plan: string | null | undefined): string {
  if (!plan) return "Plan";
  const key = plan.trim().toLowerCase();
  return PLAN_LABELS[key] ?? plan.replace(/_/g, " ");
}

export function formatBillingCycle(
  cycle: string | null | undefined,
): string | null {
  if (!cycle) return null;
  const c = cycle.trim().toLowerCase();
  if (c === "monthly") return "Monthly";
  if (c === "yearly" || c === "annual" || c === "year") return "Yearly";
  return cycle;
}

export function formatSubscriptionStatus(
  status: string | null | undefined,
): string {
  if (!status) return "Unknown";
  const s = status.trim().toLowerCase();
  switch (s) {
    case "active":
      return "Active";
    case "past_due":
      return "Past due";
    case "cancelled":
    case "canceled":
      return "Cancelled";
    case "unpaid":
      return "Unpaid";
    case "trialing":
      return "Trialing";
    default:
      return status.replace(/_/g, " ");
  }
}

export async function fetchLatestSubscription(
  userId: string,
): Promise<{ data: SubscriptionSummary | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select(
        "id, user_id, plan, billing_cycle, status, stripe_subscription_id, price_id, stripe_customer_id, current_period_start, current_period_end, plan_metadata, updated_at",
      )
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      const msg = error.message || "";
      const accessDenied =
        /permission|rls|policy|not authorized|jwt/i.test(msg) ||
        (error as { code?: string }).code === "42501";
      return {
        data: { subscription: null, accessDenied },
        error: accessDenied ? null : new Error(msg),
      };
    }

    if (!data) {
      return {
        data: { subscription: null, accessDenied: false },
        error: null,
      };
    }

    const row = data as Record<string, unknown>;
    const subscription: SubscriptionRecord = {
      id: String(row.id),
      user_id: String(row.user_id),
      plan: (row.plan as string | null) ?? null,
      billing_cycle: (row.billing_cycle as string | null) ?? null,
      status: (row.status as string | null) ?? null,
      stripe_subscription_id:
        (row.stripe_subscription_id as string | null) ?? null,
      price_id: (row.price_id as string | null) ?? null,
      stripe_customer_id: (row.stripe_customer_id as string | null) ?? null,
      current_period_start: (row.current_period_start as string | null) ?? null,
      current_period_end: (row.current_period_end as string | null) ?? null,
      plan_metadata:
        row.plan_metadata &&
        typeof row.plan_metadata === "object" &&
        row.plan_metadata !== null
          ? (row.plan_metadata as Record<string, unknown>)
          : null,
      updated_at: (row.updated_at as string | null) ?? null,
    };

    return {
      data: { subscription, accessDenied: false },
      error: null,
    };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return { data: null, error: err };
  }
}

export type CustomerPortalResult =
  | { success: true; url: string }
  | { success: false; error: string };

/**
 * Stripe Customer Portal session (manage cards, invoices, cancel plan).
 * Requires authenticated Supabase session (Bearer forwarded by the client).
 */
export async function createCustomerPortalSession(): Promise<CustomerPortalResult> {
  const { data, error } = await supabase.functions.invoke("customer-portal", {
    body: {},
  });

  if (error) {
    return { success: false, error: error.message || "Could not open billing portal" };
  }

  const payload = data as { url?: string; error?: string } | null;
  if (payload?.error) {
    return { success: false, error: String(payload.error) };
  }
  const url = payload?.url;
  if (!url || typeof url !== "string") {
    return {
      success: false,
      error: "Billing portal did not return a URL. Try again or contact support.",
    };
  }

  return { success: true, url };
}
