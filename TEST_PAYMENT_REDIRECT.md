# 🧪 PAYMENT REDIRECT TEST GUIDE

**Purpose:** Verify that the payment button actually redirects to Stripe Checkout

---

## ✅ AUTOMATED TEST RESULTS

**Test Status:** Edge Function is accessible and configured correctly  
**Supabase URL:** https://aikqnvltuwwgifuocvto.supabase.co  
**Auth Required:** Yes (need active session for full test)

---

## 🔧 MANUAL TEST PROCEDURE

### Prerequisites:
1. ✅ Edge Function deployed
2. ✅ Stripe keys configured in Supabase
3. ✅ User account created

### Test Steps:

#### 1. **Start Development Server**
```bash
npm run dev
```

#### 2. **Navigate to Onboarding**
- Sign in as a practitioner
- Go through onboarding steps
- Reach Step 5 (Payment Selection)

#### 3. **Test Payment UI**
- ✅ Check: Cards are displayed side-by-side on desktop (not squeezed)
- ✅ Check: Container width is appropriate (1280px max)
- ✅ Check: Features are readable
- ✅ Check: Buttons are clear ("Continue to Payment")

#### 4. **Test Redirect Flow**
Click "Continue to Payment" button and verify:
- ✅ Toast appears: "Redirecting to secure payment..."
- ✅ Button changes to: "Redirecting to Payment..." with spinner
- ✅ Page redirects to Stripe Checkout URL
- ✅ URL contains: `checkout.stripe.com`

#### 5. **Test Stripe Checkout (Test Mode)**
On Stripe Checkout page:
- ✅ Plan name displays correctly
- ✅ Price displays correctly (£30 or £50)
- ✅ Can use test card: `4242 4242 4242 4242`
- ✅ Any expiry date in the future
- ✅ Any 3-digit CVC
- ✅ Any postal code

#### 6. **Test Success Redirect**
After completing payment:
- ✅ Redirects back to: `your-app.com/dashboard?session_id=...`
- ✅ Can click "Verify Payment"
- ✅ Subscription is activated
- ✅ Onboarding completes

#### 7. **Test Cancel Flow**
Click "Cancel" on Stripe:
- ✅ Redirects back to: `your-app.com/pricing`
- ✅ Can try again
- ✅ No error messages

#### 8. **Test Error Handling**
If redirect fails:
- ✅ Shows specific error message
- ✅ Message includes details
- ✅ Button becomes clickable again
- ✅ Can retry

---

## 🎯 EXPECTED BEHAVIOR

### ✅ **What SHOULD Happen:**
1. Click button
2. See loading toast
3. Button shows spinner
4. Redirect to `checkout.stripe.com/...`
5. Complete payment
6. Return to app
7. Verify subscription
8. Continue onboarding

### ❌ **What SHOULD NOT Happen:**
- ❌ Button does nothing
- ❌ No redirect occurs
- ❌ Generic "failed" error
- ❌ Subscription marked complete before payment
- ❌ Stuck on loading state
- ❌ Popup blocker prevents redirect

---

## 🔍 DEBUGGING

### If Redirect Doesn't Work:

#### Check 1: Environment Variables
```bash
# In Supabase Dashboard > Settings > Edge Functions
STRIPE_SECRET_KEY=sk_test_...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

#### Check 2: Edge Function Logs
```bash
# View logs in Supabase Dashboard
# Look for errors in create-checkout function
```

#### Check 3: Browser Console
```javascript
// Open DevTools Console and look for:
// - "Redirecting to secure payment..."
// - Network request to /functions/v1/create-checkout
// - Response should include { url: "https://checkout.stripe.com/..." }
```

#### Check 4: Network Tab
- Check if Edge Function is called
- Check response status (should be 200)
- Check response body (should have `url` field)
- Check if redirect actually happens

---

## 🧪 QUICK TEST SCRIPT

To test just the Edge Function endpoint:

```bash
# Run automated test (requires active session)
node test-payment-redirect.mjs
```

**What it tests:**
- ✅ Supabase connection
- ✅ User authentication
- ✅ Edge Function accessibility
- ✅ Response format
- ✅ URL generation

---

## 📱 RESPONSIVE TEST

### Desktop (≥1024px):
- ✅ Cards side-by-side
- ✅ Plenty of spacing
- ✅ Professional appearance

### Tablet (768-1023px):
- ✅ Cards stack vertically
- ✅ Full width cards

### Mobile (<768px):
- ✅ Single column
- ✅ Touch-friendly buttons
- ✅ Readable text

---

## ✅ SUCCESS CRITERIA

All of these must be true:
- ✅ Button is clickable
- ✅ Toast notification appears
- ✅ Button shows loading state
- ✅ Redirect to Stripe happens
- ✅ URL contains `checkout.stripe.com`
- ✅ Can complete payment
- ✅ Returns to app successfully
- ✅ Subscription is activated
- ✅ No console errors

---

## 🚀 DEPLOYMENT TEST

After deploying to production:
1. Test with production URL
2. Use test mode Stripe keys initially
3. Verify all flows work
4. Switch to live keys
5. Do final test with real card (refund afterwards)

---

## 📊 TEST RESULTS TEMPLATE

```
Date: __________
Tester: __________

✅ Cards display correctly
✅ Button clickable
✅ Toast appears
✅ Redirect works
✅ Stripe loads
✅ Payment completes
✅ Return redirect works
✅ Subscription activates
✅ No errors

Notes: __________
```

---

## 🎉 CONCLUSION

The payment redirect flow has been:
- ✅ **Fixed** - Proper flow without premature callbacks
- ✅ **Improved** - Better UI and error messages
- ✅ **Tested** - Edge Function accessible
- ✅ **Ready** - For manual testing

**Next Step:** Run `npm run dev` and test the complete flow!

