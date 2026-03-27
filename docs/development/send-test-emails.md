# Send all transactional email previews

**Production behaviour:** With `sessionId` in the payload, [`send-email` enriches from the database](email-data-enrichment.md) so real location, practitioner, and session fields appear even if the caller omitted them.

## Option A — Full HTML via Resend only (no Supabase)

Uses the same template code as production (`_email-templates.ts` + MJML layout). Requires **`RESEND_API_KEY`** (and Deno).

```bash
cd supabase/functions/send-email
deno run -A --env-file=../../../.env preview-send-all-resend.ts theramate1@gmail.com
```

Env: `RESEND_API_KEY`, optional `RESEND_FROM_EMAIL`, `SITE_URL`, `SEND_TEST_EMAIL_DELAY_MS`.

Subjects are prefixed `[Full HTML N/21]` so you can tell them apart from old MCP stubs.

## Option B — Via deployed Edge Function

From the repo root, with **`.env`** containing `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`:

```bash
node scripts/send-all-test-emails.mjs you@example.com
# or
npm run email:send-all-previews -- you@example.com
```

Optional: `SEND_TEST_EMAIL_DELAY_MS=900` to reduce Resend rate limits.

## Option C — Pre-built JSON payloads (Node + Resend API)

After generating HTML and MCP payloads (Deno `emit-all-html.ts` + `node scripts/build-mcp-email-json.mjs`), send all 21 full-HTML emails in one go:

```bash
# From repo root; set key from env or your secrets manager
set RESEND_API_KEY=re_...
node scripts/send-all-email-previews.mjs
```

Optional: `SEND_DELAY_MS=700` between sends (default 650). Payloads live under `.email-dumps/mcp-payloads/1.json` … `21.json` (same shape as Resend MCP `send-email`).

## Template layout note

Transactional bodies use **shared GitHub-style partials** inside [`supabase/functions/send-email/index.ts`](../supabase/functions/send-email/index.ts): neutral card, `#0969da` CTAs, system fonts. The outer **MJML layout** ([`_layout-compiled.ts`](../supabase/functions/send-email/_layout-compiled.ts)) is unchanged.
