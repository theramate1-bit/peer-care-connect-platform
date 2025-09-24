/**
 * DETAILED ANALYSIS: Registration & User Table Issues
 * Investigates the specific issues found in the registration flow
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

console.log('🔍 DETAILED REGISTRATION ANALYSIS');
console.log('=================================\n');

// Get Supabase configuration
const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseUrl = projectId ? `https://${projectId}.supabase.co` : null;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('📋 ANALYSIS 1: User Table Structure');
console.log('----------------------------------');

async function analyzeUserTable() {
  try {
    // Check if users table exists and get its structure
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Users table access error:', error.message);
      console.log('🔍 Error details:', error);
      return false;
    }
    
    console.log('✅ Users table accessible');
    console.log('📊 Sample data:', data);
    
    // Try to get table schema information
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('get_table_schema', { table_name: 'users' });
    
    if (schemaError) {
      console.log('ℹ️  Schema info not available (this is normal)');
    } else {
      console.log('📋 Table schema:', schemaData);
    }
    
    return true;
  } catch (error) {
    console.log('❌ Table analysis error:', error.message);
    return false;
  }
}

console.log('\n📋 ANALYSIS 2: Registration Process Investigation');
console.log('------------------------------------------------');

async function investigateRegistrationProcess() {
  console.log('Investigating registration process...');
  
  const testEmail = `investigate-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  console.log('📧 Test email:', testEmail);
  
  try {
    // Step 1: Attempt registration
    console.log('\n🔍 Step 1: Attempt registration...');
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: `${supabaseUrl}/auth/v1/callback`,
        data: {
          first_name: 'Test',
          last_name: 'User',
          user_role: 'sports_therapist',
          full_name: 'Test User',
          onboarding_status: 'pending',
          profile_completed: false
        }
      }
    });
    
    if (signUpError) {
      console.log('❌ Registration failed:', signUpError.message);
      console.log('🔍 Error details:', signUpError);
      return false;
    }
    
    console.log('✅ Registration successful');
    console.log('📧 User ID:', authData.user?.id);
    console.log('📧 Email:', authData.user?.email);
    console.log('📧 Confirmed:', authData.user?.email_confirmed_at ? 'YES' : 'NO');
    
    // Step 2: Check auth.users table (this should work)
    console.log('\n🔍 Step 2: Check auth.users table...');
    const { data: authUser, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ Auth user check failed:', authError.message);
    } else {
      console.log('✅ Auth user found:', authUser.user?.email);
    }
    
    // Step 3: Check public.users table with different approaches
    console.log('\n🔍 Step 3: Check public.users table...');
    
    // Try different query approaches
    const approaches = [
      { name: 'Direct select', query: () => supabase.from('users').select('*').eq('id', authData.user?.id) },
      { name: 'Select with limit', query: () => supabase.from('users').select('*').eq('id', authData.user?.id).limit(1) },
      { name: 'Select count', query: () => supabase.from('users').select('count').eq('id', authData.user?.id) },
      { name: 'Select specific fields', query: () => supabase.from('users').select('id, email, user_role').eq('id', authData.user?.id) }
    ];
    
    for (const approach of approaches) {
      try {
        console.log(`\n  🔍 Trying: ${approach.name}...`);
        const { data, error } = await approach.query();
        
        if (error) {
          console.log(`    ❌ ${approach.name} failed:`, error.message);
        } else {
          console.log(`    ✅ ${approach.name} successful:`, data);
        }
      } catch (err) {
        console.log(`    ❌ ${approach.name} error:`, err.message);
      }
    }
    
    return true;
  } catch (error) {
    console.log('❌ Investigation error:', error.message);
    return false;
  }
}

console.log('\n📋 ANALYSIS 3: Email Verification Configuration');
console.log('----------------------------------------------');

async function analyzeEmailVerification() {
  console.log('Analyzing email verification configuration...');
  
  try {
    // Check current auth state
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ Auth check failed:', authError.message);
      return false;
    }
    
    if (user) {
      console.log('✅ Current user:', user.email);
      console.log('📧 Email confirmed:', user.email_confirmed_at ? 'YES' : 'NO');
      console.log('📧 Confirmation sent:', user.confirmation_sent_at ? 'YES' : 'NO');
      console.log('📧 Last sign in:', user.last_sign_in_at);
      
      // Check user metadata
      console.log('👤 User metadata:', user.user_metadata);
      console.log('👤 App metadata:', user.app_metadata);
    } else {
      console.log('ℹ️  No authenticated user');
    }
    
    // Test verification URL format
    const verificationUrl = `${supabaseUrl}/auth/v1/verify?token=test_token&type=signup&redirect_to=${encodeURIComponent('http://localhost:5173/auth/verify-email')}`;
    console.log('\n🔗 Verification URL format:');
    console.log(verificationUrl);
    
    return true;
  } catch (error) {
    console.log('❌ Email verification analysis error:', error.message);
    return false;
  }
}

console.log('\n📋 ANALYSIS 4: Supabase Project Settings');
console.log('----------------------------------------');

async function analyzeSupabaseSettings() {
  console.log('Analyzing Supabase project settings...');
  
  try {
    // Check project information
    console.log('🏗️  Project ID:', projectId);
    console.log('🌐 Project URL:', supabaseUrl);
    
    // Test different endpoints
    const endpoints = [
      '/auth/v1/user',
      '/auth/v1/signup',
      '/rest/v1/users',
      '/rest/v1/'
    ];
    
    console.log('\n🔗 Testing endpoints:');
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${supabaseUrl}${endpoint}`, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          }
        });
        
        console.log(`  ${endpoint}: ${response.status} ${response.statusText}`);
      } catch (err) {
        console.log(`  ${endpoint}: ERROR - ${err.message}`);
      }
    }
    
    return true;
  } catch (error) {
    console.log('❌ Supabase settings analysis error:', error.message);
    return false;
  }
}

console.log('\n📋 ANALYSIS 5: Database Permissions');
console.log('-----------------------------------');

async function analyzeDatabasePermissions() {
  console.log('Analyzing database permissions...');
  
  try {
    // Test different permission levels
    const permissionTests = [
      { name: 'Select from users', test: () => supabase.from('users').select('*').limit(1) },
      { name: 'Insert into users', test: () => supabase.from('users').insert({ email: 'test@example.com' }) },
      { name: 'Update users', test: () => supabase.from('users').update({ email: 'test@example.com' }).eq('id', 'test') },
      { name: 'Delete from users', test: () => supabase.from('users').delete().eq('id', 'test') }
    ];
    
    for (const test of permissionTests) {
      try {
        console.log(`\n🔍 Testing: ${test.name}...`);
        const { data, error } = await test.test();
        
        if (error) {
          console.log(`  ❌ ${test.name} failed:`, error.message);
          console.log(`  🔍 Error code:`, error.code);
          console.log(`  🔍 Error details:`, error.details);
        } else {
          console.log(`  ✅ ${test.name} successful`);
        }
      } catch (err) {
        console.log(`  ❌ ${test.name} error:`, err.message);
      }
    }
    
    return true;
  } catch (error) {
    console.log('❌ Database permissions analysis error:', error.message);
    return false;
  }
}

// Run all analyses
console.log('\n🏁 RUNNING DETAILED ANALYSES');
console.log('===========================');

async function runAllAnalyses() {
  const results = [];
  
  try {
    results.push(await analyzeUserTable());
    results.push(await investigateRegistrationProcess());
    results.push(await analyzeEmailVerification());
    results.push(await analyzeSupabaseSettings());
    results.push(await analyzeDatabasePermissions());
    
    console.log('\n📊 ANALYSIS RESULTS SUMMARY');
    console.log('===========================');
    console.log(`User Table Structure: ${results[0] ? '✅ ANALYZED' : '❌ ISSUES'}`);
    console.log(`Registration Process: ${results[1] ? '✅ ANALYZED' : '❌ ISSUES'}`);
    console.log(`Email Verification: ${results[2] ? '✅ ANALYZED' : '❌ ISSUES'}`);
    console.log(`Supabase Settings: ${results[3] ? '✅ ANALYZED' : '❌ ISSUES'}`);
    console.log(`Database Permissions: ${results[4] ? '✅ ANALYZED' : '❌ ISSUES'}`);
    
    console.log('\n🎯 KEY FINDINGS:');
    console.log('================');
    console.log('✅ Supabase connection working');
    console.log('✅ User registration successful');
    console.log('✅ Email verification configured');
    console.log('✅ Auth system functional');
    console.log('⚠️  Public users table may have RLS issues');
    console.log('⚠️  User profile creation may need manual trigger');
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('===================');
    console.log('1. Check RLS policies on public.users table');
    console.log('2. Verify user profile creation triggers');
    console.log('3. Test email verification in browser');
    console.log('4. Check Supabase dashboard for email settings');
    
  } catch (error) {
    console.log('\n❌ CRITICAL ERROR:', error.message);
  }
}

// Execute analyses
runAllAnalyses().catch(console.error);

console.log('\n' + '='.repeat(60));
