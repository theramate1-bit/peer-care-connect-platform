/**
 * Stripe Connect embedded components — Account Session from `stripe-payment`.
 */

import { supabase } from "@/lib/supabase";

export async function createConnectAccountSession(params?: {
  stripeAccountId?: string;
}): Promise<{
  clientSecret: string | null;
  accountId: string | null;
  error: Error | null;
}> {
  try {
    const { data, error: fnErr } = await supabase.functions.invoke(
      "stripe-payment",
      {
        body: {
          action: "create-account-session",
          ...(params?.stripeAccountId
            ? { stripe_account_id: params.stripeAccountId }
            : {}),
        },
      },
    );
    if (fnErr) {
      return {
        clientSecret: null,
        accountId: null,
        error: new Error(fnErr.message),
      };
    }
    const raw = data as Record<string, unknown> | null;
    if (!raw || raw.error) {
      return {
        clientSecret: null,
        accountId: null,
        error: new Error(String(raw?.error ?? "No account session")),
      };
    }
    const cs = raw.client_secret;
    const aid = raw.account_id;
    return {
      clientSecret: typeof cs === "string" ? cs : null,
      accountId: typeof aid === "string" ? aid : null,
      error: null,
    };
  } catch (e) {
    return {
      clientSecret: null,
      accountId: null,
      error: e instanceof Error ? e : new Error(String(e)),
    };
  }
}
