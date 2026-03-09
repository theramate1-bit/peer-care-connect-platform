# Credit System Fixes - Deployment Script
# Deploys critical and high-priority fixes to Supabase

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Credit System Fixes - Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to peer-care-connect directory
Set-Location -Path "peer-care-connect" -ErrorAction Stop

Write-Host "📍 Current directory: $(Get-Location)" -ForegroundColor Gray
Write-Host ""

# Function to check if Supabase CLI is installed
function Test-SupabaseCLI {
    try {
        $version = npx supabase --version 2>&1
        Write-Host "✅ Supabase CLI found: $version" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Supabase CLI not found. Please install it first:" -ForegroundColor Red
        Write-Host "   npm install -g supabase" -ForegroundColor Yellow
        return $false
    }
}

# Check Supabase CLI
if (-not (Test-SupabaseCLI)) {
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration Files to Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$migrations = @(
    @{
        File = "supabase/migrations/20250201_create_process_peer_booking_credits.sql"
        Name = "🔴 CRITICAL: process_peer_booking_credits function"
        Priority = "CRITICAL"
    },
    @{
        File = "supabase/migrations/20250201_add_credit_allocations_rls.sql"
        Name = "🔴 HIGH: RLS policies for credit_allocations"
        Priority = "HIGH"
    },
    @{
        File = "supabase/migrations/20250201_add_allocation_unique_constraint.sql"
        Name = "🔴 HIGH: Unique constraint for allocations"
        Priority = "HIGH"
    },
    @{
        File = "supabase/migrations/20250201_add_peer_booking_refund.sql"
        Name = "🔴 HIGH: process_peer_booking_refund function"
        Priority = "HIGH"
    },
    @{
        File = "supabase/migrations/20250201_add_performance_indexes.sql"
        Name = "⚠️ MEDIUM: Performance indexes"
        Priority = "MEDIUM"
    },
    @{
        File = "supabase/migrations/20250201_add_balance_reconciliation.sql"
        Name = "⚠️ MEDIUM: Balance reconciliation function"
        Priority = "MEDIUM"
    }
)

foreach ($migration in $migrations) {
    Write-Host ""
    Write-Host "  [$($migration.Priority)]" -ForegroundColor $(if ($migration.Priority -eq "CRITICAL") {"Red"} elseif ($migration.Priority -eq "HIGH") {"Yellow"} else {"Gray"})
    Write-Host "  $($migration.Name)" -ForegroundColor White
    
    if (Test-Path $migration.File) {
        Write-Host "  ✅ File exists: $($migration.File)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ File missing: $($migration.File)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

# Confirm deployment
Write-Host ""
$confirm = Read-Host "Deploy all migrations to Supabase? (y/n)"

if ($confirm -ne "y") {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Deploy all migrations
Write-Host ""
Write-Host "📤 Pushing migrations to Supabase..." -ForegroundColor Cyan
Write-Host ""

try {
    npx supabase db push
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ Deployment Successful!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ Deployment Failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the error above and try again." -ForegroundColor Yellow
    Write-Host "See CREDIT_SYSTEM_FIXES_DEPLOYMENT.md for rollback instructions." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Run the following SQL queries in Supabase Dashboard to verify:" -ForegroundColor Yellow
Write-Host ""
Write-Host @"
-- Check if process_peer_booking_credits exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'process_peer_booking_credits';

-- Check if RLS is enabled on credit_allocations
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename = 'credit_allocations';

-- Check if unique constraint exists
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'credit_allocations' 
AND constraint_name = 'unique_subscription_period';

-- Check if refund function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'process_peer_booking_refund';

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('credit_transactions', 'credit_allocations', 'client_sessions')
AND (indexname LIKE 'idx_credit%' OR indexname LIKE 'idx_client_sessions_peer%');
"@ -ForegroundColor Gray

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. ✅ Verify deployment (run SQL above)" -ForegroundColor White
Write-Host "2. ✅ Test peer treatment booking flow" -ForegroundColor White
Write-Host "3. ✅ Test session cancellation/refund" -ForegroundColor White
Write-Host "4. ✅ Monitor for errors in Supabase logs" -ForegroundColor White
Write-Host ""
Write-Host "📖 See CREDIT_SYSTEM_FIXES_DEPLOYMENT.md for detailed testing checklist" -ForegroundColor Cyan
Write-Host ""

# Return to original directory
Set-Location ..

