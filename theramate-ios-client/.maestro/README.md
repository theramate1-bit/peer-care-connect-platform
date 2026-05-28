# Maestro E2E — Treatment exchange (mobile)

Requires [Maestro](https://maestro.mobile.dev/) and a simulator/device with the Theramate dev build installed.

## Environment

Set in your shell before running:

```bash
export EXCHANGE_REQUESTER_EMAIL="..."
export EXCHANGE_REQUESTER_PASSWORD="..."
export EXCHANGE_RECIPIENT_EMAIL="..."
export EXCHANGE_RECIPIENT_PASSWORD="..."
```

Use two **staging** practitioner accounts in the same rating tier with `treatment_exchange_opt_in = true` and enough credits.

## Flows

| Flow                   | File                                 | Purpose                                                                           |
| ---------------------- | ------------------------------------ | --------------------------------------------------------------------------------- |
| Happy path (requester) | `exchange-happy-path-requester.yaml` | Sign in → Exchange → Discover → send request                                      |
| Happy path (recipient) | `exchange-happy-path-recipient.yaml` | Sign in → accept → **Choose date and time** → slot (`exchange-choose-reciprocal`) |
| Reschedule cap         | `exchange-reschedule-cap.yaml`       | Recipient reschedules until cap message                                           |

RPC-level staging tests (no UI): from repo root run `npm run test:exchange:e2e`.

## Run

From repo root (loads `EXCHANGE_*` from `.env`):

```powershell
npm run verify:exchange:staging
npm run test:maestro:exchange
```

Or manually:

```bash
cd theramate-ios-client
maestro test .maestro/exchange-happy-path-requester.yaml
maestro test .maestro/exchange-happy-path-recipient.yaml
```

Adjust `appId` in each YAML to match your Expo dev client or EAS build bundle id.
