# Supabase deploy — canonical paths only

**Project:** `aikqnvltuwwgifuocvto`  
**Do not deploy** from `peer-care-connect/supabase/` (frozen legacy).

## Migrations

```bash
# From repo root
supabase db push
# or link + migration up per your runbook
```

New SQL only in `supabase/migrations/`.

## Edge functions (canonical)

Deploy from `supabase/functions/`:

| Function                                                | Purpose                                   |
| ------------------------------------------------------- | ----------------------------------------- |
| `stripe-payment`                                        | Checkout, mobile capture/release, Connect |
| `stripe-webhooks`                                       | Stripe webhook handler                    |
| `verify-checkout`                                       | Post-checkout subscription verification   |
| `send-email`                                            | Transactional email                       |
| `send-booking-notification`                             | Booking notification fan-out              |
| `send-sms`                                              | SMS via Infobip                           |
| `customer-portal`                                       | Stripe billing portal                     |
| `mobile-payment` / `mobile-payment-v2`                  | Mobile payment helpers                    |
| `auth-gateway`                                          | Auth-related gateway                      |
| `google-calendar-sync`                                  | Calendar sync                             |
| `soap-notes` / `ai-soap-transcribe` / `transcribe-file` | Clinical notes / voice                    |
| `notify-guest-message`                                  | Guest messaging                           |
| `report-export`                                         | Exports                                   |
| `location-proxy`                                        | Geocoding proxy                           |
| `ensure-qualifications-bucket`                          | Storage bootstrap                         |
| `cleanup-recordings`                                    | Recording cleanup                         |

List on disk: `ls supabase/functions`

```bash
npx supabase functions deploy <name> --project-ref aikqnvltuwwgifuocvto
```

Root `package.json` includes helpers for common deploys (`deploy:stripe-payment`, etc.).

### Legacy name mapping (do not deploy from `peer-care-connect/supabase/functions/`)

| Legacy folder      | Canonical deploy                               |
| ------------------ | ---------------------------------------------- |
| `stripe-webhook`   | `stripe-webhooks`                              |
| `create-checkout`  | use `stripe-payment` / `verify-checkout` flows |
| `get-subscription` | `customer-portal` / `verify-checkout`          |

Run `npm run supabase:functions:compare` before deploy.

**Checkout return paths:** `supabase/functions/_shared/hosted-checkout-paths.ts` must match `src/lib/hostedCheckoutPaths.ts` (`npm run check:platform-drift`).

## Inventory

```bash
npm run supabase:migrations:compare
npm run supabase:verify:functions
npm run supabase:guard-legacy
npm run pre-deploy
```
