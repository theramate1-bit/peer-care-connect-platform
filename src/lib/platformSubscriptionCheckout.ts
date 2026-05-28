/**
 * Platform practitioner subscription — parity with
 * `theramate-ios-client/lib/api/platformSubscriptionCheckout.ts`.
 */

import { supabase } from "@/integrations/supabase/client";

export type PlatformSubscriptionCheckoutResult =
  | { success: true; checkoutUrl: string; checkoutSessionId: string }
  | { success: false; error: string };

export async function createPlatformSubscriptionCheckout(
  priceId: string,
): Promise<PlatformSubscriptionCheckoutResult> {
  const { data, error } = await supabase.functions.invoke("stripe-payment", {
    body: {
      action: "create-platform-subscription-checkout",
      price_id: priceId,
    },
  });

  if (error) {
    return {
      success: false,
      error: error.message || "Could not start subscription checkout",
    };
  }

  const payload = data as {
    checkout_url?: string;
    checkout_session_id?: string;
    error?: string;
  } | null;

  if (payload?.error) {
    return { success: false, error: String(payload.error) };
  }

  const checkoutUrl = payload?.checkout_url;
  if (!checkoutUrl || typeof checkoutUrl !== "string") {
    return {
      success: false,
      error: "Checkout did not return a URL. Deploy stripe-payment if needed.",
    };
  }

  return {
    success: true,
    checkoutUrl,
    checkoutSessionId: String(payload.checkout_session_id ?? ""),
  };
}

export async function verifyPlatformSubscriptionCheckout(
  checkoutSessionId: string,
): Promise<{ success: boolean; error: string | null }> {
  const id = checkoutSessionId.trim();
  if (!id.startsWith("cs_")) {
    return { success: false, error: "Invalid checkout session id" };
  }
  try {
    const { data, error } = await supabase.functions.invoke("verify-checkout", {
      body: { checkout_session_id: id },
    });
    if (error) {
      return { success: false, error: error.message };
    }
    const payload = data as { success?: boolean; error?: string } | null;
    if (payload?.error) {
      return { success: false, error: String(payload.error) };
    }
    return { success: payload?.success === true, error: null };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
