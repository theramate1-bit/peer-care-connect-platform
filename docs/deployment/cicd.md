# CI/CD pipeline

**Canonical detail:** GitHub Actions in `.github/workflows/`.

## Workflows

| File                    | Triggers                             | Purpose                                                                                                                                                      |
| ----------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ci.yml`                | `main`, `develop`, PRs               | Web lint/typecheck/test/build; **platform drift check**; mobile typecheck/tests; backend tests; Gitleaks; Supabase checks; release gates on `main`/`develop` |
| `release-smoke.yml`     | Weekly Mon 08:00 UTC, `main`, manual | Migration reconcile report, edge function diff, payment preflight (with secrets)                                                                             |
| `pre-deploy.yml`        | Tags `v*.*.*`, manual                | Full `npm run pre-deploy` (lint, build, mobile, Supabase checks)                                                                                             |
| `security-audit.yml`    | Weekly, `main` pushes (deps), manual | npm audit, Trivy, Gitleaks, CycloneDX SBOM                                                                                                                   |
| `dependency-review.yml` | PRs                                  | GitHub dependency review                                                                                                                                     |

## Local parity before merge

```bash
npm ci
npm run lint --workspace=peer-care-connect
npm run typecheck:mobile
npm run test:mobile
npm run test:ci
npm run test:readiness   # release candidate
```

## Secrets (GitHub)

| Secret                           | Used by           |
| -------------------------------- | ----------------- |
| `TEST_SUPABASE_URL`              | Integration tests |
| `TEST_SUPABASE_ANON_KEY`         | Integration tests |
| `TEST_SUPABASE_SERVICE_ROLE_KEY` | Integration tests |

Integration tests **skip** when these are unset (forked PRs).

Full secret list: [.github/SECRET_SETUP.md](../../.github/SECRET_SETUP.md).

## Release gates on `main`

`npm run test:readiness` runs in CI after install at repo root (mobile + exchange dry-run).

## Path authority

See [CANONICAL_PATHS.md](../architecture/CANONICAL_PATHS.md).
