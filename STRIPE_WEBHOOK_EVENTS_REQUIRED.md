# Required Stripe Webhook Events for Fully Embedded Connect

## Current Status
Your webhook endpoint is configured and listening to **11 events** with **26% activity**.

## Required Events for Fully Embedded Connect

### ✅ Currently Handled
- **`account.updated`** - Updates `connect_accounts` table when account status changes
  - Tracks: `charges_enabled`, `payouts_enabled`, `details_submitted`, `account_status`

### ⚠️ Missing Events for Accounts v2 (Fully Embedded)

For **Accounts v2** (fully embedded Custom accounts), you need these additional events:

1. **`v2.core.account.updated`** - Account updates in Accounts v2 API
   - Triggered when account configuration, capabilities, or status changes
   - **Action Required**: Add handler for this event

2. **`v2.core.account[configuration.merchant].capability_status_updated`** - Capability status changes
   - Triggered when `card_payments` or other capabilities are enabled/disabled
   - **Critical**: Needed to detect when accounts are ready to accept payments
   - **Action Required**: Add handler for this event

3. **`v2.core.account[configuration.recipient].capability_status_updated`** - Payout capability changes
   - Triggered when payout capabilities are enabled/disabled
   - **Action Required**: Add handler for this event

### Recommended Additional Events

4. **`account.application.deauthorized`** - Account disconnected
   - Handle when practitioners disconnect their Stripe account
   - **Action Required**: Add handler to mark account as disconnected

5. **`account.application.authorized`** - Account connected
   - Handle when accounts are first connected
   - **Action Required**: Add handler (if not already covered by account.updated)

## Implementation Steps

### Step 1: Add Accounts v2 Event Handlers

Update `peer-care-connect/supabase/functions/stripe-webhook/index.ts`:

```typescript
case "v2.core.account.updated": {
  console.log("🏢 Processing v2.core.account.updated (Connect v2)");
  const account = event.data.object as any; // Accounts v2 object structure
  
  // Update connect_accounts table
  // Note: Accounts v2 uses different field names
  const { error: connectError } = await supabase
    .from('connect_accounts')
    .update({
      account_status: account.status || 'pending',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_account_id', account.id);
  
  if (connectError) {
    console.error("❌ Error updating connect_accounts:", connectError);
  } else {
    console.log(`✅ Connect v2 account updated: ${account.id}`);
  }
  break;
}

case "v2.core.account[configuration.merchant].capability_status_updated": {
  console.log("💳 Processing merchant capability status update");
  const capability = event.data.object as any;
  
  // Check if card_payments is now enabled
  if (capability.updated_capability === 'card_payments' && capability.status === 'active') {
    // Update connect_accounts to mark charges_enabled
    const { error } = await supabase
      .from('connect_accounts')
      .update({
        charges_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_account_id', capability.account);
    
    if (error) {
      console.error("❌ Error updating charges_enabled:", error);
    } else {
      console.log(`✅ Charges enabled for account: ${capability.account}`);
    }
  }
  break;
}

case "v2.core.account[configuration.recipient].capability_status_updated": {
  console.log("💰 Processing recipient capability status update");
  const capability = event.data.object as any;
  
  // Check if stripe_balance.stripe_transfers is now enabled
  if (capability.updated_capability === 'stripe_balance.stripe_transfers' && capability.status === 'active') {
    // Update connect_accounts to mark payouts_enabled
    const { error } = await supabase
      .from('connect_accounts')
      .update({
        payouts_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_account_id', capability.account);
    
    if (error) {
      console.error("❌ Error updating payouts_enabled:", error);
    } else {
      console.log(`✅ Payouts enabled for account: ${capability.account}`);
    }
  }
  break;
}
```

### Step 2: Configure Webhook in Stripe Dashboard

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Select your webhook endpoint: `https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/stripe-webhook`
3. Click **"Add events"** or **"Edit"**
4. Add these events:
   - `v2.core.account.updated`
   - `v2.core.account[configuration.merchant].capability_status_updated`
   - `v2.core.account[configuration.recipient].capability_status_updated`
   - `account.application.deauthorized`
   - `account.application.authorized` (if not already added)

### Step 3: Test Webhook Events

Use Stripe CLI to test:
```bash
stripe trigger v2.core.account.updated
stripe trigger v2.core.account[configuration.merchant].capability_status_updated
```

## Why These Events Are Critical

1. **`v2.core.account.updated`**: Accounts v2 uses different data structures than v1. You need this to track account status for fully embedded accounts.

2. **Capability Status Events**: For fully embedded accounts, capabilities are enabled asynchronously. These events tell you when accounts are ready to:
   - Accept payments (`card_payments` capability)
   - Receive payouts (`stripe_balance.stripe_transfers` capability)

3. **Without these events**: Your system won't know when embedded accounts are fully onboarded and ready to process payments.

## Current Handler Status

✅ **Working**: `account.updated` (Accounts v1)  
⚠️ **Missing**: Accounts v2 events (required for fully embedded)  
⚠️ **Missing**: Capability status events (critical for payment readiness)

## Next Steps

1. ✅ Add event handlers to `stripe-webhook/index.ts`
2. ✅ Configure webhook in Stripe Dashboard to listen for v2 events
3. ✅ Test with Stripe CLI
4. ✅ Verify events are being received (check Edge Function logs)

