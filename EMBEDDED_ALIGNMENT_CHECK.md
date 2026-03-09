# Embedded Component Alignment Check

## ✅ Current Implementation Analysis

### Code Review Results:

#### 1. **Component Mounting** ✅ CORRECT
- **Location**: `EmbeddedStripeOnboarding.tsx` line 190
- **Method**: `container.appendChild(accountOnboarding)`
- **Container**: `<div ref={containerRef}>` with inline styles
- **Result**: Component mounts directly in the page (not popup)

#### 2. **No Redirects** ✅ CORRECT
- **No `window.location.href`** to Stripe URLs
- **No Account Links** created
- **No redirect buttons** in the code
- **Component stays on page**

#### 3. **Stripe Connect Initialization** ✅ CORRECT
- **Uses**: `loadConnectAndInitialize()` from `@stripe/connect-js`
- **No `overlays: 'dialog'`** (removed to prevent popups)
- **Component type**: `'account-onboarding'`
- **Mounts inline**: `container.appendChild()`

#### 4. **Container Styling** ✅ CORRECT
```typescript
<div 
  ref={containerRef} 
  className="min-h-[400px] w-full stripe-connect-container"
  style={{ 
    minHeight: '400px',
    width: '100%',
    position: 'relative',
    display: 'block'
  }}
/>
```

---

## 🔍 What the Screen Should Show

### Expected Flow:
1. **Initial State**: Shows "Set Up Payment Account" button
2. **User Clicks Button**: Triggers `handleStartStripeConnect()`
3. **Creating State**: Shows loading spinner ("Setting up your payment account...")
4. **Embedded State**: Shows `EmbeddedStripeOnboarding` component
5. **Stripe Form**: Should appear **inline** in the container div

### What You're Seeing:
Based on your description, you're seeing:
- "Complete Payment Setup" section
- "Fill in your details below..." text
- **But no Stripe form visible**

This suggests:
- ✅ Component is rendering (showing the Card with title)
- ⚠️ Stripe component might be in loading state
- ⚠️ OR there's an error preventing the form from loading

---

## 🐛 Potential Issues

### Issue 1: Component Not Loading
**Symptoms**: See "Complete Payment Setup" but no form
**Possible Causes**:
- `stripeConnectInstance` not initialized
- `fetchClientSecret` failing
- Account session creation error
- Stripe SDK not loaded

### Issue 2: Component Loading But Not Visible
**Symptoms**: Form exists in DOM but not visible
**Possible Causes**:
- CSS hiding the component
- Container height issue
- z-index or positioning issue

### Issue 3: Error State
**Symptoms**: Error message displayed
**Possible Causes**:
- Account creation failed
- Account session creation failed
- Authentication error

---

## ✅ Verification Steps

### 1. Check Browser Console
Open DevTools (F12) and check for:
- Errors from `EmbeddedStripeOnboarding`
- Errors from `fetchClientSecret`
- Stripe Connect initialization errors

### 2. Check DOM
In DevTools Elements tab, look for:
- `<div class="stripe-connect-container">` should exist
- Should contain Stripe iframe/components inside
- Should NOT redirect to `connect.stripe.com`

### 3. Check Network Tab
Look for:
- Request to `/functions/v1/stripe-payment` (create-account-session)
- Response should contain `client_secret`
- No redirects to Stripe domains

### 4. Verify Account Creation
Check if account was created:
- Should have `requirement_collection: 'application'`
- Should allow `disable_stripe_user_authentication`

---

## 🎯 Expected Behavior (Per Stripe Docs)

According to Stripe's embedded components documentation:

> "Embedded onboarding is a themeable onboarding UI with limited Stripe branding. You embed the Account onboarding component in your platform application, and your connected accounts interact with the embedded component without leaving your application."

### What Should Happen:
1. ✅ User clicks "Set Up Payment Account"
2. ✅ Account created (or retrieved)
3. ✅ Account session created with `client_secret`
4. ✅ Stripe Connect component initialized
5. ✅ Component mounts in container div
6. ✅ **Form appears inline** (no popup, no redirect)
7. ✅ User completes form **on your page**
8. ✅ No leaving theramate.co.uk

---

## 🔧 If Component Not Showing

### Debug Steps:
1. **Check console logs**:
   - Look for `[EmbeddedStripeOnboarding]` logs
   - Check for initialization errors
   - Verify `stripeConnectInstance` is set

2. **Check component state**:
   - Is `loading` stuck at `true`?
   - Is there an `error` state?
   - Is `stripeConnectInstance` null?

3. **Verify account session**:
   - Check if `fetchClientSecret` succeeds
   - Verify `client_secret` is returned
   - Check account session creation logs

4. **Check container**:
   - Verify `containerRef.current` exists
   - Check if component is appended to DOM
   - Verify container is visible (not hidden by CSS)

---

## ✅ Implementation Status

**Code is CORRECTLY configured for embedded components:**
- ✅ Uses `container.appendChild()` (inline mounting)
- ✅ No redirects or popups in code
- ✅ Proper container styling
- ✅ Correct Stripe Connect initialization

**If form not showing, it's likely:**
- Loading state (waiting for account session)
- Error state (check console for errors)
- Account creation issue (check backend logs)

The implementation **aligns with Stripe's embedded component requirements**. The form should appear inline once the account session is created successfully.



