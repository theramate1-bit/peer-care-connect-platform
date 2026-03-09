-- Treatment Exchange Test Data Setup Script
-- 
-- This script creates test accounts and data for treatment exchange testing
-- Run this in your test Supabase project SQL editor
--
-- WARNING: This script will create test users and data. 
-- Only run in a test environment, not production!

-- ============================================================================
-- CLEANUP: Remove existing test data (if any)
-- ============================================================================

-- Delete test requests
DELETE FROM treatment_exchange_requests 
WHERE requester_id IN (
  SELECT id FROM users WHERE email LIKE 'test.%@example.com'
) OR recipient_id IN (
  SELECT id FROM users WHERE email LIKE 'test.%@example.com'
);

-- Delete test sessions
DELETE FROM mutual_exchange_sessions 
WHERE practitioner_a_id IN (
  SELECT id FROM users WHERE email LIKE 'test.%@example.com'
) OR practitioner_b_id IN (
  SELECT id FROM users WHERE email LIKE 'test.%@example.com'
);

-- Delete test client_sessions
DELETE FROM client_sessions 
WHERE therapist_id IN (
  SELECT id FROM users WHERE email LIKE 'test.%@example.com'
) OR client_id IN (
  SELECT id FROM users WHERE email LIKE 'test.%@example.com'
);

-- Delete test slot holds
DELETE FROM slot_holds 
WHERE practitioner_id IN (
  SELECT id FROM users WHERE email LIKE 'test.%@example.com'
);

-- Delete test credit transactions
DELETE FROM credit_transactions 
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'test.%@example.com'
);

-- Delete test credits
DELETE FROM credits 
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'test.%@example.com'
);

-- Delete test users (will cascade to profiles)
DELETE FROM users WHERE email LIKE 'test.%@example.com';

-- ============================================================================
-- CREATE TEST PRACTITIONERS
-- ============================================================================

