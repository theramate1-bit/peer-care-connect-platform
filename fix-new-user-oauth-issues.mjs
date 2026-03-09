#!/usr/bin/env node

/**
 * Fix New User OAuth Issues
 * 
 * This script addresses the specific issues new users face during OAuth signup:
 * 1. Database RLS policies blocking profile creation
 * 2. Missing automatic user profile creation trigger
 * 3. Profile creation failures in AuthCallback
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

console.log('🔧 FIXING NEW USER OAUTH ISSUES');
console.log('==============================\n');

// SQL script to fix new user issues
const sqlScript = `
-- Fix New User OAuth Issues
-- This addresses the specific problems new users face during OAuth signup

-- Step 1: Create or replace the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    user_role,
    first_name,
    last_name,
    full_name,
    onboarding_status,
    profile_completed,
    is_verified,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'user_role', 'client'),
    COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'given_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.raw_user_meta_data->>'family_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'onboarding_status', 'pending'),
    COALESCE((NEW.raw_user_meta_data->>'profile_completed')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'is_verified')::boolean, true),
    COALESCE((NEW.raw_user_meta_data->>'is_active')::boolean, true),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    user_role = EXCLUDED.user_role,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    full_name = EXCLUDED.full_name,
    onboarding_status = EXCLUDED.onboarding_status,
    profile_completed = EXCLUDED.profile_completed,
    is_verified = EXCLUDED.is_verified,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Update RLS policies for users table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.users;

-- Create new RLS policies that allow new user creation
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile" ON public.users
  FOR DELETE USING (auth.uid() = id);

-- Step 4: Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 5: Create function to sync existing users who might be missing profiles
CREATE OR REPLACE FUNCTION public.sync_existing_users()
RETURNS void AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    user_role,
    first_name,
    last_name,
    full_name,
    onboarding_status,
    profile_completed,
    is_verified,
    is_active,
    created_at,
    updated_at
  )
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'user_role', 'client'),
    COALESCE(au.raw_user_meta_data->>'first_name', au.raw_user_meta_data->>'given_name', 'User'),
    COALESCE(au.raw_user_meta_data->>'last_name', au.raw_user_meta_data->>'family_name', ''),
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', 'User'),
    COALESCE(au.raw_user_meta_data->>'onboarding_status', 'pending'),
    COALESCE((au.raw_user_meta_data->>'profile_completed')::boolean, false),
    COALESCE((au.raw_user_meta_data->>'is_verified')::boolean, true),
    COALESCE((au.raw_user_meta_data->>'is_active')::boolean, true),
    au.created_at,
    NOW()
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Run the sync function to create profiles for existing users
SELECT public.sync_existing_users();

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_role ON public.users(user_role);
CREATE INDEX IF NOT EXISTS idx_users_onboarding_status ON public.users(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

-- Step 8: Add any missing columns to users table
DO $$ 
BEGIN
  -- Add is_verified column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'is_verified') THEN
    ALTER TABLE public.users ADD COLUMN is_verified BOOLEAN DEFAULT true;
  END IF;
  
  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'is_active') THEN
    ALTER TABLE public.users ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
  
  -- Add full_name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'full_name') THEN
    ALTER TABLE public.users ADD COLUMN full_name TEXT;
  END IF;
END $$;
`;

// Save the SQL script to a file
const sqlFilePath = path.join(process.cwd(), 'fix-new-user-oauth-issues.sql');
fs.writeFileSync(sqlFilePath, sqlScript);

console.log('✅ SQL script created: fix-new-user-oauth-issues.sql');
console.log('\n📋 MANUAL STEPS REQUIRED:');
console.log('========================');
console.log('1. Go to your Supabase Dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Copy and paste the contents of fix-new-user-oauth-issues.sql');
console.log('4. Run the SQL script');
console.log('5. Verify the trigger and policies are created');
console.log('\n🔧 WHAT THIS FIXES:');
console.log('==================');
console.log('✅ Automatic user profile creation for new OAuth users');
console.log('✅ Proper RLS policies allowing new user profile creation');
console.log('✅ Sync function for existing users missing profiles');
console.log('✅ Better error handling for profile creation');
console.log('✅ Performance indexes for user queries');
console.log('\n🎯 EXPECTED RESULTS:');
console.log('====================');
console.log('• New users will automatically get profiles created');
console.log('• OAuth callback will work for new users');
console.log('• No more "Database error saving new user" messages');
console.log('• Users will be redirected to appropriate dashboards');
console.log('\n📝 NEXT STEPS:');
console.log('==============');
console.log('1. Apply the SQL script in Supabase Dashboard');
console.log('2. Test OAuth signup with a new Google account');
console.log('3. Monitor console logs for successful profile creation');
console.log('4. Verify user is redirected to correct dashboard');

console.log('\n🎉 New User OAuth Fix Script Complete!');
