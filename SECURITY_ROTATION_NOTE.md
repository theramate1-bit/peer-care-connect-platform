# Security rotation note (2026-06-04)

A **service role JWT fallback** was removed from `test-email-with-service-key.js` (file deleted).

**Recommended action:** In [Supabase Dashboard](https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/settings/api) → **service_role** key → **Rotate** if that key was ever valid or used in production.

After rotation, update:

- Local `.env` → `SUPABASE_SERVICE_ROLE_KEY`
- GitHub Actions secrets → `TEST_SUPABASE_SERVICE_ROLE_KEY`
- Supabase Edge Function secrets (auto-injected for `SUPABASE_SERVICE_ROLE_KEY`)

Use the env-only diagnostic:

```bash
node scripts/test-email-with-service-key.mjs
```
