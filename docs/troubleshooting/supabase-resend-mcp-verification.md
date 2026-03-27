# Supabase & Resend MCP Verification

This doc records verification done via **Supabase MCP**, **Resend MCP**, and **Supabase CLI** for email and booking flows, and how to keep them aligned.

---

## Deployments (done)

- **send-email** – Deployed via `supabase functions deploy send-email --project-ref aikqnvltuwwgifuocvto`. **Version 38**, JWT verification **on** (callers must pass `Authorization: Bearer <key>`; stripe-webhooks uses service role key).
- **stripe-webhooks** – Deployed via `supabase functions deploy stripe-webhooks --project-ref aikqnvltuwwgifuocvto --no-verify-jwt`. **Version 43**, JWT verification **off** (Stripe sends webhook with signature only). Includes `sendBookingConfirmationEmails` on `payment_intent.succeeded`.

---

## 1. Supabase MCP verification (done)

- **Tool used:** `list_projects` → `list_edge_functions` → `get_edge_function` (server: **user-supabase**).
- **Project:** `aikqnvltuwwgifuocvto` (“theramate1@gmail.com's Project”), region `eu-west-2`, status **ACTIVE_HEALTHY**.

### Edge functions relevant to emails and booking

| Function              | Status | Notes                                                                                                                                                                 |
| --------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **send-email**        | ACTIVE | Entrypoint from this repo: `peer-care-connect/supabase/functions/send-email/index.ts`. Used for all transactional emails via Resend.                                  |
| **stripe-webhook**    | ACTIVE | Linked to repo; handles Stripe events.                                                                                                                                |
| **stripe-webhooks**   | ACTIVE | Plural name; may be older deploy from `C:\tmp`. Ensure the **repo** version (with `sendBookingConfirmationEmails` on `payment_intent.succeeded`) is the one deployed. |
| **process-reminders** | ACTIVE | Sends session reminders; should pass `sessionLocation` and `directionsUrl` when calling send-email so “Get Directions” works in reminder emails.                      |

### Deployed send-email vs repo

- The **deployed** `send-email` (fetched via `get_edge_function`) may be a different revision (e.g. EmailDesign-based templates).
- This **repo** contains the template fixes for:
  - **booking_confirmation_client:** Location + “Get Directions” when `sessionLocation` and `directionsUrl` are set.
  - **booking_confirmation_practitioner:** “Session location / Visit address” + “Get Directions” when set.
  - **session_reminder_24h / 1h:** “Get Directions” only when `sessionLocation` and `directionsUrl` are present (no `href="#"`).

To get these fixes live, **redeploy** the repo’s `send-email` (and optionally `stripe-webhooks`) to the project, e.g.:

- Supabase Dashboard → Edge Functions → send-email → Deploy from repo, or
- CLI: `supabase functions deploy send-email --project-ref aikqnvltuwwgifuocvto` (from the repo that contains the fixes).

---

## 2. Resend MCP verification (done)

- **Tool used:** `list-audiences` (server: **user-resend**).
- **Result:** One audience: **General** (id: `f44f7238-e861-4bbf-bfd0-dfcfc8d712f2`).

### Email alignment

- **Supabase send-email** uses the Resend API (via `RESEND_API_KEY` in Edge Function secrets). It does **not** call the Resend MCP directly; the MCP is for ad‑hoc sends (e.g. testing) or checking audiences.
- **Alignment checklist:**
  1. **Resend dashboard:** Ensure the “From” domain used by the app (e.g. `noreply@theramate.co.uk`) is verified.
  2. **Supabase secrets:** For Edge Function `send-email`, set `RESEND_API_KEY` (and optionally `RESEND_FROM_EMAIL`).
  3. **Test send via Resend MCP (done):** A test email was sent with **user-resend** `send-email`: `from: onboarding@resend.dev`, `to: delivered@resend.dev`, subject “Theramate send-email alignment test”. **Result:** Email sent successfully (Resend id: `6460a695-ce4c-449a-a027-069fa329dec4`). This confirms the same Resend account used by the MCP can deliver mail; ensure Supabase `send-email` has `RESEND_API_KEY` from this account.

---

## 3. Booking confirmation flow (stripe-webhooks → send-email)

- On **payment_intent.succeeded** with `metadata.session_id`, **stripe-webhooks** (repo version):
  1. Updates `payments` and `client_sessions`.
  2. Calls **sendBookingConfirmationEmails(sessionId)** which loads session + practitioner, sets `sessionLocation` from practitioner `location` and `directionsUrl` (Google Maps link), and invokes the **send-email** Edge Function for `booking_confirmation_client` and `booking_confirmation_practitioner` with `Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY`.
- Ensure **stripe-webhooks** is deployed from this repo so this logic runs in production. Webhook URL: `https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/stripe-webhooks` (or `stripe-webhook` if that’s the one connected in Stripe).

---

## 4. Quick reference – MCP tools used

| Server            | Tool                  | Purpose                                                       |
| ----------------- | --------------------- | ------------------------------------------------------------- |
| **user-supabase** | `list_projects`       | Get project ID for theramate.                                 |
| **user-supabase** | `list_edge_functions` | List send-email, stripe-webhooks, etc.                        |
| **user-supabase** | `get_edge_function`   | Inspect deployed send-email code.                             |
| **user-resend**   | `list-audiences`      | List Resend audiences.                                        |
| **user-resend**   | `send-email`          | Send a test email (requires `to`, `subject`, `text`, `from`). |

---

## 5. Stripe webhook

- **Stripe MCP** does not expose webhook endpoints (search/list tools are for customers, payment_intents, charges, invoices, prices, products, subscriptions). Configure in Stripe Dashboard:
  - **Endpoint URL:** `https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/stripe-webhooks`
  - **Events:** Include `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.succeeded`, `charge.refunded`, `charge.dispute.created`, `transfer.created`, `payout.paid`, `payout.failed`, `account.updated` (or the set your app uses).
  - **Webhook signing secret:** Set as `STRIPE_WEBHOOK_SECRET` in Supabase Edge Function secrets for `stripe-webhooks`.

---

## 6. MCP test run (Supabase + Resend)

Tests run via **Supabase MCP** and **Resend MCP** to confirm alignment and that nothing is blocking.

### Supabase MCP

| Test                                                     | Result                                                                                                                                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **list_edge_functions** (project `aikqnvltuwwgifuocvto`) | OK. **send-email** v38 ACTIVE (verify_jwt: true). **stripe-webhooks** v43 ACTIVE (verify_jwt: false).                                                                                 |
| **get_logs** (service: `edge-function`, last 24h)        | OK. Logs show stripe-webhook, stripe-payment, sync-stripe-subscription, create-checkout. No recent send-email invocations in the window (expected unless a booking confirmation ran). |

**Conclusion:** Edge functions are deployed and active. No need to block or change code based on these checks.

### Resend MCP

| Test                                                                   | Result                                                          |
| ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| **list-audiences**                                                     | OK. One audience: "General".                                    |
| **send-email** (from: onboarding@resend.dev, to: delivered@resend.dev) | **Success.** Resend id: `a8925d1e-6d8d-45a5-91b2-f40302f3dfc0`. |

**Conclusion:** Resend is not blocking; delivery works. Supabase send-email uses the same Resend API (RESEND_API_KEY); ensure that key is set in Edge Function secrets so Supabase can send. No need to block code based on these checks.

---

_Last updated: March 2025_
