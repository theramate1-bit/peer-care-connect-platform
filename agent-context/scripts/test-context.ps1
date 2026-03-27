# Smoke test for Agent Context Service
# Run after: docker compose -f docker-compose.offline.yml up -d
# Wait for services to be ready (~30s), then: .\scripts\test-context.ps1

$base = "http://localhost:8002"
Write-Host "Testing Agent Context Service at $base" -ForegroundColor Cyan

# Health
try {
    $r = Invoke-RestMethod -Uri "$base/health" -Method Get
    Write-Host "[OK] Health: $($r.status)" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Health check: $_" -ForegroundColor Red
    exit 1
}

# Ingest
$body = @{
    user_id = "test-user"
    session_id = "test-sess"
    messages = @(
        @{ role = "user"; content = "My name is Alex and I prefer City Osteopaths." }
    )
    business_data = @{ credits = 5 }
} | ConvertTo-Json -Depth 5
try {
    $r = Invoke-RestMethod -Uri "$base/ingest" -Method Post -Body $body -ContentType "application/json"
    Write-Host "[OK] Ingest: $($r.ingested.Count) items" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Ingest: $_" -ForegroundColor Red
}

# Assemble
$body = @{
    user_id = "test-user"
    query = "What clinic does the user prefer?"
    max_tokens = 4000
} | ConvertTo-Json
try {
    $r = Invoke-RestMethod -Uri "$base/assemble" -Method Post -Body $body -ContentType "application/json"
    Write-Host "[OK] Assemble: context length $($r.context.Length) chars" -ForegroundColor Green
    if ($r.context) { Write-Host $r.context.Substring(0, [Math]::Min(200, $r.context.Length)) "..." -ForegroundColor Gray }
} catch {
    Write-Host "[FAIL] Assemble: $_" -ForegroundColor Red
}

Write-Host "`nDone. Service is ready for integration." -ForegroundColor Cyan
