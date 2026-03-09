# 🚨 URGENT: Stripe Site Links Configuration Required

## Error
**"You cannot create livemode account sessions or account links until you have supplied URLs at https://dashboard.stripe.com/settings/connect/site-links for notification banner, account management, payouts, payments, and balance."**

## ✅ IMMEDIATE ACTION REQUIRED

You must configure site links in your Stripe Dashboard before embedded onboarding will work.

### Step-by-Step Instructions

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/settings/connect/site-links
2. **Sign in** to your Stripe account
3. **For each of the 5 required URLs**, configure as follows:

---

### Configuration for Each URL

**Base URL**: `https://theramate.co.uk/settings/payouts`

For **ALL 5 URLs**, use:
- **Is this an embedded component?**: Select **"Yes"**
- **URL**: `https://theramate.co.uk/settings/payouts`
- **Note**: Stripe will automatically append `?stripe_account_id={account_id}`

#### 1. Notification Banner
- **Is embedded?**: Yes
- **URL**: `https://theramate.co.uk/settings/payouts`

#### 2. Account Management
- **Is embedded?**: Yes  
- **URL**: `https://theramate.co.uk/settings/payouts`

#### 3. Payouts
- **Is embedded?**: Yes
- **URL**: `https://theramate.co.uk/settings/payouts`

#### 4. Payments
- **Is embedded?**: Yes
- **URL**: `https://theramate.co.uk/settings/payouts`

#### 5. Balance
- **Is embedded?**: Yes
- **URL**: `https://theramate.co.uk/settings/payouts`

---

### After Configuration

1. Click **"Save"** at the bottom
2. **Validate** each URL (click the Validate button)
3. **Refresh your browser** on the onboarding page
4. **Try creating the account again**

---

## ✅ Code Updated

I've updated `SettingsPayouts.tsx` to handle the `stripe_account_id` query parameter that Stripe will append to these URLs. The page will now:
- Read `?stripe_account_id={id}` from the URL
- Verify the account belongs to the logged-in user
- Display the appropriate embedded component

---

## Why This Is Required

Stripe needs these URLs so that when they send emails to connected accounts (for compliance, risk actions, etc.), the emails can include links that redirect users back to your site where the embedded components are hosted.

**This is a Stripe requirement for live mode** - there's no way around it.

---

**Action**: Go to https://dashboard.stripe.com/settings/connect/site-links and configure all 5 URLs now.

