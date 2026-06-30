# Legacy operational scripts

One-off diagnostics moved from the repo root (2026-06-04). **Not maintained for CI.**

- Prefer documented commands under `scripts/` and `npm run` in root `package.json`
- **Do not** add secrets or service-role JWT fallbacks to files here
- Email test with env only: `node scripts/test-email-with-service-key.mjs`

SQL batches (`batch*.sql`) are archival; do not run against production without review.
