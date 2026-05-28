# Manual Testing Guide for Google OAuth Flows

## 🎯 Overview
This guide provides step-by-step instructions for manually testing the Google OAuth flows for both clients and practitioners.

## 🧪 Test Environment
- **Production URL**: https://theramate-l3h8xe50o-theras-projects-6dfd5a34.vercel.app
- **Test Date**: [Current Date]
- **Browser**: Chrome, Firefox, Safari, Edge

## 📋 Pre-Test Checklist
- [ ] Clear browser cache and cookies
- [ ] Open browser developer tools (F12)
- [ ] Go to Console tab to monitor errors
- [ ] Go to Network tab to monitor requests
- [ ] Go to Application tab > Storage to monitor sessionStorage

## 🧑‍💼 Client OAuth Flow Test

### Test Case 1: Client Registration Flow
1. **Navigate to Register Page**
   - Go to: `https://theramate-l3h8xe50o-theras-projects-6dfd5a34.vercel.app/register`
   - ✅ Verify page loads without errors
   - ✅ Check console for any JavaScript errors

2. **Verify Client Google OAuth Button**
   - ✅ Look for button with text: "Continue with Google as Client"
   - ✅ Verify button is clickable and visible
   - ✅ Check that button has proper styling

3. **Test Client OAuth Button Click**
   - Click "Continue with Google as Client" button
   - ✅ Check sessionStorage in DevTools:
     - Go to Application tab > Storage > Session Storage
     - Look for key: `intendedRole`
     - Verify value: `client`
   - ✅ Check console for log messages about setting intended role

4. **Test Google OAuth Process**
   - ✅ Google OAuth popup/redirect should appear
   - ✅ Complete Google authentication
   - ✅ Verify redirect back to application

5. **Verify Client Onboarding**
   - ✅ Should be redirected to `/onboarding`
   - ✅ Should see client-specific onboarding content
   - ✅ Verify no errors in console

### Test Case 2: Client Login Flow
1. **Navigate to Login Page**
   - Go to: `https://theramate-l3h8xe50o-theras-projects-6dfd5a34.vercel.app/login`
   - ✅ Verify page loads without errors

2. **Test Client Login Button**
   - ✅ Look for "Continue with Google as Client" button
   - ✅ Click button and verify sessionStorage is set to `client`
   - ✅ Complete OAuth flow

## 👨‍⚕️ Practitioner OAuth Flow Test

### Test Case 3: Practitioner Registration Flow
1. **Navigate to Register Page**
   - Go to: `https://theramate-l3h8xe50o-theras-projects-6dfd5a34.vercel.app/register`

2. **Verify Practitioner Google OAuth Button**
   - ✅ Look for button with text: "Continue with Google as Practitioner"
   - ✅ Verify button is clickable and visible

3. **Test Practitioner OAuth Button Click**
   - Click "Continue with Google as Practitioner" button
   - ✅ Check sessionStorage for `intendedRole: 'practitioner'`
   - ✅ Check console for log messages

4. **Test Google OAuth Process**
   - ✅ Complete Google authentication
   - ✅ Verify redirect back to application

5. **Verify Role Selection Page**
   - ✅ Should be redirected to `/auth/role-selection`
   - ✅ Should see role selection options:
     - Osteopath
     - Sports Therapist
     - Massage Therapist
     - Client

6. **Test Role Selection**
   - ✅ Select "Osteopath" option
   - ✅ Click submit/continue button
   - ✅ Verify redirect to `/onboarding`

### Test Case 4: Practitioner Login Flow
1. **Navigate to Login Page**
   - Go to: `https://theramate-l3h8xe50o-theras-projects-6dfd5a34.vercel.app/login`

2. **Test Practitioner Login Button**
   - ✅ Click "Continue with Google as Practitioner" button
   - ✅ Verify sessionStorage is set to `practitioner`
   - ✅ Complete OAuth flow

## 🔍 Error Scenarios Testing

### Test Case 5: Missing Session Storage
1. **Clear Session Storage**
   - Open DevTools > Application > Storage > Session Storage
   - Clear all session storage
   - Navigate to `/auth/role-selection`
   - ✅ Verify page still loads without errors

### Test Case 6: Invalid Role Selection
1. **Navigate to Role Selection**
   - Go to `/auth/role-selection`
   - Try to submit without selecting any role
   - ✅ Verify appropriate error handling

### Test Case 7: Network Errors
1. **Simulate Network Issues**
   - Open DevTools > Network tab
   - Set throttling to "Offline"
   - Try to complete OAuth flow
   - ✅ Verify graceful error handling

## 📱 Mobile Testing

### Test Case 8: Mobile Responsiveness
1. **Open Mobile View**
   - Use browser dev tools to simulate mobile device
   - Or test on actual mobile device
   - ✅ Verify OAuth buttons are visible and clickable
   - ✅ Verify role selection works on mobile

## 🐛 Common Issues to Look For

### JavaScript Errors
- Check browser console for:
  - `useEffect is not defined` errors
  - Network request failures (400, 500 errors)
  - Authentication errors
  - Session storage errors

### UI Issues
- Missing OAuth buttons
- Buttons not clickable
- Incorrect button text
- Styling issues on mobile

### Flow Issues
- Wrong redirects after OAuth
- Session storage not being set
- Role selection not working
- Onboarding not loading

## 📊 Test Results Template

```
Test Case: [Test Case Number]
Date: [Date]
Browser: [Browser Name]
Status: [PASS/FAIL]
Issues Found: [List any issues]
Screenshots: [Attach screenshots if needed]
Console Logs: [Copy relevant console logs]
```

## 🚨 Critical Issues to Report

1. **OAuth buttons not visible**
2. **Session storage not being set**
3. **Wrong redirects after OAuth**
4. **JavaScript errors preventing flow**
5. **Mobile responsiveness issues**
6. **Role selection not working**

## 📞 Support Information

If you encounter issues:
1. Take screenshots
2. Copy console error messages
3. Note the exact steps that caused the issue
4. Report with browser and device information

