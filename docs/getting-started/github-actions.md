# GitHub Actions setup

CI runs on every PR to `main` / `develop`. Configure repository secrets before expecting green integration or release-smoke jobs.

## Quick setup

1. Open [`.github/SECRET_SETUP.md`](../../.github/SECRET_SETUP.md).
2. Add `TEST_SUPABASE_*` for integration tests.
3. Add `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for weekly `release-smoke.yml` payment probes.

## Local parity

```bash
npm ci
npm run typecheck:mobile
npm run test:mobile
npm run supabase:migrations:reconcile
npm run test:readiness
```

## Workflows

| Workflow             | When                                    |
| -------------------- | --------------------------------------- |
| `ci.yml`             | Every push/PR                           |
| `release-smoke.yml`  | Monday 08:00 UTC, `main` pushes, manual |
| `security-audit.yml` | Weekly + dependency changes             |

See [deployment/cicd.md](../deployment/cicd.md).
