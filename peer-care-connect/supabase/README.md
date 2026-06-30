# Legacy Supabase directory — frozen

**Do not add new migrations or edge functions here.**

| Use instead    | Path                                                       |
| -------------- | ---------------------------------------------------------- |
| Migrations     | [`../../supabase/migrations/`](../../supabase/migrations/) |
| Edge functions | [`../../supabase/functions/`](../../supabase/functions/)   |
| Config         | [`../../supabase/config.toml`](../../supabase/config.toml) |

This tree is **historical** (252 migrations, older edge functions). Production deploys should use the **repo-root** `supabase/` folder.

Compare inventories: `npm run supabase:migrations:compare`  
Reconcile (strict in CI): `npm run supabase:migrations:reconcile`

Duplicate filenames under this folder must not be reintroduced — use `.ARCHIVED` markers if documenting removals.

See [docs/architecture/CANONICAL_PATHS.md](../../docs/architecture/CANONICAL_PATHS.md).
