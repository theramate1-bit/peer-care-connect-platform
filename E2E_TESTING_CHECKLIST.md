# End-to-End Testing Checklist for Booking Flow Fixes

## Test Environment Setup
- Ensure you're testing as a guest user (not logged in)
- Use the marketplace booking flow
- Select a practitioner with active services/products

## Test Scenarios

### 1. Guest Booking Flow - Complete Success
**Steps:**
1. Navigate to marketplace
2. Select a practitioner
3. Click "Book Session" (or use guest booking flow)
4. Fill in guest information (name, email, phone)
5. Select a service/product (or use hourly rate)
6. Select date and time
7. Optionally fill intake form (or skip it)
8. Accept cancellation policy (if shown)
9. Complete booking

**Expected Results:**
- ✅ No console errors about missing `service_id` column
- ✅ No console errors about missing `practitioner_product_durations` table
- ✅ No console errors about missing `get_cancellation_policy` RPC function
- ✅ No console errors about missing `complete_intake_form` RPC function
- ✅ Session is created with `pending_payment` status
- ✅ Payment integration successfully finds the session
- ✅ Redirects to Stripe checkout URL
- ✅ Booking completes without blocking errors

### 2. Payment Integration Status Acceptance
**Steps:**
1. Create a booking that results in `pending_payment` status
2. Proceed to payment step

**Expected Results:**
- ✅ Payment integration accepts `pending_payment` status
- ✅ No "Session not found or not available for payment" error
- ✅ Payment checkout URL is generated successfully

### 3. Missing Table Handling
**Steps:**
1. Select a service/product that would query `practitioner_product_durations`
2. Proceed through booking flow

**Expected Results:**
- ✅ No 404 errors for `practitioner_product_durations` table
- ✅ Booking flow continues using service's own duration
- ✅ Duration is set correctly from the service itself

### 4. Missing RPC Functions - Error Suppression
**Steps:**
1. Complete booking flow
2. Check browser console

**Expected Results:**
- ✅ No error logs for `get_cancellation_policy` (PGRST202)
- ✅ No error logs for `complete_intake_form` (PGRST202)
- ✅ Default cancellation policy is used silently
- ✅ Intake form submission failure doesn't block booking

### 5. Intake Form Optional Fields
**Steps:**
1. Proceed through booking flow
2. Reach intake form step
3. Leave all fields empty
4. Click "Continue to Payment"

**Expected Results:**
- ✅ All fields are optional (no required asterisks)
- ✅ Can proceed without filling any fields
- ✅ No validation errors blocking continuation

### 6. Fixed Service Duration
**Steps:**
1. Select a fixed service/product (not hourly)
2. Check duration field

**Expected Results:**
- ✅ Duration is automatically set to service's duration
- ✅ Duration field is disabled/read-only
- ✅ Shows "Duration is fixed for this service" message

## Verification Points

Check the browser console for:
- ❌ No `service_id` column errors
- ❌ No `practitioner_product_durations` 404 errors
- ❌ No `get_cancellation_policy` PGRST202 errors
- ❌ No `complete_intake_form` PGRST202 errors
- ❌ No "Session not found" errors at payment step

Check the network tab for:
- ✅ Successful POST to `client_sessions` with status `pending_payment`
- ✅ Successful POST to payment integration endpoint
- ✅ Successful redirect to Stripe checkout

## Common Issues to Watch For

1. **Status Mismatch**: If payment fails with "Session not found", verify `PaymentIntegration.createSessionPayment` accepts `pending_payment` status
2. **Table Errors**: If 404 errors appear for `practitioner_product_durations`, verify error handling is in place
3. **RPC Errors**: If console shows PGRST202 errors, verify error suppression is working
4. **Validation Errors**: If intake form blocks continuation, verify all fields are optional

## Success Criteria

All tests should pass with:
- Zero blocking errors in console
- Successful booking creation
- Successful payment redirect
- Clean user experience without error messages

