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
