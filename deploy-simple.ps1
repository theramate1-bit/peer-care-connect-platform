# 🚀 SIMPLE EDGE FUNCTION DEPLOYMENT SCRIPT

Write-Host "🚀 Starting Edge Function Deployment..." -ForegroundColor Green

# Create function directories
$functions = @("create-checkout", "create-session-payment", "stripe-webhook", "customer-portal", "check-subscription")

foreach ($func in $functions) {
    Write-Host "📦 Creating $func function..." -ForegroundColor Yellow
    
    $functionDir = "supabase/functions/$func"
    if (!(Test-Path $functionDir)) {
        New-Item -ItemType Directory -Path $functionDir -Force
    }
    
    Write-Host "✅ $func directory created" -ForegroundColor Green
}

Write-Host "🎉 Function directories created successfully!" -ForegroundColor Green
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Copy Edge Function code from DEPLOYMENT_PACKAGE.md" -ForegroundColor White
Write-Host "2. Paste into each function's index.ts file" -ForegroundColor White
Write-Host "3. Deploy via Supabase Dashboard or CLI" -ForegroundColor White

Write-Host "🔗 Dashboard: https://supabase.com/dashboard" -ForegroundColor Yellow
Write-Host "🔗 Project: aikqnvltuwwgifuocvto" -ForegroundColor Yellow
