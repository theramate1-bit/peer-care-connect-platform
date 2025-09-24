# 🧪 Manual Testing Guide

This guide provides step-by-step instructions for manually testing all user flows in the application.

## 🚀 Getting Started

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open the application:**
   - Navigate to `http://localhost:8080`
   - Open browser developer tools (F12) to monitor console logs

## 🔐 Registration Flow Testing

### Test 1: Client Registration
1. **Navigate to registration:**
   - Go to `http://localhost:8080/register`
   - Or click "Sign Up" from the landing page

2. **Fill out client registration form:**
   - Email: `test-client@example.com`
   - Password: `TestPassword123!`
   - First Name: `John`
   - Last Name: `Doe`
   - User Role: Select `Client`
   - Accept terms and conditions

3. **Submit registration:**
   - Click "Create Account"
   - **Expected Result:** Success message and redirect to email verification page
   - **Expected Result:** Email confirmation should be required

4. **Verify email verification flow:**
   - Should see "Check your email" message
   - Should be able to resend verification email
   - Should redirect to login after verification

### Test 2: Practitioner Registration
1. **Repeat registration process with:**
   - Email: `test-practitioner@example.com`
   - Password: `TestPassword123!`
   - First Name: `Jane`
   - Last Name: `Smith`
   - User Role: Select `Sports Therapist`

2. **Verify same email verification flow**

## 🔑 Login Flow Testing

### Test 1: Client Login
1. **Navigate to login:**
   - Go to `http://localhost:8080/login`
   - Or click "Sign In" from the landing page

2. **Login with client credentials:**
   - Email: `test-client@example.com`
   - Password: `TestPassword123!`

3. **Verify routing:**
   - **Expected Result:** Redirect to `/onboarding` (since profile incomplete)
   - **Expected Result:** Welcome message displayed

### Test 2: Practitioner Login
1. **Login with practitioner credentials:**
   - Email: `test-practitioner@example.com`
   - Password: `TestPassword123!`

2. **Verify routing:**
   - **Expected Result:** Redirect to `/onboarding` (since profile incomplete)

### Test 3: Invalid Credentials
1. **Test with wrong password:**
   - Email: `test-client@example.com`
   - Password: `WrongPassword123!`

2. **Expected Result:**
   - Error message: "Invalid email or password"
   - Stay on login page

## 📋 Onboarding Flow Testing

### Test 1: Client Onboarding
1. **Complete client onboarding:**
   - Phone: `+1234567890`
   - Date of Birth: `1990-01-01`
   - Emergency Contact: `Jane Doe`
   - Emergency Phone: `+1234567891`
   - Medical Conditions: `None`
   - Medications: `None`
   - Allergies: `None`
   - Previous Therapy: `None`
   - Preferred Therapy Types: Select `Sports Therapy`
   - Preferred Gender: `Any`
   - Preferred Location: `London, UK`
   - Preferred Time: `Morning`
   - Max Travel Distance: `10`
   - Primary Goal: `Pain relief`
   - Secondary Goals: Select `Improved mobility`
   - Timeline: `3 months`
   - Budget: `£50-100 per session`

2. **Submit onboarding:**
   - Click "Complete Setup"
   - **Expected Result:** Success message and redirect to `/client/dashboard`

### Test 2: Practitioner Onboarding
1. **Complete practitioner onboarding:**
   - Phone: `+1234567890`
   - Bio: `Experienced sports therapist with 5 years of experience`
   - Location: `London, UK`
   - Experience Years: `5`
   - Specializations: Select `Sports Therapy`, `Injury Rehabilitation`
   - Qualifications: `BSc Sports Therapy`, `Level 3 Massage Therapy`
   - Hourly Rate: `80`
   - Availability: Select available days/times
   - Professional Body: `Society of Sports Therapists`
   - Registration Number: `SST123456`

2. **Submit onboarding:**
   - Click "Complete Setup"
   - **Expected Result:** Success message and redirect to `/dashboard`

### Test 3: Validation Testing
1. **Test incomplete forms:**
   - Leave required fields empty
   - **Expected Result:** Validation errors displayed
   - **Expected Result:** Form submission blocked

2. **Test invalid data:**
   - Enter negative experience years
   - Enter invalid phone number
   - **Expected Result:** Appropriate validation errors

## 🏠 Dashboard Access Testing

### Test 1: Client Dashboard Access
1. **Login as client and complete onboarding**
2. **Verify client dashboard:**
   - URL should be `/client/dashboard`
   - Should see client-specific content
   - Should have access to client routes only

3. **Test client route access:**
   - Navigate to `/client/booking` - Should work
   - Navigate to `/client/profile` - Should work
   - Navigate to `/client/sessions` - Should work

