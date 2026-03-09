-- Comprehensive diagnostic for admin@pinpointtherapyuk.com
-- Run this in Supabase Dashboard > SQL Editor

-- 1. Check user profile
SELECT 
  'USER PROFILE' as check_type,
  email,
  first_name,
  last_name,
  user_role,
  onboarding_status,
  profile_completed,
  phone,
  location,
  bio,
  experience_years,
  professional_body,
  registration_number,
  services_offered,
  has_liability_insurance,
  treatment_exchange_enabled,
  is_active,
  created_at,
  updated_at
FROM public.users
WHERE email = 'admin@pinpointtherapyuk.com';

-- 2. Check subscription status
SELECT 
  'SUBSCRIPTION' as check_type,
  s.id,
  s.user_id,
  s.plan_id,
  s.status,
  s.current_period_start,
  s.current_period_end,
  s.stripe_subscription_id,
  s.created_at
FROM public.subscriptions s
JOIN public.users u ON s.user_id = u.id
WHERE u.email = 'admin@pinpointtherapyuk.com'
ORDER BY s.created_at DESC
LIMIT 5;

-- 3. Check credits balance
SELECT 
  'CREDITS' as check_type,
  c.user_id,
  c.balance,
  c.current_balance,
  c.last_allocation_date,
  c.updated_at
FROM public.credits c
JOIN public.users u ON c.user_id = u.id
WHERE u.email = 'admin@pinpointtherapyuk.com';

-- 4. Check Stripe Connect account
SELECT 
  'STRIPE CONNECT' as check_type,
  sc.user_id,
  sc.stripe_account_id,
  sc.charges_enabled,
  sc.payouts_enabled,
  sc.details_submitted,
  sc.account_status,
  sc.created_at
FROM public.stripe_connect_accounts sc
JOIN public.users u ON sc.user_id = u.id
WHERE u.email = 'admin@pinpointtherapyuk.com';

-- 5. Check onboarding progress (if saved)
SELECT 
  'ONBOARDING PROGRESS' as check_type,
  op.current_step,
  op.total_steps,
  op.form_data,
  op.completed_steps,
  op.last_saved_at
FROM public.onboarding_progress op
JOIN public.users u ON op.user_id = u.id
WHERE u.email = 'admin@pinpointtherapyuk.com';

-- 6. Check specializations
SELECT 
  'SPECIALIZATIONS' as check_type,
  s.name,
  s.category
FROM public.practitioner_specializations ps
JOIN public.specializations s ON ps.specialization_id = s.id
JOIN public.users u ON ps.practitioner_id = u.id
WHERE u.email = 'admin@pinpointtherapyuk.com';

-- 7. Check qualifications
SELECT 
  'QUALIFICATIONS' as check_type,
  q.name,
  q.institution,
  q.year_obtained,
  q.verified
FROM public.qualifications q
JOIN public.users u ON q.practitioner_id = u.id
WHERE u.email = 'admin@pinpointtherapyuk.com';

-- 8. Check therapist profile
SELECT 
  'THERAPIST PROFILE' as check_type,
  tp.professional_statement,
  tp.treatment_philosophy,
  tp.created_at,
  tp.updated_at
FROM public.therapist_profiles tp
JOIN public.users u ON tp.user_id = u.id
WHERE u.email = 'admin@pinpointtherapyuk.com';
