# Stripe Connect Site Links Configuration - REQUIRED

## Error
"You cannot create livemode account sessions or account links until you have supplied URLs at https://dashboard.stripe.com/settings/connect/site-links for notification banner, account management, payouts, payments, and balance."

## Required URLs

You need to configure these URLs in Stripe Dashboard:
https://dashboard.stripe.com/settings/connect/site-links

### URLs to Configure

Based on your TheraMate application structure:

1. **Notification Banner**: 
   - URL: `https://theramate.co.uk/settings/payouts?stripe_account_id={stripe_account_id}`
   - Component: Embedded notification banner component
   - Select: **Yes** (embedded component)

2. **Account Management**: 
   - URL: `https://theramate.co.uk/settings/payouts?stripe_account_id={stripe_account_id}`
   - Component: `EmbeddedAccountManagement`
   - Select: **Yes** (embedded component)

3. **Payouts**: 
   - URL: `https://theramate.co.uk/settings/payouts?stripe_account_id={stripe_account_id}`
   - Component: Embedded payouts component
   - Select: **Yes** (embedded component)

4. **Payments**: 
   - URL: `https://theramate.co.uk/settings/payouts?stripe_account_id={stripe_account_id}`
   - Component: Embedded payments component
   - Select: **Yes** (embedded component)

5. **Balance**: 
   - URL: `https://theramate.co.uk/settings/payouts?stripe_account_id={stripe_account_id}`
   - Component: Embedded balance component
   - Select: **Yes** (embedded component)

## How to Configure

1. Go to: https://dashboard.stripe.com/settings/connect/site-links
2. For each required URL:
   - Select **Yes** (if using embedded component) or **No** (if redirecting to external page)
   - Enter the URL (Stripe will append `?stripe_account_id={account_id}` automatically)
   - Click **Validate** to test the link
3. Save the configuration

## Important Notes

- Stripe automatically appends `?stripe_account_id={account_id}` to these URLs
- Your pages must handle the `stripe_account_id` query parameter
- All URLs must be HTTPS in live mode
- You can use the same URL for multiple components if they're on the same page

## Current Application URLs

Based on the codebase:
- Settings/Payouts page: `/settings/payouts` (hosts `EmbeddedAccountManagement`)
- Onboarding page: `/onboarding` (hosts `EmbeddedStripeOnboarding`)

## Next Steps

1. Configure the URLs in Stripe Dashboard
2. Test each URL to ensure they work
3. Try creating an account session again

