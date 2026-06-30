# Security architecture

High-level model for Theramate / Peer Care Connect. For reporting vulnerabilities see [SECURITY.md](../../SECURITY.md).

## Layers

| Layer                   | Control                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Client (web/mobile)** | Supabase anon key only; RLS enforces access; Stripe via hosted checkout / edge functions |
| **Edge functions**      | Service role, Stripe/Resend secrets in Supabase dashboard only                           |
| **Postgres**            | Row Level Security on user-facing tables; business rules in RPCs                         |
| **CI**                  | Gitleaks on every PR; Trivy + npm audit on schedule                                      |

## Secrets discipline

- Never commit `SUPABASE_SERVICE_ROLE_KEY`, `sk_*`, or `whsec_*`.
- Never add `VITE_*` or `EXPO_PUBLIC_*` vars for server secrets.
- Use `node scripts/test-email-with-service-key.mjs` with `.env` locally — no in-repo JWT fallbacks.

If a service role key was ever committed, **rotate** it in Supabase Dashboard → Settings → API.

## Stripe

Hosted Checkout only in production clients. Build-time guard: `scripts/stripe-env-guard.mjs` (Vite plugin). See `docs/product/STRIPE_HOSTED_CHECKOUT_ONLY.md`.

## Error tracking

Optional Sentry DSNs (`VITE_SENTRY_DSN`, `EXPO_PUBLIC_SENTRY_DSN`). Wired in `peer-care-connect/src/lib/errorTracking.ts` and `theramate-ios-client/lib/errorTracking.ts`.

## Related docs

- [CANONICAL_PATHS.md](./CANONICAL_PATHS.md)
- [Supabase MCP live reference](./supabase-mcp-live-reference.md)
- [CI/CD](../deployment/cicd.md)
