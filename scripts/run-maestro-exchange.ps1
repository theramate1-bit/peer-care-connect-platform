# Run treatment exchange Maestro flows (requires Maestro CLI + dev build on device/simulator).
# Loads EXCHANGE_* from repo root .env when present.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $Root ".env"

if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim().Trim('"').Trim("'")
      if ($name -match '^EXCHANGE_|^MAESTRO_') {
        Set-Item -Path "env:$name" -Value $value
      }
    }
  }
}

$required = @(
  "EXCHANGE_REQUESTER_EMAIL",
  "EXCHANGE_REQUESTER_PASSWORD",
  "EXCHANGE_RECIPIENT_EMAIL",
  "EXCHANGE_RECIPIENT_PASSWORD"
)
foreach ($k in $required) {
  if (-not (Get-Item "env:$k" -ErrorAction SilentlyContinue)) {
    Write-Host "Missing $k — set in $EnvFile (see .env.example)" -ForegroundColor Red
    exit 1
  }
}

if (-not (Get-Command maestro -ErrorAction SilentlyContinue)) {
  Write-Host "Maestro CLI not found. Install: https://maestro.mobile.dev/" -ForegroundColor Red
  exit 1
}

Push-Location (Join-Path $Root "theramate-ios-client")
try {
  Write-Host "Maestro: exchange-happy-path-requester" -ForegroundColor Cyan
  maestro test .maestro/exchange-happy-path-requester.yaml
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "Maestro: exchange-happy-path-recipient" -ForegroundColor Cyan
  maestro test .maestro/exchange-happy-path-recipient.yaml
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
