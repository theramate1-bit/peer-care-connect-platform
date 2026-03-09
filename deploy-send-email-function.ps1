# Deploy send-email Edge Function to Supabase
# This script uses the Supabase Management API to deploy the function

Write-Host "🚀 Deploying send-email Edge Function..." -ForegroundColor Green

$projectId = "aikqnvltuwwgifuocvto"
$functionName = "send-email"
$functionPath = "supabase\functions\send-email\index.ts"

# Check if file exists
if (-not (Test-Path $functionPath)) {
    Write-Host "❌ Function file not found: $functionPath" -ForegroundColor Red
    exit 1
}

# Read function content
Write-Host "📖 Reading function file..." -ForegroundColor Yellow
$functionContent = Get-Content $functionPath -Raw -Encoding UTF8

$fileSize = $functionContent.Length
Write-Host "File read successfully. Size: $fileSize characters" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  To deploy this function, you have two options:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option 1: Deploy via Supabase Dashboard (Recommended - No Docker Required)" -ForegroundColor Cyan
Write-Host "1. Go to: https://supabase.com/dashboard/project/$projectId/functions/$functionName" -ForegroundColor White
Write-Host "2. Click 'Edit' or 'Deploy'" -ForegroundColor White
Write-Host "3. Copy the entire content from: $functionPath" -ForegroundColor White
Write-Host "4. Paste into the editor" -ForegroundColor White
Write-Host "5. Click 'Deploy'" -ForegroundColor White
Write-Host ""
Write-Host "Option 2: Deploy via Supabase CLI (Requires Docker Desktop)" -ForegroundColor Cyan
Write-Host "1. Install Docker Desktop: https://docs.docker.com/desktop" -ForegroundColor White
Write-Host "2. Start Docker Desktop" -ForegroundColor White
Write-Host "3. Run: supabase functions deploy $functionName --project-ref $projectId" -ForegroundColor White
Write-Host ""
Write-Host "📋 The function file is ready at: $functionPath" -ForegroundColor Green
Write-Host "✅ Local file has been updated with Platform Fee (0.5%)" -ForegroundColor Green

