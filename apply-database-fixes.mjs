/**
 * Apply Database Fixes Directly
 * This script applies the database fixes using the Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

console.log('🔧 APPLYING DATABASE FIXES');
console.log('==========================\n');

// Get Supabase configuration
const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseUrl = projectId ? `https://${projectId}.supabase.co` : null;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// SQL script to apply fixes
const sqlScript = `
-- Fix User Profile Creation and RLS Policies
-- This addresses the issues found in registration testing:
-- 1. RLS policy blocking user profile creation
-- 2. Missing automatic user profile creation trigger

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
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'user_role', 'client'),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'onboarding_status', 'pending'),
    COALESCE((NEW.raw_user_meta_data->>'profile_completed')::boolean, false),
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

-- Create new RLS policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Step 4: Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 5: Create function to sync existing users
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
    created_at,
    updated_at
  )
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'user_role', 'client'),
    au.raw_user_meta_data->>'first_name',
    au.raw_user_meta_data->>'last_name',
    au.raw_user_meta_data->>'full_name',
    COALESCE(au.raw_user_meta_data->>'onboarding_status', 'pending'),
    COALESCE((au.raw_user_meta_data->>'profile_completed')::boolean, false),
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
`;

async function applyFixes() {
  try {
    console.log('📋 Applying database fixes...');
    console.log('Project:', projectId);
    console.log('URL:', supabaseUrl);
    
    // Note: This approach won't work with the anon key as it doesn't have admin privileges
    // The SQL needs to be run in the Supabase Dashboard with admin privileges
    
    console.log('\n⚠️  IMPORTANT: This script cannot apply the fixes directly');
    console.log('The anon key doesn\'t have sufficient privileges to create functions and triggers.');
    console.log('\n📋 MANUAL STEPS REQUIRED:');
    console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/' + projectId);
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the SQL script from: fix-user-profile-creation.sql');
    console.log('4. Run the SQL script');
    
    console.log('\n📄 SQL Script Location: fix-user-profile-creation.sql');
    console.log('🔗 Dashboard URL: https://supabase.com/dashboard/project/' + projectId + '/sql');
    
    return false; // Indicates manual action required
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

// Run the application
console.log('\n🏁 APPLYING FIXES');
console.log('=================');

applyFixes().then(success => {
  if (!success) {
    console.log('\n💡 NEXT STEPS:');
    console.log('==============');
    console.log('1. Open the Supabase Dashboard');
    console.log('2. Go to SQL Editor');
    console.log('3. Run the SQL script from fix-user-profile-creation.sql');
    console.log('4. Test the registration flow again');
  }
}).catch(console.error);

console.log('\n' + '='.repeat(50));
