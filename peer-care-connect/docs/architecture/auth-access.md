# Web auth & access (canonical)

## Source of truth

| Concern | Module |
|--------|--------|
| Session boot | `AuthContext` + `auth-bootstrap.ts` (modules in `peer-care-connect/src/lib/`) |
| Supabase client | `integrations/supabase/client.ts` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) |
| Subscription gate | `SubscriptionContext` + `resolveRouteGuard()` |
| Profile SWR | `auth-profile-cache.ts` |
| Navigation policy | `access-policy.ts` → `resolveAccess()` |
| Post-login redirect | `getPostAuthRedirectPath()` → `resolveSafeRedirectTarget()` |
| Route wrapper | `SimpleProtectedRoute` → `resolveRouteGuard()` (subscription only here) |
| Public path list | `auth-routes.ts` |
| Onboarding rules | `dashboard-routing.ts` → `shouldRedirectToOnboarding()` |
| Home route | `dashboard-routing.ts` → `getDashboardRoute()` |

## Tests

- Unit: `src/lib/__tests__/access-policy.test.ts`
- E2E smoke: `npm run test:e2e:auth` → `playwright.auth.config.ts` (always starts Vite; ignores shell `PLAYWRIGHT_SKIP_WEBSERVER`) → `tests/e2e/auth-boot.spec.ts`

## Role routing model

- **Client:** `/client/*` + universal paths; blocked from practitioner-only prefixes.
- **Practitioner:** all app paths except `/client/*` and `/admin/*` (subscription in route guard).
- **Admin:** `/admin/*` home = `/admin/verification`.

## Profile-optional paths (session only)

- `/auth/callback`, `/auth/oauth-completion` — render before `public.users` row loads.

## Redirect safety

- `?redirect=` and `state.from` are validated with `resolveAccess()`; wrong-role paths fall back to role home.
