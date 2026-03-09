# Production Rebuild Script - Clears cache and rebuilds fresh
# Run this to ensure no cached content is served in production

Write-Host "🧹 Clearing build cache and node modules..." -ForegroundColor Yellow

# Remove build artifacts
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "✓ Removed dist folder" -ForegroundColor Green
}

if (Test-Path ".vite") {
    Remove-Item -Recurse -Force ".vite"
    Write-Host "✓ Removed .vite cache" -ForegroundColor Green
}

if (Test-Path "node_modules/.vite") {
    Remove-Item -Recurse -Force "node_modules/.vite"
    Write-Host "✓ Removed node_modules/.vite cache" -ForegroundColor Green
}

Write-Host ""
Write-Host "📦 Reinstalling dependencies..." -ForegroundColor Yellow
npm ci

Write-Host ""
Write-Host "🏗️  Building fresh production bundle..." -ForegroundColor Yellow
npm run build

Write-Host ""
Write-Host "✅ Production build complete!" -ForegroundColor Green
Write-Host "Deploy the 'dist' folder to your production environment." -ForegroundColor Cyan
