/**
 * Fails the build if Stripe secret keys would be exposed to the Vite client bundle.
 * Local copy for Vercel when Root Directory is peer-care-connect (monorepo copy lives at ../scripts/).
 */

const FORBIDDEN_VITE_KEYS = [
  "VITE_STRIPE_SECRET_KEY",
  "VITE_STRIPE_WEBHOOK_SECRET",
];

const FORBIDDEN_VITE_VALUE_PREFIXES = ["sk_", "whsec_", "rk_"];

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

  for (const [key, raw] of Object.entries(env)) {
    if (!key.startsWith("VITE_")) continue;
    const value = String(raw ?? "").trim();
    if (!value) continue;
    if (FORBIDDEN_VITE_VALUE_PREFIXES.some((p) => value.startsWith(p))) {
      errors.push(
        `SECURITY: ${key} contains a secret value (${value.slice(0, 8)}…). VITE_* vars are public in the client bundle — use pk_* only or unset.`,
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
