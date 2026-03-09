# ⚠️ CRITICAL: Stripe Site Links Configuration Required

## Error Message
"You cannot create livemode account sessions or account links until you have supplied URLs at https://dashboard.stripe.com/settings/connect/site-links for notification banner, account management, payouts, payments, and balance."

## ✅ Solution: Configure Site Links in Stripe Dashboard

### Step 1: Navigate to Site Links Settings
1. Go to: **https://dashboard.stripe.com/settings/connect/site-links**
2. Sign in to your Stripe Dashboard if prompted

### Step 2: Configure Each Required URL

For each of the following, select **"Yes"** (embedded component) and enter the URL:

#### 1. Notification Banner
- **Is this an embedded component?**: **Yes**
- **URL**: `https://theramate.co.uk/settings/payouts`
- **Note**: Stripe will automatically append `?stripe_account_id={account_id}`

#### 2. Account Management
- **Is this an embedded component?**: **Yes**
- **URL**: `https://theramate.co.uk/settings/payouts`
- **Component**: `EmbeddedAccountManagement` (Account tab)

#### 3. Payouts
- **Is this an embedded component?**: **Yes**
- **URL**: `https://theramate.co.uk/settings/payouts`
- **Component**: `EmbeddedAccountManagement` (Payouts tab)

#### 4. Payments
- **Is this an embedded component?**: **Yes**
- **URL**: `https://theramate.co.uk/settings/payouts`
- **Component**: `EmbeddedAccountManagement` (Payments tab)

#### 5. Balance
- **Is this an embedded component?**: **Yes**
- **URL**: `https://theramate.co.uk/settings/payouts`
- **Component**: `EmbeddedAccountManagement` (shows balance info)

### Step 3: Validate URLs
- Click **"Validate"** next to each URL to ensure it works
- Make sure all URLs are accessible and return 200 OK

### Step 4: Save Configuration
- Click **"Save"** at the bottom of the page
- Wait for confirmation that settings are saved

## Important Notes

1. **All URLs must be HTTPS** in live mode
2. **Stripe automatically appends** `?stripe_account_id={account_id}` to these URLs
3. **Your pages must handle** the `stripe_account_id` query parameter
4. **You can use the same URL** for multiple components if they're on the same page (which is the case here - all components are on `/settings/payouts`)

## Current Application Structure

Based on your codebase:
- **Settings/Payouts page**: `/settings/payouts` 
  - Hosts `EmbeddedAccountManagement` component
  - Has tabs for: Account, Payouts, Payments
  - Shows balance information
  - Handles `stripe_account_id` query parameter

## After Configuration

1. ✅ Site links configured in Stripe Dashboard
2. ✅ Try creating an account session again
3. ✅ The embedded onboarding should now work

## Verification

After configuring, you should be able to:
- Create account sessions without the 500 error
- See the embedded Stripe Connect onboarding form
- Complete the onboarding flow inline

---

**Action Required**: Go to https://dashboard.stripe.com/settings/connect/site-links and configure all 5 URLs as described above.

