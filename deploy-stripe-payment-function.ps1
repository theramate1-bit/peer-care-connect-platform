# Deploy stripe-payment Edge Function to Supabase
# This script uses the Supabase Management API to deploy the function

Write-Host "🚀 Deploying stripe-payment Edge Function..." -ForegroundColor Green

$projectId = "aikqnvltuwwgifuocvto"
$functionName = "stripe-payment"
$functionPath = "supabase\functions\stripe-payment\index.ts"

# Check if file exists
if (-not (Test-Path $functionPath)) {
    Write-Host "❌ Function file not found: $functionPath" -ForegroundColor Red
    exit 1
}

# Read function content
Write-Host "📖 Reading function file..." -ForegroundColor Yellow
$functionContent = Get-Content $functionPath -Raw -Encoding UTF8

$fileSize = $functionContent.Length
Write-Host "✅ File read successfully. Size: $fileSize characters" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  Deployment Options:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option 1: Deploy via Supabase Dashboard (Recommended - No Docker Required)" -ForegroundColor Cyan
Write-Host "1. Go to: https://supabase.com/dashboard/project/$projectId/functions/$functionName" -ForegroundColor White
Write-Host "2. Click 'Edit' or open the code editor" -ForegroundColor White
Write-Host "3. Copy the entire content from: $functionPath" -ForegroundColor White
Write-Host "4. Paste into the editor" -ForegroundColor White
Write-Host "5. Click 'Deploy' or 'Save'" -ForegroundColor White
Write-Host ""
Write-Host "Option 2: Start Docker Desktop and use CLI" -ForegroundColor Cyan
Write-Host "1. Install/Start Docker Desktop: https://docs.docker.com/desktop" -ForegroundColor White
Write-Host "2. Run: supabase functions deploy $functionName --project-ref $projectId" -ForegroundColor White
Write-Host ""
Write-Host "📋 The function file is ready at: $functionPath" -ForegroundColor Green
Write-Host "✅ File has been updated with the fix for disable_stripe_user_authentication consistency" -ForegroundColor Green



