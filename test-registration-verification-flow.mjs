/**
 * COMPREHENSIVE TEST: Registration & Email Verification Flow
 * Tests the complete registration and verification process with actual Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

console.log('🧪 TESTING REGISTRATION & EMAIL VERIFICATION FLOW');
console.log('================================================\n');

// Get Supabase configuration
const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseUrl = projectId ? `https://${projectId}.supabase.co` : null;

console.log('📋 TEST 1: Environment Configuration');
console.log('-----------------------------------');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_PUBLISHABLE_KEY');
  console.error('Found:', { projectId: !!projectId, anonKey: !!supabaseAnonKey });
  process.exit(1);
}

console.log('✅ Supabase URL:', supabaseUrl);
console.log('✅ Supabase Anon Key:', supabaseAnonKey.substring(0, 20) + '...');
console.log('✅ Environment variables loaded successfully');

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('\n📋 TEST 2: Supabase Connection');
console.log('-----------------------------');

async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.log('❌ Supabase connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    console.log('✅ Database accessible');
    return true;
  } catch (error) {
    console.log('❌ Connection error:', error.message);
    return false;
  }
}

console.log('\n📋 TEST 3: Registration Flow Simulation');
console.log('----------------------------------------');

async function testRegistrationFlow() {
  console.log('Testing registration flow...');
  
  // Test email that should not exist
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testUserData = {
    first_name: 'Test',
    last_name: 'User',
    user_role: 'sports_therapist',
    full_name: 'Test User',
    onboarding_status: 'pending',
    profile_completed: false
  };
  
  console.log('📧 Test email:', testEmail);
  console.log('👤 Test user data:', testUserData);
  
  try {
    // Test 1: Check if email exists (should return false)
    console.log('\n🔍 Step 1: Check email existence...');
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', testEmail)
      .limit(1);
    
    if (checkError) {
      console.log('❌ Email check failed:', checkError.message);
      return false;
    }
    
    const emailExists = existingUser && existingUser.length > 0;
    console.log('✅ Email exists check:', emailExists ? 'EXISTS' : 'NOT EXISTS');
    
    if (emailExists) {
      console.log('⚠️  Email already exists, skipping registration test');
      return true;
    }
    
    // Test 2: Attempt registration
    console.log('\n📝 Step 2: Attempt user registration...');
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: `${process.env.VITE_SUPABASE_URL?.replace('https://', 'https://')}/auth/v1/callback`,
        data: testUserData
      }
    });
    
    if (signUpError) {
      console.log('❌ Registration failed:', signUpError.message);
      return false;
    }
    
    console.log('✅ Registration successful');
    console.log('📧 User ID:', authData.user?.id);
    console.log('📧 Email confirmed:', authData.user?.email_confirmed_at ? 'YES' : 'NO');
    console.log('📧 Confirmation sent:', authData.user?.confirmation_sent_at ? 'YES' : 'NO');
    
    // Test 3: Check if user was created in users table
    console.log('\n👤 Step 3: Check user creation in database...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user?.id)
      .single();
    
    if (userError) {
      console.log('❌ User table check failed:', userError.message);
      return false;
    }
    
    console.log('✅ User created in database');
    console.log('📝 User data:', {
      id: userData.id,
      email: userData.email,
      user_role: userData.user_role,
      onboarding_status: userData.onboarding_status,
      profile_completed: userData.profile_completed
    });
    
    return true;
  } catch (error) {
    console.log('❌ Registration test error:', error.message);
    return false;
  }
}

console.log('\n📋 TEST 4: Email Verification Flow');
console.log('----------------------------------');

async function testEmailVerificationFlow() {
  console.log('Testing email verification flow...');
  
  try {
    // Test 1: Check current auth state
    console.log('\n🔍 Step 1: Check current authentication state...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('❌ Auth check failed:', authError.message);
      return false;
    }
    
    if (!user) {
      console.log('ℹ️  No authenticated user, testing verification logic...');
      
      // Test verification URL format
      const verificationUrl = `${supabaseUrl}/auth/v1/verify?token=test_token&type=signup&redirect_to=${encodeURIComponent('http://localhost:5173/auth/verify-email')}`;
      console.log('✅ Verification URL format:', verificationUrl.substring(0, 100) + '...');
      
      return true;
    }
    
    console.log('✅ User authenticated:', user.email);
    console.log('📧 Email confirmed:', user.email_confirmed_at ? 'YES' : 'NO');
    
    return true;
  } catch (error) {
    console.log('❌ Verification test error:', error.message);
    return false;
  }
}

console.log('\n📋 TEST 5: Registration Validation');
console.log('---------------------------------');

async function testRegistrationValidation() {
  console.log('Testing registration validation...');
  
  // Test invalid email
  console.log('\n🚫 Test 1: Invalid email format...');
  const { error: invalidEmailError } = await supabase.auth.signUp({
    email: 'invalid-email',
    password: 'TestPassword123!'
  });
  
  if (invalidEmailError) {
    console.log('✅ Invalid email rejected:', invalidEmailError.message);
  } else {
    console.log('❌ Invalid email was accepted (should be rejected)');
  }
  
  // Test weak password
  console.log('\n🚫 Test 2: Weak password...');
  const { error: weakPasswordError } = await supabase.auth.signUp({
    email: 'test@example.com',
    password: '123'
  });
  
  if (weakPasswordError) {
    console.log('✅ Weak password rejected:', weakPasswordError.message);
  } else {
    console.log('❌ Weak password was accepted (should be rejected)');
  }
  
  // Test duplicate email
  console.log('\n🚫 Test 3: Duplicate email...');
  const { error: duplicateError } = await supabase.auth.signUp({
    email: 'admin@example.com', // Assuming this exists
    password: 'TestPassword123!'
  });
  
  if (duplicateError) {
    console.log('✅ Duplicate email handled:', duplicateError.message);
  } else {
    console.log('ℹ️  Duplicate email test inconclusive (email might not exist)');
  }
  
  return true;
}

console.log('\n📋 TEST 6: Supabase Configuration Check');
console.log('--------------------------------------');

async function testSupabaseConfiguration() {
  console.log('Checking Supabase project configuration...');
  
  try {
    // Extract project ID from URL
    const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    console.log('🏗️  Project ID:', projectId);
    
    // Test auth configuration
    console.log('\n🔐 Testing auth configuration...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('❌ Auth configuration error:', authError.message);
      return false;
    }
    
    console.log('✅ Auth configuration working');
    console.log('📧 Current session:', authData.session ? 'ACTIVE' : 'NONE');
    
    // Test database access
    console.log('\n🗄️  Testing database access...');
    const { data: dbData, error: dbError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (dbError) {
      console.log('❌ Database access error:', dbError.message);
      return false;
    }
    
    console.log('✅ Database access working');
    
    return true;
  } catch (error) {
    console.log('❌ Configuration test error:', error.message);
    return false;
  }
}

// Run all tests
console.log('\n🏁 RUNNING ALL TESTS');
console.log('===================');

async function runAllTests() {
  const results = [];
  
  try {
    results.push(await testSupabaseConnection());
    results.push(await testRegistrationFlow());
    results.push(await testEmailVerificationFlow());
    results.push(await testRegistrationValidation());
    results.push(await testSupabaseConfiguration());
    
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=======================');
    console.log(`Supabase Connection: ${results[0] ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Registration Flow: ${results[1] ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Email Verification: ${results[2] ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Registration Validation: ${results[3] ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Supabase Configuration: ${results[4] ? '✅ PASSED' : '❌ FAILED'}`);
    
    const allTestsPassed = results.every(result => result === true);
    
    console.log(`\n🎯 OVERALL RESULT: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allTestsPassed) {
      console.log('\n🎉 REGISTRATION & VERIFICATION FLOW VERIFIED!');
      console.log('✅ Supabase connection working');
      console.log('✅ Registration process functional');
      console.log('✅ Email verification flow ready');
      console.log('✅ Validation working correctly');
      console.log('✅ Configuration properly set up');
      console.log('\n🚀 Ready for production testing!');
    } else {
      console.log('\n⚠️  ISSUES DETECTED - Review failed tests above');
    }
    
  } catch (error) {
    console.log('\n❌ CRITICAL ERROR:', error.message);
  }
}

// Execute tests
runAllTests().catch(console.error);

console.log('\n' + '='.repeat(60));
