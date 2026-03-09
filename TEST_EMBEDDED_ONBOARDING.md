# Testing Embedded Onboarding - No Popup Verification

## ✅ Code Configuration Verified

### New Account Creation (Correct Configuration)
The code creates new accounts with:
- ✅ `requirement_collection: 'application'` (Platform collects requirements)
- ✅ `dashboard.type: 'none'` (Fully embedded, no Stripe Dashboard)
- ✅ `disable_stripe_user_authentication: true` (No SMS/email popup)

**Location**: `supabase/functions/stripe-payment/index.ts` lines 670-677

### Account Session Creation (Correct Configuration)
The backend checks account type and conditionally enables `disable_stripe_user_authentication`:
- ✅ Only enabled if `requirement_collection === 'application'`
- ✅ Automatically removed if account has `requirement_collection: 'stripe'`

**Location**: `supabase/functions/stripe-payment/index.ts` lines 1950-1972

### Frontend Component (Correct Configuration)
- ✅ Removed `overlays: 'dialog'` (prevents popup)
- ✅ Component mounts inline in container div
- ✅ Uses `disable_stripe_user_authentication: true` in request

**Location**: `src/components/onboarding/EmbeddedStripeOnboarding.tsx` lines 130-141, 182

---

## 🧪 How to Test

### Test Scenario 1: New Account (Should NOT show popup)
1. **Create a new practitioner account** (or use a test user)
2. **Navigate to payment setup** in onboarding
3. **Click "Set Up Payment Account"**
4. **Expected Result**: 
   - ✅ Component embeds inline in the page
   - ✅ NO popup window appears
   - ✅ Form appears directly in the TheraMate page
   - ✅ User can complete onboarding without leaving the page

### Test Scenario 2: Existing Account (May show popup)
1. **Use existing account** `acct_1Sj0sHCPWCYrygB7`
2. **Navigate to payment setup**
3. **Expected Result**:
   - ⚠️ May show authentication popup (expected for `requirement_collection: 'stripe'`)
   - ✅ After authentication, component embeds inline

---

## 🔍 Verification Checklist

### For New Accounts:
- [ ] Account created with `requirement_collection: 'application'`
- [ ] Account created with `dashboard.type: 'none'`
- [ ] Account session includes `disable_stripe_user_authentication: true`
- [ ] Component renders in container div (not popup)
- [ ] No `connect.stripe.com` popup appears
- [ ] User can complete onboarding inline

### Code Verification:
```typescript
// ✅ Account Creation (line 670)
requirement_collection: 'application' // Enables disable_stripe_user_authentication

// ✅ Account Session (line 1951)
if (requirementCollection === 'application') {
  accountOnboardingFeatures.disable_stripe_user_authentication = true;
}

// ✅ Frontend (line 54)
disable_stripe_user_authentication: true // Requested from frontend
```

---

## 📝 Expected Behavior

### New Accounts (requirement_collection: 'application')
1. User clicks "Set Up Payment Account"
2. Account created with correct configuration
3. Embedded component loads inline
4. **NO popup** - form appears directly in page
5. User completes onboarding without leaving TheraMate

### Existing Accounts (requirement_collection: 'stripe')
1. User clicks "Set Up Payment Account"
2. Embedded component loads
3. **Popup may appear** for authentication (SMS/email)
4. After authentication, component continues inline
5. User completes onboarding

---

## 🐛 If Popup Still Appears

### Check These:
1. **Account Configuration**: Verify account has `requirement_collection: 'application'`
   ```bash
   # Check account via Stripe API
   curl https://api.stripe.com/v1/accounts/acct_XXXXX \
     -u sk_live_...
   ```

2. **Account Session**: Verify session includes `disable_stripe_user_authentication`
   - Check backend logs for `[CREATE-ACCOUNT-SESSION]` messages
   - Should see: "enabling disable_stripe_user_authentication"

3. **Frontend**: Verify component mounts in container
   - Check browser DevTools
   - Look for `<div ref={containerRef}>` with Stripe content inside
   - Should NOT see `connect.stripe.com` popup

4. **Browser Console**: Check for errors
   - Look for authentication-related errors
   - Check if `fetchClientSecret` is called correctly

---

## ✅ Success Criteria

**New Account Test Passes When:**
- ✅ No popup window appears
- ✅ Stripe form renders inline in TheraMate page
- ✅ User can complete entire onboarding without leaving page
- ✅ No redirects to `connect.stripe.com`
- ✅ Component appears in container div (check DevTools)

---

## 📊 Test Results Template

```
Test Date: ___________
Account ID: ___________
Account Type: ___________
Requirement Collection: ___________

✅ Account Created: Yes/No
✅ Component Rendered: Yes/No
✅ Popup Appeared: Yes/No (should be No for new accounts)
✅ Inline Embedding: Yes/No
✅ Onboarding Completed: Yes/No

Notes:
_________________________________
_________________________________
```

