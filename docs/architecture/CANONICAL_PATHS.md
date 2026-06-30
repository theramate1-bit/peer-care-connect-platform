# Canonical repository paths

**Last updated:** 2026-06-04  
**Audience:** Engineers, agents, CI — use this when docs link to the wrong tree.

## Summary

| Concern                     | Canonical path                                      | Notes                                                  |
| --------------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| **Web app (deployed)**      | `peer-care-connect/` (Vite) + **`src/`** (features) | Build merges both via `vite.config.ts` `@/` resolution |
| **Mobile app**              | `theramate-ios-client/`                             | Expo Router; `npm run typecheck:mobile` from repo root |
| **Postgres migrations**     | **`supabase/migrations/`**                          | Only add new SQL here                                  |
| **Edge functions (deploy)** | **`supabase/functions/`**                           | Deploy from repo root; see function list in dashboard  |
| **Legacy Supabase tree**    | `peer-care-connect/supabase/`                       | **Frozen** — historical only; see `README` there       |
| **Shared TS package**       | `packages/user-preferences/`                        | Used by web + mobile                                   |
| **Backend unit tests**      | `backend/tests/`                                    | Jest; not the production API layer                     |
| **Release gates**           | `npm run test:readiness`                            | Mobile typecheck + tests + exchange dry-run            |
| **Package manager**         | **npm** (workspaces)                                | Root `package-lock.json`; do not use yarn for installs |

## Web dual-tree model

```
peer-care-connect/          ← Vite shell, routing (AppContent), legacy pages
  src/                      ← ~795 files
../src/                     ← ~147 files, newer parity features (@web)
```

- **Import rule:** Files under repo-root `src/` use `@/` → resolves to `src/` first when importer is in that tree (see `webAwareAtAlias` in `peer-care-connect/vite.config.ts`).
- **When fixing a bug:** grep the **basename** across both trees; prefer implementing in **`src/`** if the feature is documented as web parity.

## Supabase

- **Apply migrations:** `supabase db push` / CI lint from **`supabase/migrations/`** only.
- **Do not** add new files under `peer-care-connect/supabase/migrations/`.
- **Inventory:** `node scripts/compare-supabase-migrations.mjs` (root vs legacy counts + filename diff).

## CI (GitHub Actions)

| Workflow                               | Scope                                                                               |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`             | Web lint/test/build, mobile, backend, gitleaks, supabase lint, release gates (main) |
| `.github/workflows/security-audit.yml` | Weekly npm audit, Trivy, Gitleaks, SBOM                                             |

## Ops scripts

| Use                     | Path                                                           |
| ----------------------- | -------------------------------------------------------------- |
| Email edge diagnostic   | `node scripts/test-email-with-service-key.mjs` (env only)      |
| Legacy one-off scripts  | `scripts/legacy/` (quarantined; may contain outdated patterns) |
| Payment smoke checklist | `npm run test:payment-smoke:check`                             |

## Observability (optional env)

See [operations/OBSERVABILITY.md](../operations/OBSERVABILITY.md).

| Platform        | Variable                                            |
| --------------- | --------------------------------------------------- |
| Web             | `VITE_SENTRY_DSN`                                   |
| Mobile          | `EXPO_PUBLIC_SENTRY_DSN`                            |
| EAS native maps | `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` |

## CI guards

| Script                                  | Purpose                                                      |
| --------------------------------------- | ------------------------------------------------------------ |
| `npm run supabase:guard-legacy`         | Fail if new files under frozen `peer-care-connect/supabase/` |
| `npm run supabase:migrations:compare`   | Inventory canonical vs legacy migrations                     |
| `npm run supabase:migrations:reconcile` | Reconciliation report (flags divergent same-name SQL)        |
| `npm run supabase:functions:compare`    | Edge function folder diff                                    |
| `npm run supabase:verify:functions`     | Disk vs `supabase/functions/manifest.json`                   |
| `npm run pre-deploy`                    | Full automated pre-release checklist                         |
| `npm run check:platform-drift`          | Web `src/lib` vs mobile shared module parity                 |
| `npm run check:ui-hierarchy`            | Web nav/sidebar/breadcrumb hrefs → `AppContent` routes       |
| `npm run check:route-inventory`         | Expo `app/` screens ↔ web route parity map                   |
| `npm run check:mobile-chrome`           | Mobile `AppScreen`/`TabScreen` must use shared headers       |
| `npm run check:deep-link-routes`        | `deepLinking.ts` pathnames → Expo `app/` screen files        |
| `npm run check:hierarchy`               | All four hierarchy guards above (strict)                     |

## Doc drift guardrail

Older docs may link to `peer-care-connect/src/...` only. If the link 404s, search repo-wide for the **filename** or read [Clinic, mobile & hybrid flows](../features/clinic-mobile-hybrid-flows.md).
