# Update Stripe Webhook Events for Fully Embedded Connect
# This script adds the required v2 events to the webhook endpoint

$webhookId = "we_1SZobHFk77knaVvaU7N5ndNj"
$apiKey = $env:STRIPE_SECRET_KEY
if (-not $apiKey -or $apiKey -notlike "sk_*") { Write-Error "Set STRIPE_SECRET_KEY in environment"; exit 1 }

$events = @(
    "account.updated",
    "v2.core.account.updated",
    "v2.core.account[configuration.merchant].capability_status_updated",
    "v2.core.account[configuration.recipient].capability_status_updated",
    "account.application.deauthorized",
    "account.application.authorized",
    "checkout.session.completed",
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
    "charge.succeeded",
    "charge.failed",
    "invoice.payment_succeeded",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "checkout.session.expired",
    "invoice.payment_action_required"
)

Write-Host "Updating webhook endpoint: $webhookId" -ForegroundColor Cyan
Write-Host "Adding events:" -ForegroundColor Yellow
$events | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }

$eventsJson = ($events | ForEach-Object { "`"$_`"" }) -join ","
$eventsArray = "[$eventsJson]"

Write-Host ""
Write-Host "Run this command:" -ForegroundColor Green
Write-Host "stripe webhook_endpoints update $webhookId --enabled-events $($events -join ' ') --api-key $apiKey" -ForegroundColor White

