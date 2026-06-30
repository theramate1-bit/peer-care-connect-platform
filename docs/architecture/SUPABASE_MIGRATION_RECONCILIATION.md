# Supabase migration reconciliation plan

**Project:** `aikqnvltuwwgifuocvto`  
**Status:** In progress — local trees diverge; remote list requires Dashboard or CLI with project access.

## Problem

| Tree                                     | Files | Role                          |
| ---------------------------------------- | ----- | ----------------------------- |
| `supabase/migrations/`                   | 111   | **Canonical** — only add here |
| `peer-care-connect/supabase/migrations/` | 252   | **Frozen legacy**             |

### Resolved (2026-06-04): `20251229_add_treatment_exchange_opt_in`

| Action                        | Path                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------- |
| Canonical column (idempotent) | `supabase/migrations/20251229_add_treatment_exchange_opt_in.sql`              |
| Index + comment supplement    | `supabase/migrations/20260604120000_treatment_exchange_opt_in_supplement.sql` |
| Legacy duplicate removed      | `peer-care-connect/.../20251229_*.sql` → `.ARCHIVED` marker                   |

Apply supplement on remote:

```bash
supabase db push   # or apply 20260604120000_* via Dashboard
```

## Edge functions

Canonical deploy path: `supabase/functions/` (see `supabase/DEPLOY.md`).

```bash
npm run supabase:functions:compare
```

Legacy folder has many functions (e.g. `create-checkout`, `stripe-webhook`) that may map to renamed canonical ones (`verify-checkout`, `stripe-webhooks`). Do not deploy from legacy without explicit mapping.

## Waves

### Wave A — Stop the bleed (done)

- [x] CI blocks **new** files under `peer-care-connect/supabase/`
- [x] README freeze markers
- [x] `npm run supabase:migrations:compare` / `reconcile`

### Wave B — Remote inventory (you)

1. Supabase Dashboard → Database → Migrations, or `supabase migration list --linked`
2. Save export to `docs/architecture/reports/remote-migrations-YYYY-MM-DD.txt`
3. Tag each legacy-only file: **applied** | **superseded** | **unknown**

### Wave C — Divergent file resolution

- [x] `20251229_add_treatment_exchange_opt_in` — merged into canonical + supplement; legacy SQL removed
- [ ] Remaining legacy-only files — inventory only (no auto-delete)

### Wave D — Legacy archive (optional)

Move entire `peer-care-connect/supabase/migrations/` to `archive/peer-care-connect-supabase-migrations/` in a dedicated PR (no SQL edits) so grep/docs stop pointing at active paths.

## Automation

| Command                                 | Output                                             |
| --------------------------------------- | -------------------------------------------------- |
| `npm run supabase:migrations:reconcile` | Markdown report under `docs/architecture/reports/` |
| `npm run supabase:functions:compare`    | Console diff of function names                     |
| `npm run supabase:guard-legacy`         | Fail on new legacy files in git diff               |

## MCP note

If Supabase MCP returns access errors, use Dashboard or CLI with a logged-in account that owns the project.
