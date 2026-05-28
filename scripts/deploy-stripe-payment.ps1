# Deploy stripe-payment Edge Function (remote bundle — no Docker required).
# Requires: supabase login (supabase login) once on this machine.

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "Deploying stripe-payment to aikqnvltuwwgifuocvto ..."
npx --yes supabase@2.101.0 functions deploy stripe-payment --project-ref aikqnvltuwwgifuocvto
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Done. Dashboard: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/functions"
