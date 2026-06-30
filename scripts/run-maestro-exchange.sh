#!/usr/bin/env bash
# Run treatment exchange Maestro flows (macOS/Linux). Loads EXCHANGE_* from repo .env.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source <(grep -E '^(EXCHANGE_|MAESTRO_)' "$ENV_FILE" | sed 's/\r$//')
  set +a
fi

for k in EXCHANGE_REQUESTER_EMAIL EXCHANGE_REQUESTER_PASSWORD \
         EXCHANGE_RECIPIENT_EMAIL EXCHANGE_RECIPIENT_PASSWORD; do
  if [[ -z "${!k:-}" ]]; then
    echo "Missing $k — set in $ENV_FILE (see .env.example)" >&2
    exit 1
  fi
done

if ! command -v maestro >/dev/null 2>&1; then
  echo "Maestro CLI not found. Install: https://maestro.mobile.dev/" >&2
  exit 1
fi

cd "$ROOT/theramate-ios-client"
echo "Maestro: exchange-happy-path-requester"
maestro test .maestro/exchange-happy-path-requester.yaml
echo "Maestro: exchange-happy-path-recipient"
maestro test .maestro/exchange-happy-path-recipient.yaml
