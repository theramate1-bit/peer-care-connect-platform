# Treatment Exchange Test Data Setup Guide

This guide explains how to set up test data for treatment exchange testing.

## Prerequisites

1. Access to Supabase SQL Editor (test environment)
2. Admin access to create test users
3. Understanding of the treatment exchange system

## Test Accounts

The SQL script creates three test practitioner accounts:

### 1. Practitioner A (Test Requester)
- **Email**: `test.requester@example.com`
- **Password**: `TestPassword123!`
- **Credits**: 200
- **Rating**: 4.5 stars (4-5 star tier)
- **Role**: Sports Therapist
- **Purpose**: Send treatment exchange requests

### 2. Practitioner B (Test Recipient)
- **Email**: `test.recipient@example.com`
- **Password**: `TestPassword123!`
- **Credits**: 200
- **Rating**: 4.5 stars (4-5 star tier)
- **Role**: Sports Therapist
- **Purpose**: Receive and accept/decline requests

### 3. Practitioner C (Low Credits)
- **Email**: `test.lowcredits@example.com`
- **Password**: `TestPassword123!`
- **Credits**: 10
- **Rating**: 4.5 stars
- **Role**: Sports Therapist
- **Purpose**: Test insufficient credits scenario

## Setup Instructions

### Step 1: Run SQL Script

1. Open Supabase SQL Editor
2. Copy contents of `treatment-exchange-setup.sql`
3. Run the script in your test Supabase project
4. Verify test users were created

### Step 2: Verify Test Data

Run these verification queries:

```sql
-- Check users
SELECT email, first_name, last_name, user_role, treatment_exchange_enabled, average_rating
FROM users
WHERE email LIKE 'test.%@example.com';

-- Check credits
SELECT u.email, c.balance, c.current_balance
FROM credits c
JOIN users u ON c.user_id = u.id
WHERE u.email LIKE 'test.%@example.com';
```

### Step 3: Set Up Authentication (if needed)

If test users need to be created in Supabase Auth:

1. Go to Supabase Dashboard > Authentication > Users
2. Create users manually OR
3. Use Supabase Auth API to create users programmatically

**Note**: The SQL script creates user records in the `users` table, but you may need to create corresponding auth users separately depending on your setup.

## Test Scenarios

### Scenario 1: Happy Path
1. Log in as `test.requester@example.com`
2. Navigate to Treatment Exchange page
3. Select `test.recipient@example.com`
4. Send 60-minute request
5. Log in as `test.recipient@example.com`
6. Accept request
7. Verify credits deducted (60 from requester, +60 to recipient)

### Scenario 2: Insufficient Credits
1. Log in as `test.lowcredits@example.com`
2. Attempt to send 60-minute request
3. Verify error message displayed

### Scenario 3: Decline Flow
1. Send request from requester to recipient
2. Log in as recipient
3. Decline request
4. Verify no credits deducted
5. Verify request removed from dashboard

### Scenario 4: Cancellation with Refund
1. Accept a request
2. Cancel session 25+ hours before scheduled time
3. Verify 100% refund processed
4. Verify credits returned to cancelling practitioner

## Cleanup

To clean up test data, run the DELETE statements at the top of `treatment-exchange-setup.sql`:

```sql
-- Delete test requests
DELETE FROM treatment_exchange_requests 
WHERE requester_id IN (
  SELECT id FROM users WHERE email LIKE 'test.%@example.com'
);

-- Delete test sessions
DELETE FROM mutual_exchange_sessions 
WHERE practitioner_a_id IN (
  SELECT id FROM users WHERE email LIKE 'test.%@example.com'
);

-- Delete test credits
DELETE FROM credits 
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'test.%@example.com'
);

-- Delete test users
DELETE FROM users WHERE email LIKE 'test.%@example.com';
```

## Troubleshooting

### Issue: Users not created
- **Solution**: Check if email conflicts exist. The script uses `ON CONFLICT DO UPDATE` to handle existing users.

### Issue: Credits not set up
- **Solution**: Verify user IDs exist before inserting credits. Run verification queries to check.

### Issue: Cannot log in
- **Solution**: Ensure auth users are created in Supabase Auth. The SQL script only creates user records, not auth users.

### Issue: Treatment exchange not enabled
- **Solution**: Verify `treatment_exchange_enabled = true` in users table. Update if needed:
  ```sql
  UPDATE users 
  SET treatment_exchange_enabled = true 
  WHERE email LIKE 'test.%@example.com';
  ```

## Additional Test Data

For more complex scenarios, you may want to create:

1. **Expired Requests**: Set `expires_at` to past date
2. **Different Rating Tiers**: Create practitioners with 2-3 star and 0-1 star ratings
3. **Multiple Pending Requests**: Create several requests for same recipient
4. **Accepted Sessions**: Create accepted sessions for cancellation testing

## Security Notes

⚠️ **WARNING**: 
- Only use these test accounts in test environments
- Never use test passwords in production
- Clean up test data regularly
- Do not commit test account credentials to version control