-- Practitioner A: Test Requester (has sufficient credits)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  'test.requester@example.com',
  crypt('TestPassword123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Test", "last_name": "Requester"}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING
RETURNING id INTO TEMP TABLE temp_requester_auth;

-- Get the auth user ID (this is a simplified version - in practice you'd need to handle this differently)
-- For now, we'll create the user record directly and reference it

-- Create user record for Practitioner A
INSERT INTO users (
  id,
  email,
  first_name,
  last_name,
  user_role,
  profile_completed,
  treatment_exchange_enabled,
  average_rating,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test.requester@example.com',
  'Test',
  'Requester',
  'sports_therapist',
  true,
  true,
  4.5, -- 4-5 star tier
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  user_role = EXCLUDED.user_role,
  profile_completed = EXCLUDED.profile_completed,
  treatment_exchange_enabled = EXCLUDED.treatment_exchange_enabled,
  average_rating = EXCLUDED.average_rating,
  is_active = EXCLUDED.is_active,
  updated_at = NOW()
RETURNING id INTO TEMP TABLE temp_requester_id;

-- Practitioner B: Test Recipient (has sufficient credits)
INSERT INTO users (
  id,
  email,
  first_name,
  last_name,
  user_role,
  profile_completed,
  treatment_exchange_enabled,
  average_rating,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test.recipient@example.com',
  'Test',
  'Recipient',
  'sports_therapist',
  true,
  true,
  4.5, -- 4-5 star tier (same as requester for matching)
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  user_role = EXCLUDED.user_role,
  profile_completed = EXCLUDED.profile_completed,
  treatment_exchange_enabled = EXCLUDED.treatment_exchange_enabled,
  average_rating = EXCLUDED.average_rating,
  is_active = EXCLUDED.is_active,
  updated_at = NOW()
RETURNING id INTO TEMP TABLE temp_recipient_id;

-- Practitioner C: Low Credits (for insufficient credits testing)
INSERT INTO users (
  id,
  email,
  first_name,
  last_name,
  user_role,
  profile_completed,
  treatment_exchange_enabled,
  average_rating,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test.lowcredits@example.com',
  'Test',
  'LowCredits',
  'sports_therapist',
  true,
  true,
  4.5,
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  user_role = EXCLUDED.user_role,
  profile_completed = EXCLUDED.profile_completed,
  treatment_exchange_enabled = EXCLUDED.treatment_exchange_enabled,
  average_rating = EXCLUDED.average_rating,
  is_active = EXCLUDED.is_active,
  updated_at = NOW()
RETURNING id INTO TEMP TABLE temp_lowcredits_id;

-- ============================================================================
-- SET UP CREDIT BALANCES
-- ============================================================================

-- Get user IDs (using subqueries since we can't use temp tables in this context)
-- In practice, you would run these queries separately or use a script

-- Practitioner A: 200 credits
INSERT INTO credits (user_id, balance, current_balance, created_at, updated_at)
SELECT 
  id,
  200,
  200,
  NOW(),
  NOW()
FROM users
WHERE email = 'test.requester@example.com'
ON CONFLICT (user_id) DO UPDATE SET
  balance = 200,
  current_balance = 200,
  updated_at = NOW();

-- Practitioner B: 200 credits
INSERT INTO credits (user_id, balance, current_balance, created_at, updated_at)
SELECT 
  id,
  200,
  200,
  NOW(),
  NOW()
FROM users
WHERE email = 'test.recipient@example.com'
ON CONFLICT (user_id) DO UPDATE SET
  balance = 200,
  current_balance = 200,
  updated_at = NOW();

-- Practitioner C: 10 credits (insufficient for 60-minute session)
INSERT INTO credits (user_id, balance, current_balance, created_at, updated_at)
SELECT 
  id,
  10,
  10,
  NOW(),
  NOW()
FROM users
WHERE email = 'test.lowcredits@example.com'
ON CONFLICT (user_id) DO UPDATE SET
  balance = 10,
  current_balance = 10,
  updated_at = NOW();

-- ============================================================================
-- CREATE TEST PRACTITIONER PROFILES
-- ============================================================================

-- Note: If you have a practitioners table, insert records here
-- Example:
-- INSERT INTO practitioners (user_id, bio, location, ...)
-- SELECT id, 'Test practitioner bio', 'London', ...
-- FROM users WHERE email = 'test.requester@example.com';

-- ============================================================================
-- CREATE TEST AVAILABILITY (Optional)
-- ============================================================================

-- Set up availability for test practitioners
-- This allows them to appear in eligible practitioners list
-- Example:
-- INSERT INTO practitioner_availability (practitioner_id, day_of_week, start_time, end_time, is_available)
-- SELECT id, 1, '09:00', '17:00', true FROM users WHERE email = 'test.requester@example.com';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify test users created
SELECT 
  email,
  first_name,
  last_name,
  user_role,
  profile_completed,
  treatment_exchange_enabled,
  average_rating,
  is_active
FROM users
WHERE email LIKE 'test.%@example.com'
ORDER BY email;

-- Verify credit balances
SELECT 
  u.email,
  c.balance,
  c.current_balance
FROM credits c
JOIN users u ON c.user_id = u.id
WHERE u.email LIKE 'test.%@example.com'
ORDER BY u.email;

-- ============================================================================
-- NOTES FOR MANUAL TESTING
-- ============================================================================

-- To use these test accounts:
-- 1. Sign in with email: test.requester@example.com, password: TestPassword123!
-- 2. Sign in with email: test.recipient@example.com, password: TestPassword123!
-- 3. Sign in with email: test.lowcredits@example.com, password: TestPassword123!
--
-- Test Scenarios:
-- 1. Happy Path: Use test.requester@example.com to send request to test.recipient@example.com
-- 2. Insufficient Credits: Use test.lowcredits@example.com to attempt sending request
-- 3. Decline Flow: Send request, then decline as recipient
-- 4. Cancellation: Accept request, then cancel with different time windows
--
-- Cleanup:
-- Run the DELETE statements at the top of this script to clean up test data










