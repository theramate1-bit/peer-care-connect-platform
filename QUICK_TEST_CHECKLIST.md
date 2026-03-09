# ⚡ Quick Test Checklist

## 🎯 **2-Minute Quick Test**

### Test the Payment Fix:

1. **Open App:** http://localhost:5173/onboarding (or your dev URL)
2. **Open Browser Console:** F12 or Cmd+Option+I
3. **Login** as a practitioner who's at the payment step

### ✅ What You Should See in Console:

```javascript
// When clicking "Continue to Payment":

🔵 SUBSCRIPTION SELECTION: Payment button clicked
Plan: pro
Billing: monthly
User from useAuth: EXISTS        // ✅
Session from useAuth: EXISTS     // ✅
✅ User and session verified in component
🔍 Checking for existing subscriptions...
✅ No existing subscription found, proceeding with checkout
🔵 Calling createCheckout...

// THE CRITICAL PART (this should be TRUE now):
🔵 CREATE CHECKOUT: Function called
Fresh user exists: true          // ✅✅✅ MUST BE TRUE!
Fresh session exists: true       // ✅✅✅ MUST BE TRUE!
User ID: 2151aade-ebf5-4c6d-...  // ✅ Should show real ID
User Email: test@example.com     // ✅ Should show real email

✅ CREATE CHECKOUT: Fresh user and session valid, calling Edge Function
🔵 Edge Function Response: { data: { url: "https://checkout.stripe.com/..." } }
✅ Stripe URL received
🔵 Redirecting to Stripe...

// Then browser redirects to Stripe ✅
```

---

## 🚨 **FAILURE SIGNS (Old Behavior)**

If you see this, the fix didn't work:
```javascript
❌ Fresh user exists: false      // BAD!
❌ Fresh session exists: false   // BAD!
❌ CREATE CHECKOUT: No user or session
❌ Toast: "Your session has expired"
```

---

## 📋 **Resume Dialog Test**

1. **First Visit:** Dialog shows ✅
2. **Click "Not Now"** ✅
3. **Navigate away and back:** Dialog does NOT show ✅
4. **Refresh browser:** Dialog shows again (new session) ✅

---

## 🎯 **Pass/Fail Criteria**

### PASS ✅ if:
- "Fresh user exists: true" in console
- "Fresh session exists: true" in console
- Browser redirects to Stripe
- Resume dialog shows only once per session

### FAIL ❌ if:
- "Fresh user exists: false"
- "Session expired" error
- No redirect to Stripe
- Dialog appears multiple times

---

## 🔥 **Super Quick Test (30 seconds)**

Just check these 3 logs:
```javascript
Fresh user exists: true  ← Must be TRUE
Fresh session exists: true  ← Must be TRUE
Stripe URL received  ← Must appear
```

If all 3 show up, **IT WORKS!** 🎉

---

**Current Status:** Testing in progress...  
**Result:** [ ] ✅ PASS / [ ] ❌ FAIL

