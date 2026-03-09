# 🎯 Monthly Credit Allocation System

## Overview

The monthly credit allocation system provides **fair and predictable credits** to all paying practitioners. Each subscription plan includes a fixed monthly credit allocation that automatically renews with their subscription period.

## Credit Allocation by Plan

### Practitioner Plan (£30/month)
- **Monthly Allocation**: 60 credits
- **Equivalent Value**: 1 hour of peer treatment
- **Auto-renewal**: Every billing cycle

### Pro Plan (£50/month)
- **Monthly Allocation**: 120 credits
- **Equivalent Value**: 2 hours of peer treatment
- **Auto-renewal**: Every billing cycle

### Free/Starter Plan
- **Monthly Allocation**: 0 credits
- **How to earn**: Complete client sessions (earn credits based on session fees)

## How It Works

### 1. Initial Allocation (First Payment)
When a practitioner completes payment during onboarding:
1. Stripe webhook receives `checkout.session.completed` event
2. Subscription is created in database with `monthly_credits` field
3. `allocateSubscriptionCredits()` function is called
4. Credits are added to user's balance via `allocate_monthly_credits` RPC function
5. Transaction record is created with type `'bonus'` and allocation metadata

### 2. Monthly Renewal (Recurring Payments)
When Stripe processes a recurring subscription payment:
1. Stripe webhook receives `invoice.payment_succeeded` event
2. Subscription period is updated in database
3. `allocateSubscriptionCredits()` function is called again
4. Credits are added to user's balance
5. `last_credit_allocation` timestamp is updated

### 3. Scheduled Processing (Backup/Catchup)
A scheduled Edge Function `process-credit-allocations` runs daily to:
- Check for subscriptions that need credit allocation
- Process any missed allocations
- Ensure all active subscriptions receive their credits

## Database Schema

### New Columns in `subscriptions` Table
```sql
monthly_credits INTEGER DEFAULT 0          -- Number of credits allocated monthly
last_credit_allocation TIMESTAMP WITH TIME ZONE  -- Last allocation timestamp
```

### New RPC Function: `allocate_monthly_credits`
```sql
allocate_monthly_credits(
  p_user_id UUID,
  p_subscription_id UUID,
  p_amount INTEGER,
  p_allocation_type TEXT,  -- 'initial' or 'monthly_renewal'
  p_period_start TIMESTAMP,
  p_period_end TIMESTAMP
) RETURNS UUID  -- Transaction ID
```

## Real-Time Updates

Users receive instant feedback when credits are allocated:
- Real-time subscription to `credit_allocations` table
- Real-time subscription to `subscriptions` table
- Toast notification: "60 credits allocated! Your monthly credits have been added to your balance"
- Balance updates automatically without page refresh

## User Interface

### Credits Page Enhancements

**New: Monthly Subscription Allocation Card**
- Shows current plan (Practitioner/Pro)
- Displays monthly allocation amount (60 or 120 credits)
- Shows last allocation date (relative and absolute)
- Shows next allocation date (relative and absolute)
- Beautiful gradient styling (blue theme)

**Existing Features**
- Current balance display
- Total earned from client sessions
- Total spent on peer treatments
- Transaction history with filters
- Peer practitioner discovery

## Credit Transaction Types

1. **session_earning**: Earned from completing client sessions
2. **session_payment**: Spent on booking peer treatments
3. **bonus**: Monthly subscription allocation (NEW)
4. **refund**: Credits returned from cancelled sessions

## Implementation Details

### Files Modified

1. **Migration**: `supabase/migrations/20250111000001_monthly_credit_allocation.sql`
   - Adds schema changes
   - Creates RPC function
   - Includes commented cron job setup

2. **Stripe Webhook**: `supabase/functions/stripe-webhook/index.ts`
   - Enhanced `handleSubscriptionPayment` to allocate credits on first payment
   - Enhanced `handleInvoicePayment` to allocate credits on renewal
   - New `allocateSubscriptionCredits` function

3. **Scheduled Function**: `supabase/functions/process-credit-allocations/index.ts`
   - Daily processing of pending allocations
   - Backup/catchup for any missed allocations
   - Can be triggered manually or via cron

4. **Credits Page**: `src/pages/Credits.tsx`
   - New state for subscription/allocation tracking
   - Real-time subscriptions for allocations
   - Enhanced data loading to fetch subscription info
   - New UI card for monthly allocation display

## Benefits

### For Practitioners
✅ **Fair allocation**: Everyone gets the same credits for their plan
✅ **Predictable**: Know exactly how many credits you'll receive each month
✅ **Automatic**: No manual action required, credits appear automatically
✅ **Transparent**: See allocation history and next allocation date
✅ **Real-time**: Instant notification when credits are allocated

### For Platform
✅ **Scalable**: Automated system handles thousands of subscriptions
✅ **Reliable**: Multiple layers (webhook + scheduled) ensure credits are always allocated
✅ **Auditable**: Full transaction history with metadata
✅ **Flexible**: Easy to adjust allocation amounts or add new plans

## Testing

### Test Initial Allocation
1. Sign up as new practitioner
2. Complete onboarding
3. Pay for Practitioner (£30) or Pro (£50) plan
4. Verify credits appear in balance immediately
5. Check Credits page for allocation card

### Test Monthly Renewal
1. Use Stripe test card: `4000000000000341` (requires authentication)
2. Wait for first renewal (or trigger via Stripe Dashboard)
3. Verify credits are added again
4. Check `last_credit_allocation` is updated

### Test Scheduled Processing
1. Call Edge Function manually: `POST /functions/v1/process-credit-allocations`
2. Check response for allocations processed
3. Verify credits are added for eligible subscriptions

## Deployment Checklist

- [x] Database migration created and applied
- [x] Stripe webhook updated and deployed
- [x] Scheduled Edge Function created
- [x] Credits page updated with new UI
- [x] Real-time subscriptions added
- [ ] Test initial allocation in production
- [ ] Test monthly renewal in production
- [ ] Set up cron job for scheduled processing (optional)

## Future Enhancements

1. **Rollover Credits**: Allow unused credits to roll over (with limits)
2. **Bonus Allocations**: Special promotions or referral bonuses
3. **Usage Analytics**: Track credit utilization rates per plan
4. **Credit Packages**: Allow practitioners to purchase additional credit bundles
5. **Credit Gifting**: Allow practitioners to gift credits to peers

## Support & Troubleshooting

### Issue: Credits not allocated after payment
**Solution**: 
1. Check Stripe webhook logs
2. Verify subscription exists in database
3. Manually trigger allocation via RPC function
4. Check Edge Function logs

### Issue: Duplicate allocations
**Solution**:
1. Check `last_credit_allocation` timestamp
2. Verify webhook isn't being called twice
3. Review transaction history for duplicates

### Issue: Wrong allocation amount
**Solution**:
1. Verify `monthly_credits` in subscriptions table matches plan
2. Check plan mapping in webhook code
3. Update subscription record if needed

---

**Last Updated**: 2025-10-10  
**Version**: 1.0.0  
**Status**: ✅ Implemented and Ready for Testing

