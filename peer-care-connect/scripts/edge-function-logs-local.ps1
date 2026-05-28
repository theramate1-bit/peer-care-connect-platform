# Serve Supabase Edge Functions locally and stream logs in this terminal.
# Requires: Docker Desktop installed and running.
# Usage: .\scripts\edge-function-logs-local.ps1
# Then trigger your flow (e.g. create product, payment, webhook); watch this window for logs until successful.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Starting Edge Functions (logs will appear below until you see success)..." -ForegroundColor Cyan
Write-Host "Trigger your flow from the app, then watch for 200/success." -ForegroundColor Gray
Write-Host ""

npx supabase functions serve --no-verify-jwt
