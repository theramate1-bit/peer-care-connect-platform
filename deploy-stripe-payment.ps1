# Deploy stripe-payment Edge Function to Supabase
# This script attempts multiple deployment methods

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying stripe-payment Edge Function..." -ForegroundColor Green
Write-Host ""

$projectId = "aikqnvltuwwgifuocvto"
$functionName = "stripe-payment"
$functionPath = "supabase\functions\stripe-payment\index.ts"

# Check if file exists
if (-not (Test-Path $functionPath)) {
    Write-Host "❌ Function file not found: $functionPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Function file found: $functionPath" -ForegroundColor Green
Write-Host ""

# Method 1: Try Supabase CLI
Write-Host "📦 Attempting deployment via Supabase CLI..." -ForegroundColor Yellow

try {
    # Check if Supabase CLI is installed
    $supabaseVersion = supabase --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Supabase CLI found: $supabaseVersion" -ForegroundColor Green
        
        # Try to deploy
        Write-Host "Deploying function..." -ForegroundColor Cyan
        supabase functions deploy $functionName --project-ref $projectId
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Deployment successful via Supabase CLI!" -ForegroundColor Green
            exit 0
        } else {
            Write-Host "⚠️  Supabase CLI deployment failed (may require Docker)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  Supabase CLI not found or not working" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Supabase CLI error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Alternative Deployment Methods:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 1: Supabase Dashboard (Recommended - No Docker Required)" -ForegroundColor White
Write-Host "  1. Go to: https://supabase.com/dashboard/project/$projectId/functions/$functionName" -ForegroundColor Gray
Write-Host "  2. Click 'Edit' or 'Deploy'" -ForegroundColor Gray
Write-Host "  3. Copy the entire content from: $functionPath" -ForegroundColor Gray
Write-Host "  4. Paste into the editor" -ForegroundColor Gray
Write-Host "  5. Click 'Deploy'" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 2: Install Docker Desktop and use CLI" -ForegroundColor White
Write-Host "  1. Install Docker Desktop: https://docs.docker.com/desktop" -ForegroundColor Gray
Write-Host "  2. Start Docker Desktop" -ForegroundColor Gray
Write-Host "  3. Run: supabase functions deploy $functionName --project-ref $projectId" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 The function file is ready at: $functionPath" -ForegroundColor Green
Write-Host "✅ All fixes are in place - just needs deployment!" -ForegroundColor Green
Write-Host ""

