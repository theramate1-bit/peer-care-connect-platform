/**
 * Stripe Connect account status via Edge Function `stripe-payment`.
 */

import { supabase } from "@/lib/supabase";

export type ConnectAccountStatusPayload = {
  status: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  isFullyOnboarded: boolean;
  requirementsCurrentlyDue: string[];
  stripe_account_id: string | null;
};

export async function fetchConnectAccountStatus(userId: string): Promise<{
  data: ConnectAccountStatusPayload | null;
  notConnected: boolean;
  error: Error | null;
}> {
  try {
    const { data, error: fnErr } = await supabase.functions.invoke(
      "stripe-payment",
      {
        body: {
          action: "get-connect-account-status",
          user_id: userId,
        },
      },
    );
    if (fnErr) {
      return {
        data: null,
        notConnected: false,
        error: new Error(fnErr.message),
      };
    }
    const raw = data as Record<string, unknown> | null;
    if (!raw) {
      return { data: null, notConnected: true, error: null };
    }
    if (raw.error) {
      const msg = String(raw.error);
      if (
        /no stripe|not found|no account/i.test(msg) ||
        raw.details === "No Stripe account ID found"
      ) {
        return { data: null, notConnected: true, error: null };
      }
      return {
        data: null,
        notConnected: false,
        error: new Error(msg),
      };
    }
    return {
      data: {
        status: String(raw.status ?? "unknown"),
        chargesEnabled: Boolean(raw.chargesEnabled),
        payoutsEnabled: Boolean(raw.payoutsEnabled),
        detailsSubmitted: Boolean(raw.detailsSubmitted),
        isFullyOnboarded: Boolean(raw.isFullyOnboarded),
        requirementsCurrentlyDue: Array.isArray(raw.requirementsCurrentlyDue)
          ? (raw.requirementsCurrentlyDue as string[])
          : [],
        stripe_account_id:
          typeof raw.stripe_account_id === "string"
            ? raw.stripe_account_id
            : null,
      },
      notConnected: false,
      error: null,
    };
  } catch (e) {
    return {
      data: null,
      notConnected: false,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}

/**
 * Creates a Stripe Connect account (Accounts v2) for the signed-in user via Edge Function.
 * Requires a contact email for Stripe (auth email is typical).
 */
export async function createConnectAccount(params: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  businessType?: "individual" | "company";
}): Promise<
  | {
      ok: true;
      stripe_account_id: string | null;
      connect_account_id: string | null;
    }
  | { ok: false; error: string }
> {
  try {
    const { data, error: fnErr } = await supabase.functions.invoke(
      "stripe-payment",
      {
        body: {
          action: "create-connect-account",
          email: params.email,
          firstName: params.firstName ?? undefined,
          lastName: params.lastName ?? undefined,
          businessType: params.businessType ?? "individual",
          business_type: params.businessType ?? "individual",
        },
      },
    );
    if (fnErr) {
      return { ok: false, error: fnErr.message };
    }
    const raw = data as Record<string, unknown> | null;
    if (!raw || raw.error) {
      return {
        ok: false,
        error: String(
          raw?.error ?? raw?.details ?? "Could not create Connect account",
        ),
      };
    }
    const sid =
      typeof raw.stripe_account_id === "string" ? raw.stripe_account_id : null;
    const cid =
      typeof raw.connect_account_id === "string"
        ? raw.connect_account_id
        : null;
    return { ok: true, stripe_account_id: sid, connect_account_id: cid };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
