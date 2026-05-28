/**
 * Fails the build if Stripe secret keys would be exposed to the Vite client bundle.
 * Run from vite.config via import — checks process.env at build/dev server start.
 */

const FORBIDDEN_VITE_KEYS = [
  "VITE_STRIPE_SECRET_KEY",
  "VITE_STRIPE_WEBHOOK_SECRET",
];

export function assertStripeEnvSafe(env = process.env) {
  const errors = [];

  for (const key of FORBIDDEN_VITE_KEYS) {
    const value = env[key];
    if (value && String(value).trim()) {
      errors.push(
        `SECURITY: Remove ${key} from hosting/build env. Stripe secret keys must use Supabase Edge secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (no VITE_ prefix).`,
      );
    }
  }

  const publishable = String(env.VITE_STRIPE_PUBLISHABLE_KEY ?? "").trim();
  if (publishable.startsWith("sk_")) {
    errors.push(
      "SECURITY: VITE_STRIPE_PUBLISHABLE_KEY is a secret key (sk_*). Use pk_test_* or pk_live_* only on the frontend.",
    );
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}
