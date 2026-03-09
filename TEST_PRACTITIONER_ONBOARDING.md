# 🧪 PRACTITIONER ONBOARDING TEST GUIDE

**Purpose:** Test if practitioners can complete onboarding and be redirected to Stripe

**Issue:** Stripe checkout may not recognize the user

---

## 🔍 DIAGNOSIS CHECKLIST

### Issue: "Doesn't recognize the user"

**Possible Causes:**
1. ❌ User session lost between onboarding steps
2. ❌ AuthContext not providing user/session to SubscriptionContext
3. ❌ User signed out unexpectedly
4. ❌ Token expired during onboarding
5. ❌ Edge Function not receiving authorization header

---

## 🧪 MANUAL TEST PROCEDURE

### Step 1: Check Authentication State

**Open the app in browser:**
```
http://localhost:5173
```

**Open Browser DevTools (F12) and run:**
```javascript
// Check if user is authenticated
console.log('=== AUTH CHECK ===');
console.log('User:', await window.supabase.auth.getUser());
console.log('Session:', await window.supabase.auth.getSession());
```

### Step 2: Start Practitioner Onboarding

1. **Sign up as a new practitioner**
   - Go to sign up page
   - Choose practitioner role (Sports Therapist, Massage Therapist, or Osteopath)
   
2. **Complete onboarding steps:**
   - ✅ Step 1: Phone + Location
   - ✅ Step 2: Professional Details
   - ✅ Step 3: Availability Setup
   - ✅ Step 4: Payment/Subscription ← **TEST THIS STEP**

### Step 3: Debug Payment Step

**When you reach Step 4 (Payment), open Console (F12) and check:**

```javascript
// Check auth state before clicking payment
console.log('=== BEFORE PAYMENT CLICK ===');
(async () => {
  const { data: { user } } = await window.supabase.auth.getUser();
  const { data: { session } } = await window.supabase.auth.getSession();
  console.log('User:', user);
  console.log('Session:', session);
  console.log('User ID:', user?.id);
  console.log('User Email:', user?.email);
  console.log('Session Token:', session?.access_token ? 'EXISTS' : 'MISSING');
})();
```

**Expected Results:**
- ✅ User should exist
- ✅ Session should exist
- ✅ User ID should be present
- ✅ User Email should be present
- ✅ Session Token should exist

### Step 4: Test Payment Button Click

1. **Click "Continue to Payment" button**

2. **Watch the Console for:**
   - Network request to `/functions/v1/create-checkout`
   - Any error messages
   - Toast notifications

3. **Check Network Tab (F12 → Network):**
   - Look for `create-checkout` request
   - Check request headers - should include `Authorization: Bearer ...`
   - Check response status (should be 200)
   - Check response body (should have `{ url: "..." }`)

---

## 🔧 COMMON ISSUES & FIXES

### Issue 1: "Please sign in to subscribe" Toast

**Symptom:** Toast error appears when clicking payment button

**Cause:** `user` or `session` is null in SubscriptionContext

**Debug:**
```javascript
// In Console, check if auth context is working
console.log('Auth Context:', window.authContext);
```

**Fix:**
- User may need to refresh the page
- Check if AuthProvider is properly wrapping the app
- Verify localStorage has session data

---

### Issue 2: Network Request Fails with 401

**Symptom:** Request to create-checkout returns 401 Unauthorized

**Cause:** Authorization header not being sent

**Debug:**
```javascript
// Check if Supabase client has session
console.log('Supabase Session:', await supabase.auth.getSession());
```

**Fix:**
- Session may have expired during onboarding
- User needs to sign out and sign in again
- Check session expiry time

---

### Issue 3: No Redirect to Stripe

**Symptom:** Button shows loading, but no redirect happens

**Cause:** Response from Edge Function doesn't contain URL

**Debug:**
- Check Network tab for `create-checkout` response
- Look for error in response body
- Check Edge Function logs in Supabase Dashboard

**Fix:**
- Verify Stripe keys are set in Supabase Edge Functions
- Check Edge Function logs for specific error
- Verify user email exists (required for Stripe)

---

### Issue 4: "Failed to create checkout session"

**Symptom:** Generic error toast appears

**Causes:**
1. Stripe keys not configured
2. Edge Function error
3. Network error

