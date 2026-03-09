# Client Onboarding UX Test Data Setup

**Version**: 1.0  
**Purpose**: Guide for setting up test data for UX testing

---

## 🎯 Overview

This guide helps you set up test accounts and data needed for comprehensive UX testing of the client onboarding changes.

---

## 👤 Test Accounts Setup

### Test Client Account (New User)

**Purpose**: Test new client onboarding flow

**Setup Steps**:
1. Use a test email (e.g., `test.client+onboarding@example.com`)
2. Sign up as new client
3. Complete onboarding Steps 1 & 2
4. Verify completion message
5. Note: This account will be used for onboarding testing

**Test Data**:
```
Email: test.client+onboarding@example.com
Phone: +44 7700 900123
Location: London, UK
First Name: Test
Last Name: Client
```

---

### Test Practitioner Account

**Purpose**: Test booking flow (hourly rate removal, cancellation policy)

**Setup Steps**:
1. Create practitioner account (if not exists)
2. Complete practitioner onboarding
3. Set up availability
4. Create test packages (NO hourly rate)
5. Verify packages display correctly

**Test Data**:
```
Email: test.practitioner@example.com
Name: Test Practitioner
Role: Sports Therapist
Location: London, UK
```

**Packages to Create**:
1. **60-minute Sports Massage** - £50
2. **90-minute Deep Tissue** - £75
3. **30-minute Consultation** - £30

**Important**: 
- ✅ Create packages (not hourly rate)
- ✅ Set different durations
- ✅ Set different prices
- ❌ Do NOT set hourly rate

---

### Test Guest User

**Purpose**: Test guest booking flow

**Setup Steps**:
1. Do NOT create account
2. Use booking flow as guest
3. Test cancellation policy display
4. Verify no hourly rate shown

**Test Data**:
```
Name: Guest User
Email: guest.test@example.com
Phone: +44 7700 900456
```

---

## 📦 Package Test Data

### Package 1: Basic Service
```
Name: 60-minute Sports Massage
Description: Therapeutic sports massage for athletes
Duration: 60 minutes
Price: £50.00 (5000 pence)
Currency: GBP
Active: Yes
```

### Package 2: Extended Service
```
Name: 90-minute Deep Tissue Massage
Description: Intensive deep tissue massage for chronic pain
Duration: 90 minutes
Price: £75.00 (7500 pence)
Currency: GBP
Active: Yes
```

### Package 3: Short Service
```
Name: 30-minute Consultation
Description: Initial consultation and assessment
Duration: 30 minutes
Price: £30.00 (3000 pence)
Currency: GBP
Active: Yes
```

---

## ⏰ Availability Test Data

### Practitioner Availability Setup

**Purpose**: Ensure booking flow can be tested

**Setup**:
1. Set availability for next 7 days
2. Include various time slots
3. Ensure slots available for all package durations

**Example Availability**:
```
Monday: 9:00 AM - 5:00 PM
Tuesday: 9:00 AM - 5:00 PM
Wednesday: 9:00 AM - 5:00 PM
Thursday: 9:00 AM - 5:00 PM
Friday: 9:00 AM - 5:00 PM
Saturday: 10:00 AM - 2:00 PM
Sunday: Closed
```

**Time Slots**: 30-minute intervals (9:00, 9:30, 10:00, etc.)

---

## 🔧 SQL Setup Scripts (Optional)

### Create Test Practitioner (if needed)

```sql
-- Note: This is example SQL - adjust based on your schema
-- Insert test practitioner user
INSERT INTO users (
  email,
  first_name,
  last_name,
  user_role,
  phone,
  location,
  onboarding_status,
  profile_completed
) VALUES (
  'test.practitioner@example.com',
  'Test',
  'Practitioner',
  'sports_therapist',
  '+44 7700 900789',
  'London, UK',
  'completed',
  true
) ON CONFLICT (email) DO NOTHING;
```

### Create Test Packages

