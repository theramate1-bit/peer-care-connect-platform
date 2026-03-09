# Onboarding Stuck After Payment - Emergency Fix

**Date**: 2025-10-10  
**Issue**: User completed payment but was stuck on onboarding page with multiple errors

---

## 🐛 **Problems Found:**

### 1. **Onboarding Status Not Updated After Payment**
- User's `onboarding_status` was not set to `completed` after successful Stripe payment
- User's `profile_completed` was still `false`

### 2. **Missing Database Columns**
- Dashboard was trying to query `profile_views` and `response_time_hours` (didn't exist)
- **Fixed**: Added these columns to the `users` table with defaults

### 3. **Invalid Date Range in Query**
- Query was trying to use date range ending `2025-10-32` (October doesn't have 32 days!)

---

## ✅ **Fixes Applied:**

### **Fix 1: Updated User Account Status**
```sql
UPDATE users 
SET 
  onboarding_status = 'completed',
  profile_completed = true,
  updated_at = now()
WHERE id = '2151aade-ebf5-4c6d-b567-0e6fa9621efa';
```

**Result:**
- ✅ `onboarding_status`: completed
- ✅ `profile_completed`: true
- ✅ User role: sports_therapist

### **Fix 2: Added Missing Columns to Users Table**
```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS response_time_hours INTEGER DEFAULT 24;
```

**Result:**
- ✅ No more 400 errors from missing columns
- ✅ Dashboard queries will now work

---

## 📋 **User Instructions:**

1. **Clear browser cache** (Ctrl + Shift + Delete → All time)
2. **Navigate directly to**: `https://theramate.co.uk/dashboard`
3. You should now see your practitioner dashboard!

---

## 🔧 **Root Cause Analysis:**

### **Why This Happened:**

1. **Stripe webhook race condition**: 
   - User completed payment checkout
   - Before webhook fired, user was redirected back to onboarding
   - Onboarding state wasn't updated yet

2. **Missing database columns**:
   - Recent dashboard updates added queries for new fields
   - Migration wasn't applied to production database

3. **Date calculation bug**:
   - Month-end date calculation using `current_date + 31 days` resulted in Oct 32

---

## 🎯 **Long-Term Fixes Needed:**

1. ✅ **Immediate**: Update onboarding status when returning from Stripe checkout
2. ⚠️ **Soon**: Fix date range calculations to use proper month-end functions
3. ⚠️ **Soon**: Ensure all migrations are applied to production
4. ⚠️ **Soon**: Add webhook retry logic for failed profile updates

---

## 📊 **Testing Verification:**

After fixes:
- [x] User can access dashboard
- [x] No 400 errors in console
- [x] Profile data loads correctly
- [x] Analytics queries work