**Debug:**
```javascript
// Check if Edge Functions are accessible
fetch('https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/create-checkout', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_SESSION_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ plan: 'practitioner', billing: 'monthly' })
})
.then(r => r.json())
.then(console.log);
```

---

## 🛠️ QUICK FIXES TO TRY

### Fix 1: Add Debug Logging

**Add this to `SubscriptionContext.tsx` at line 189:**

```typescript
const createCheckout = async (plan: string, billing: string) => {
  console.log('🔵 CREATE CHECKOUT CALLED');
  console.log('User:', user);
  console.log('Session:', session);
  console.log('Plan:', plan);
  console.log('Billing:', billing);
  
  if (!user || !session) {
    console.error('❌ No user or session!');
    toast.error('Please sign in to subscribe');
    return;
  }
  
  console.log('✅ User and session exist, calling Edge Function...');
  
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { plan, billing }
    });
    
    console.log('Edge Function Response:', { data, error });
    
    // ... rest of code
```

### Fix 2: Check Session Before Payment Step

**Add this to `Onboarding.tsx` before Step 4:**

```typescript
useEffect(() => {
  if (step === 4 && effectiveRole !== 'client') {
    // Verify user is still authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please sign in again.');
        navigate('/login');
      } else {
        console.log('✅ Session valid at payment step');
      }
    };
    checkAuth();
  }
}, [step, effectiveRole]);
```

### Fix 3: Refresh Session Before Payment

**Add this to `SubscriptionSelection.tsx` before createCheckout:**

```typescript
const handleSubscribe = async (plan: SubscriptionPlan) => {
  try {
    setSelectedPlan(plan.id);
    
    // Refresh session to ensure it's valid
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Session expired. Please refresh and try again.');
      return;
    }
    
    toast.info('Redirecting to secure payment...', { duration: 3000 });
    
    await createCheckout(plan.id, billingCycle);
    
  } catch (error) {
    // ...
  }
};
```

---

## 📊 TEST RESULTS TEMPLATE

```
Date: __________
Tester: __________
Browser: __________

AUTHENTICATION:
✅/❌ User authenticated at start
✅/❌ Session exists at start
✅/❌ User ID present
✅/❌ Email present

ONBOARDING STEPS:
✅/❌ Step 1 completed
✅/❌ Step 2 completed
✅/❌ Step 3 completed
✅/❌ Reached Step 4 (Payment)

PAYMENT STEP:
✅/❌ User still authenticated
✅/❌ Session still valid
✅/❌ Button clickable
✅/❌ Toast appears
✅/❌ Network request sent
✅/❌ Authorization header present
✅/❌ Response received
✅/❌ Response contains URL
✅/❌ Redirect to Stripe occurs

ERRORS:
[List any errors here]

CONSOLE LOGS:
[Paste relevant console logs]

RESULT: ✅ SUCCESS / ❌ FAILED

Notes: __________
```

---

## 🎯 EXPECTED vs ACTUAL BEHAVIOR

### ✅ EXPECTED:
1. User signs up as practitioner
2. Completes all onboarding steps
3. Reaches Step 4 (Payment)
4. User is still authenticated
5. Session is valid
6. Clicks "Continue to Payment"
7. Toast shows "Redirecting to secure payment..."
8. Button shows spinner
9. Network request sent with auth header
10. Response contains Stripe URL
11. Browser redirects to Stripe Checkout
12. User can complete payment

### ❌ POSSIBLE ACTUAL (if issue exists):
1-3. ✅ Same as expected
4. ❌ User session lost/expired
5. ❌ No session found
6. ✅ Clicks button
7. ❌ Toast shows "Please sign in to subscribe"
8. ❌ No redirect occurs
9. ❌ No network request sent
10. N/A
11. N/A
12. ❌ Cannot complete payment

---

## 🚀 NEXT STEPS

1. **Run the test procedure above**
2. **Note where it fails** (which step)
3. **Check console logs** for errors
4. **Apply relevant fix** from the Quick Fixes section
5. **Re-test** after applying fix
6. **Report results** with the template above

---

## 📝 NOTES

- The dev server should be running at `http://localhost:5173`
- Use a new incognito window for each test
- Clear localStorage between tests if needed
- Test with multiple browsers if possible
- Check Supabase Dashboard → Edge Functions → Logs for backend errors

---

**Ready to test!** Start by opening `http://localhost:5173` and following the test procedure. 🎉

