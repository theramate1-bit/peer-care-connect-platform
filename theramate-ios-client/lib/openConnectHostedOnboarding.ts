import { APP_CONFIG } from "@/constants/config";
import { createConnectHostedOnboardingLink } from "@/lib/api/stripeConnect";
import { HOSTED_CHECKOUT_PATHS } from "@/lib/hostedCheckoutPaths";
import { openHostedWebSession } from "@/lib/openHostedWeb";

/**
 * Open Stripe-hosted Connect onboarding (Account Links). No publishable key required.
 */
export async function openConnectHostedOnboarding(params?: {
  stripeAccountId?: string;
  returnPath?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const returnPath =
    params?.returnPath ?? HOSTED_CHECKOUT_PATHS.connectStripeReturn;
  const { url, error } = await createConnectHostedOnboardingLink({
    stripeAccountId: params?.stripeAccountId,
    returnPath,
  });
  if (error || !url) {
    return { ok: false, error: error?.message ?? "Could not start onboarding" };
  }
  openHostedWebSession({
    kind: "stripe_checkout",
    url,
  });
  return { ok: true };
}

/** Default return path after Connect onboarding on web (matches APP_URL). */
export function connectOnboardingReturnPath(): string {
  return HOSTED_CHECKOUT_PATHS.connectStripeReturn;
}

export function connectOnboardingReturnUrl(): string {
  const base =
    APP_CONFIG.WEB_URL.replace(/\/$/, "") || "https://theramate.co.uk";
  return `${base}${connectOnboardingReturnPath()}`;
}
