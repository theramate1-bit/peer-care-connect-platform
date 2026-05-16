# Send test SMS (Infobip)

This repo sends transactional email via the Supabase Edge Function `send-email`. For SMS, we use the Supabase Edge Function `send-sms` (Infobip).

## Prerequisites

- Supabase Edge Function secrets configured:
  - `INFOBIP_API_KEY`
  - `INFOBIP_BASE_URL` (e.g. `https://eeekk1.api.infobip.com`)
  - `INFOBIP_SMS_FROM` (approved sender)
- `send-sms` deployed to Supabase.

## Invoke `send-sms`

The `send-sms` function requires an authenticated JWT (`verify_jwt = true` in `supabase/config.toml`).

Send a request with:

- `to`: E.164 number, e.g. `+447700900123`
- `text`: SMS content
- Optional `from`: overrides `INFOBIP_SMS_FROM`

Example payload:

```json
{
  "to": "+447700900123",
  "text": "Theramate test SMS"
}
```

If you want to invoke this from a script, you can use your Supabase client session JWT for the `Authorization: Bearer <jwt>` header.
