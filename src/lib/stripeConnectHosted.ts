/**
 * Stripe-hosted Connect onboarding — parity with
 * `theramate-ios-client/lib/api/stripeConnect.ts` + `openConnectHostedOnboarding.ts`.
 */

import { supabase } from "@/integrations/supabase/client";

const DEFAULT_RETURN_PATH = "/onboarding/stripe-return";

export async function createConnectHostedOnboardingLink(params?: {
  stripeAccountId?: string;
  returnPath?: string;
}): Promise<{ url: string | null; error: string | null }> {
  try {
    const { data, error: fnErr } = await supabase.functions.invoke(
      "stripe-payment",
      {
        body: {
          action: "create-connect-hosted-onboarding-link",
          ...(params?.stripeAccountId
            ? { stripe_account_id: params.stripeAccountId }
            : {}),
          return_path: params?.returnPath ?? DEFAULT_RETURN_PATH,
        },
      },
    );
    if (fnErr) {
      return { url: null, error: fnErr.message };
    }
    const raw = data as Record<string, unknown> | null;
    if (!raw?.success || typeof raw.onboarding_url !== "string") {
      return {
        url: null,
        error: String(raw?.error ?? "No onboarding URL returned"),
      };
    }
    return { url: raw.onboarding_url, error: null };
  } catch (e) {
    return {
      url: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function connectOnboardingReturnPath(): string {
  return DEFAULT_RETURN_PATH;
}
