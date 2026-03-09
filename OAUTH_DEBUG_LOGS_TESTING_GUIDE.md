# OAuth Debug Logs Testing Guide

## 🎯 Testing the OAuth Debug Logs

This guide shows you how to test the specific OAuth debug logs that were implemented to track the authentication flow.

### 🔍 **Key Debug Logs to Monitor**

The following debug logs are now implemented and ready for testing:

1. **🔄 AuthCallback: Session: true/false** - Session state tracking
2. **🔄 Session exists but no user yet, waiting for user to be set...** - OAuth processing
3. **🎯 Consumed intended role: [role]** - Role assignment tracking
4. **✅ Role assigned successfully** - Successful role assignment

### 🧪 **Test Commands Available**

```bash
# Test OAuth debug logs implementation
npm run test:oauth:debug

# Run mock OAuth flow test
npm run test:oauth:mock

# Verify OAuth fixes
npm run test:oauth:verify

# Run OAuth unit tests
npm run test:oauth:unit
```

### 📊 **Test Results Summary**

✅ **All Debug Logs Implemented:**
- **AuthCallback debug logs**: 4/4 logs found
- **Additional OAuth flow logs**: 6/6 logs found  
- **RoleManager debug logs**: 5/5 logs found
- **Mock OAuth flow test**: Created and working

### 🎭 **Mock OAuth Flow Test**

The mock test demonstrates exactly how the debug logs will appear during a real OAuth flow:

```
Step 1: User clicks "Continue with Google"
🔄 AuthCallback: Processing auth callback...
🔄 AuthCallback: Session: false
🔄 Auth still loading, waiting...

Step 2: OAuth callback received  
🔄 AuthCallback: Session: true
🔄 Session exists but no user yet, waiting for user to be set...

Step 3: User authenticated
🔄 AuthCallback: User: test@example.com
🔄 AuthCallback: Session: true
✅ User authenticated: test@example.com

Step 4: Role assignment
🎯 Consumed intended role: sports_therapist
✅ Role assigned successfully

Step 5: Final redirect
✅ User has completed setup, redirecting to dashboard for role: sports_therapist
```

### 🚀 **How to Test with Real OAuth**

1. **Start Development Server:**
   ```bash
   npm run dev
   ```

2. **Open Browser DevTools:**
   - Press `F12` or right-click → "Inspect"
   - Go to the "Console" tab
   - Clear the console for clean logs

3. **Navigate to Registration Page:**
   - Go to `http://localhost:3000/register`
   - Or navigate to your deployed app

4. **Test Google OAuth:**
   - Click "Continue with Google" button
   - Complete the Google OAuth flow
   - **Monitor the console for debug logs**

5. **Expected Debug Log Sequence:**
   ```
   🔄 AuthCallback: Processing auth callback...
   🔄 AuthCallback: Current URL: [callback URL]
   🔄 AuthCallback: User: [user email or undefined]
   🔄 AuthCallback: Session: [true/false]
   🔄 AuthCallback: Loading: [true/false]
   
   [If session exists but no user yet:]
   🔄 Session exists but no user yet, waiting for user to be set...
   
   [When user is authenticated:]
   ✅ User authenticated: [email]
   
   [During role assignment:]
   🎯 Consumed intended role: [role]
   ✅ Role assigned successfully
   
   [Final redirect:]
   ✅ User has completed setup, redirecting to dashboard for role: [role]
   ```

### 🔧 **Debugging Tips**

**If you don't see the expected logs:**

1. **Check Console Filter:**
   - Make sure console is showing all log levels
   - Look for any error messages that might be interrupting the flow

2. **Check Network Tab:**
   - Look for failed requests to Supabase
   - Verify OAuth callback is being received

3. **Check Session Storage:**
   - Look for `pending_user_role` in sessionStorage
   - Verify the role is being stored correctly

4. **Check Local Storage:**
   - Look for Supabase auth tokens
   - Verify session persistence

### 📱 **Testing Different User Types**

Test OAuth with different user types to see role-specific logs:

1. **Client Registration:**
   - Click "I'm looking for treatment" → "Continue with Google"
   - Should see: `🎯 Consumed intended role: client`

2. **Sports Therapist Registration:**
   - Click "I'm a practitioner" → "Sports Therapist" → "Continue with Google"
   - Should see: `🎯 Consumed intended role: sports_therapist`

3. **Massage Therapist Registration:**
   - Click "I'm a practitioner" → "Massage Therapist" → "Continue with Google"
   - Should see: `🎯 Consumed intended role: massage_therapist`

4. **Osteopath Registration:**
   - Click "I'm a practitioner" → "Osteopath" → "Continue with Google"
   - Should see: `🎯 Consumed intended role: osteopath`

### 🎉 **Success Indicators**

You'll know the OAuth debug logs are working correctly when you see:

✅ **Session State Tracking:** `🔄 AuthCallback: Session: true/false`
✅ **OAuth Processing:** `🔄 Session exists but no user yet, waiting for user to be set...`
✅ **Role Assignment:** `🎯 Consumed intended role: [role]`
✅ **Success Confirmation:** `✅ Role assigned successfully`
✅ **Final Redirect:** `✅ User has completed setup, redirecting to dashboard for role: [role]`

### 🚨 **Troubleshooting**

**If logs are missing or incomplete:**

1. **Run verification script:**
   ```bash
   npm run test:oauth:verify
   ```

2. **Check AuthCallback component:**
   - Ensure the component has the latest updates
   - Verify session state management is implemented

3. **Check browser compatibility:**
   - Test in different browsers
   - Ensure JavaScript is enabled

4. **Check Supabase configuration:**
   - Verify OAuth provider is enabled
   - Check redirect URLs are correct

The OAuth debug logs are now fully implemented and ready for testing! 🎉
