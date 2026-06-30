# Pre-deploy runbook

**Audience:** Release engineer / CTO before production deploy (web, edge functions, EAS).

## Automated gate (local or CI)

```bash
npm ci
npm run pre-deploy
```

Strict (requires `EXCHANGE_*` in `.env`):

```bash
PRE_DEPLOY_STRICT=1 npm run pre-deploy
```

GitHub: **Actions → Pre-deploy check → Run workflow** (`.github/workflows/pre-deploy.yml`).

### What `pre-deploy` runs

| Step                        | Command / check                              |
| --------------------------- | -------------------------------------------- |
| Secret scan config          | `.gitleaks.toml` exists                      |
| Legacy Supabase guard       | No new files under frozen tree               |
| Migration reconcile         | `RECONCILE_STRICT=1` (0 divergent filenames) |
| Edge manifest               | `supabase/functions` ↔ `manifest.json`       |
| Web lint + tsc + unit tests | `peer-care-connect`                          |
| Backend tests               | `backend`                                    |
| Mobile tsc + unit tests     | `theramate-ios-client`                       |
| Exchange dry-run            | RPC script (needs service role)              |
| Payment preflight           | Env + optional DB probe                      |
| Web build                   | `vite build`                                 |

## Manual gates (cannot fully automate)

| Gate                     | Reference                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------ |
| Apply pending migrations | `supabase db push` — includes `20260604120000_treatment_exchange_opt_in_supplement.sql` if not applied |
| Deploy edge functions    | `supabase/DEPLOY.md`, `npm run supabase:verify:functions`                                              |
| Maestro exchange UI      | `npm run test:maestro:exchange` (macOS: `bash scripts/run-maestro-exchange.sh`)                        |
| Device payment smoke     | `docs/testing/WAVE1_PROD_PAYMENT_SMOKE.md`                                                             |
| Sentry DSN live          | `docs/operations/OBSERVABILITY.md`                                                                     |
| Service role rotation    | `SECURITY_ROTATION_NOTE.md` if key was ever committed                                                  |

## Remote migration inventory (Wave B)

Export applied migrations from Dashboard → save as:

`docs/architecture/reports/remote-migrations-YYYY-MM-DD.txt`

Compare mentally to `npm run supabase:migrations:compare` (local files only).

## Rollback

- Web: Vercel instant rollback to prior deployment
- Edge: redeploy prior function version from Supabase Dashboard
- Mobile: EAS channel rollback / prior build in App Store Connect
- DB: **no** automatic rollback — forward-fix migrations only

## Secrets

[.github/SECRET_SETUP.md](../../.github/SECRET_SETUP.md)