```sql
-- Get practitioner ID first
-- Then create packages
INSERT INTO practitioner_products (
  practitioner_id,
  name,
  description,
  price_amount,
  duration_minutes,
  currency,
  is_active
) VALUES
  (
    (SELECT id FROM users WHERE email = 'test.practitioner@example.com'),
    '60-minute Sports Massage',
    'Therapeutic sports massage for athletes',
    5000,
    60,
    'GBP',
    true
  ),
  (
    (SELECT id FROM users WHERE email = 'test.practitioner@example.com'),
    '90-minute Deep Tissue Massage',
    'Intensive deep tissue massage for chronic pain',
    7500,
    90,
    'GBP',
    true
  ),
  (
    (SELECT id FROM users WHERE email = 'test.practitioner@example.com'),
    '30-minute Consultation',
    'Initial consultation and assessment',
    3000,
    30,
    'GBP',
    true
  );
```

---

## ✅ Pre-Test Checklist

### Test Accounts
- [ ] Test client account created (or ready to create)
- [ ] Test practitioner account exists
- [ ] Practitioner has packages set up
- [ ] Practitioner has availability set

### Test Data
- [ ] At least 3 packages created
- [ ] Packages have different durations (30, 60, 90 minutes)
- [ ] Packages have different prices
- [ ] All packages are active
- [ ] NO hourly rate set for practitioner

### Availability
- [ ] Availability set for next 7 days
- [ ] Time slots available for all package durations
- [ ] Availability visible in booking flow

### Environment
- [ ] Test environment accessible
- [ ] Browser cache cleared
- [ ] Incognito/private window ready
- [ ] Screen recording set up (if applicable)

---

## 🧹 Cleanup After Testing

### Test Data Cleanup (Optional)

**If you want to clean up test data after testing**:

```sql
-- Delete test packages (optional)
DELETE FROM practitioner_products 
WHERE practitioner_id = (
  SELECT id FROM users WHERE email = 'test.practitioner@example.com'
);

-- Delete test practitioner (optional)
DELETE FROM users 
WHERE email = 'test.practitioner@example.com';

-- Delete test client (optional)
DELETE FROM users 
WHERE email = 'test.client+onboarding@example.com';
```

**Note**: Only clean up if you're sure you don't need the test data anymore.

---

## 📝 Test Data Verification

### Before Starting Tests

**Verify Practitioner Setup**:
1. Log in as test practitioner
2. Check packages are visible
3. Verify NO hourly rate displayed
4. Check availability is set

**Verify Booking Flow**:
1. Navigate to marketplace
2. Find test practitioner
3. Verify card shows session count (not hourly rate)
4. Open booking flow
5. Verify packages are listed
6. Verify cancellation policy displays correctly

---

## 🚨 Common Setup Issues

### Issue 1: Packages Not Visible
**Symptom**: Booking flow shows no packages  
**Fix**: 
- Check packages are marked as `is_active = true`
- Verify practitioner_id matches
- Check package creation was successful

### Issue 2: Hourly Rate Still Showing
**Symptom**: Practitioner card shows hourly rate  
**Fix**:
- Check `PractitionerCard.tsx` - ensure hourly rate removed
- Verify practitioner doesn't have hourly_rate set in database
- Clear cache and refresh

### Issue 3: Availability Not Loading
**Symptom**: No time slots available  
**Fix**:
- Check practitioner availability is set
- Verify availability dates are in the future
- Check time slots match package durations

---

## 💡 Tips

1. **Use Test Emails**: Use `+` aliases for easy identification (e.g., `test+client1@example.com`)
2. **Keep It Simple**: Don't overcomplicate test data
3. **Document**: Note any custom test data you create
4. **Reuse**: Keep test accounts for multiple test sessions
5. **Clean**: Clean up test data periodically if needed

---

## 📊 Test Data Summary Template

```
Test Data Setup Summary
Date: _____
Tester: _____

Test Accounts:
- Client: [Email] - Status: ✅ / ❌
- Practitioner: [Email] - Status: ✅ / ❌
- Guest: N/A (no account needed)

Packages Created:
- Package 1: [Name] - Status: ✅ / ❌
- Package 2: [Name] - Status: ✅ / ❌
- Package 3: [Name] - Status: ✅ / ❌

Availability:
- Set for next 7 days: Yes / No
- Time slots available: Yes / No

Ready for Testing: ✅ Yes / ❌ No

Issues: _____
```

---

**Next Steps**:
1. Set up test accounts using this guide
2. Create test packages
3. Set up availability
4. Verify everything works
5. Start testing (see `CLIENT_ONBOARDING_UX_TESTING_QUICK_START.md`)



