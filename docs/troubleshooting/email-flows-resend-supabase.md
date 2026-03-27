# Email flows: Resend, Supabase, MCP

## Production flow

- **Booking confirmations**: Stripe `payment_intent.succeeded` → `stripe-webhooks` Edge Function → `send-email` Edge Function → Resend API. Logged to `email_logs` (see below).
- **Guest message notification**: Practitioner sends message in app → `notify-guest-message` Edge Function (if recipient is guest) → `send-email` → Resend API. Logged to `email_logs`.
- **MCP**: Resend MCP (`send-email` tool) is for development/testing. Production transactional email goes through Supabase Edge Functions only.

## Configuration

- **Resend**: Set `RESEND_API_KEY` and optionally `RESEND_FROM_EMAIL` in Supabase Edge Function secrets for `send-email` (and ensure `SITE_URL` is set for links).
- **Stripe webhook**: Ensure `stripe-webhooks` has `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `STRIPE_WEBHOOK_SECRET`.

## Logging and debugging

- All sends via `send-email` are logged to `public.email_logs` with `email_type`, `recipient_email`, `resend_email_id`, `status` (`sent` / `failed`), `sent_at`, and `metadata`.
- To verify delivery: query `email_logs` by `email_type`, `recipient_email`, or `sent_at`; use `resend_email_id` in the Resend dashboard for delivery status.
- Stripe webhook logs: "Booking emails invoked for session &lt;sessionId&gt;" after calling `sendBookingConfirmationEmails`; correlate with `email_logs.metadata->sessionId` or `email_logs.email_type = 'booking_confirmation_client'`.

## Guest booking view link

- Confirmation email "View Booking Details" uses a token-based URL: `/booking/view/:sessionId?token=...`. Token is set on `client_sessions.guest_view_token` when payment completes. No login required; validated via RPC `get_session_by_guest_token`.