4. **Test practitioner route blocking:**
   - Try to navigate to `/dashboard` - Should redirect to unauthorized
   - Try to navigate to `/analytics` - Should redirect to unauthorized
   - Try to navigate to `/payments` - Should redirect to unauthorized

### Test 2: Practitioner Dashboard Access
1. **Login as practitioner and complete onboarding**
2. **Verify practitioner dashboard:**
   - URL should be `/dashboard`
   - Should see practitioner-specific content
   - Should have access to practitioner routes only

3. **Test practitioner route access:**
   - Navigate to `/analytics` - Should work
   - Navigate to `/payments` - Should work
   - Navigate to `/cpd` - Should work
   - Navigate to `/live-sessions` - Should work

4. **Test client route blocking:**
   - Try to navigate to `/client/dashboard` - Should redirect to unauthorized
   - Try to navigate to `/client/booking` - Should redirect to unauthorized
   - Try to navigate to `/client/profile` - Should redirect to unauthorized

## ⚠️ Error Handling Testing

### Test 1: Network Errors
1. **Disconnect internet connection**
2. **Try to submit forms or navigate**
3. **Expected Result:** Appropriate error messages displayed

### Test 2: Authentication Errors
1. **Try to access protected routes without login**
2. **Expected Result:** Redirect to login page

### Test 3: Validation Errors
1. **Submit forms with invalid data**
2. **Expected Result:** Clear validation error messages

### Test 4: Unauthorized Access
1. **Login as client and try to access practitioner routes**
2. **Expected Result:** Redirect to unauthorized page

## 🔒 Role Permissions Testing

### Test 1: Client Permissions
1. **Login as client**
2. **Test allowed routes:**
   - `/client/dashboard` ✅
   - `/client/booking` ✅
   - `/client/profile` ✅
   - `/client/sessions` ✅

3. **Test blocked routes:**
   - `/dashboard` ❌
   - `/analytics` ❌
   - `/payments` ❌
   - `/cpd` ❌

### Test 2: Practitioner Permissions
1. **Login as practitioner**
2. **Test allowed routes:**
   - `/dashboard` ✅
   - `/analytics` ✅
   - `/payments` ✅
   - `/cpd` ✅
   - `/live-sessions` ✅

3. **Test blocked routes:**
   - `/client/dashboard` ❌
   - `/client/booking` ❌
   - `/client/profile` ❌
   - `/client/sessions` ❌

## 🔍 Edge Cases Testing

### Test 1: Browser Refresh
1. **Login and navigate to dashboard**
2. **Refresh the page**
3. **Expected Result:** User remains logged in and on correct page

### Test 2: Direct URL Access
1. **Try to access protected URLs directly:**
   - `http://localhost:8080/client/dashboard`
   - `http://localhost:8080/dashboard`
2. **Expected Result:** Redirect to login if not authenticated

### Test 3: Session Expiry
1. **Login and wait for session to expire**
2. **Try to perform actions**
3. **Expected Result:** Redirect to login page

### Test 4: Multiple Tabs
1. **Open multiple tabs with the application**
2. **Login in one tab**
3. **Expected Result:** Other tabs should reflect login state

## 📱 Responsive Testing

### Test 1: Mobile View
1. **Open browser developer tools**
2. **Switch to mobile view (375px width)**
3. **Test all flows on mobile:**
   - Registration
   - Login
   - Onboarding
   - Dashboard navigation

### Test 2: Tablet View
1. **Switch to tablet view (768px width)**
2. **Test all flows on tablet**

## 🎯 Performance Testing

### Test 1: Page Load Times
1. **Monitor page load times:**
   - Landing page: < 2 seconds
   - Login page: < 1 second
   - Dashboard: < 3 seconds

### Test 2: Form Submission
1. **Monitor form submission times:**
   - Registration: < 2 seconds
   - Login: < 1 second
   - Onboarding: < 3 seconds

## 🐛 Bug Reporting

When you find issues, please report them with:
1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Browser and version**
5. **Screenshot if applicable**

## ✅ Test Checklist

- [ ] Client registration works
- [ ] Practitioner registration works
- [ ] Email verification flow works
- [ ] Client login works
- [ ] Practitioner login works
- [ ] Invalid credentials handled properly
- [ ] Client onboarding works
- [ ] Practitioner onboarding works
- [ ] Form validation works
- [ ] Client dashboard access works
- [ ] Practitioner dashboard access works
- [ ] Route permissions work correctly
- [ ] Error handling works
- [ ] Responsive design works
- [ ] Performance is acceptable

## 🎉 Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ Proper routing and redirects
- ✅ Correct role-based access
- ✅ Good user experience
- ✅ Responsive design
- ✅ Fast load times
