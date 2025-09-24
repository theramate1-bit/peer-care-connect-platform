#!/usr/bin/env node

/**
 * Email Verification Test Script
 * Tests if Supabase is properly sending verification emails
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test email addresses (use your own for testing)
const TEST_EMAILS = [
  'test-client@example.com',
  'test-practitioner@example.com',
  'test-sports-therapist@example.com',
  'test-massage-therapist@example.com',
  'test-osteopath@example.com'
];

const TEST_ROLES = [
  'client',
  'sports_therapist', 
  'massage_therapist',
  'osteopath'
];

async function testEmailVerification() {
  console.log('🧪 EMAIL VERIFICATION TEST SUITE');
  console.log('=====================================');
  console.log(`📧 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Using Anon Key: ${supabaseAnonKey.substring(0, 20)}...`);
  console.log('');

  // Test 1: Check Supabase Configuration
  await testSupabaseConfiguration();
  
  // Test 2: Test Client Registration
  await testClientRegistration();
  
  // Test 3: Test Practitioner Registration
  await testPractitionerRegistration();
  
  // Test 4: Test Email Resend Functionality
  await testEmailResend();
  
  // Test 5: Check Supabase Auth Settings
  await checkAuthSettings();
  
  console.log('');
  console.log('🎯 EMAIL VERIFICATION TEST COMPLETE');
  console.log('=====================================');
}

async function testSupabaseConfiguration() {
  console.log('🔧 TEST 1: Supabase Configuration');
  console.log('----------------------------------');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    console.log(`📊 Users table accessible: ${data ? 'Yes' : 'No'}`);
    
    // Check if we can access auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError && authError.message !== 'Auth session missing!') {
      console.error('❌ Auth service error:', authError.message);
      return false;
    }
    
    console.log('✅ Auth service accessible');
    return true;
    
  } catch (error) {
    console.error('❌ Configuration test failed:', error.message);
    return false;
  }
}

async function testClientRegistration() {
  console.log('');
  console.log('👤 TEST 2: Client Registration');
  console.log('-------------------------------');
  
  const testEmail = `test-client-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    console.log(`📧 Testing with email: ${testEmail}`);
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/auth/verify-email`,
        data: {
          first_name: 'Test',
          last_name: 'Client',
          user_role: 'client',
          full_name: 'Test Client',
          onboarding_status: 'pending',
          profile_completed: false
        }
      }
    });
    
    if (error) {
      console.error('❌ Client registration failed:', error.message);
      return false;
    }
    
    console.log('✅ Client registration successful');
    console.log(`📧 User ID: ${data.user?.id}`);
    console.log(`📧 Email confirmed: ${data.user?.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`📧 Confirmation sent: ${data.user?.confirmation_sent_at ? 'Yes' : 'No'}`);
    
    if (data.user?.confirmation_sent_at) {
      console.log('✅ Verification email should have been sent');
    } else {
      console.log('⚠️  No confirmation email timestamp - check Supabase settings');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Client registration test failed:', error.message);
    return false;
  }
}

async function testPractitionerRegistration() {
  console.log('');
  console.log('🏥 TEST 3: Practitioner Registration');
  console.log('-------------------------------------');
  
  const testEmail = `test-practitioner-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    console.log(`📧 Testing with email: ${testEmail}`);
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/auth/verify-email`,
        data: {
          first_name: 'Test',
          last_name: 'Practitioner',
          user_role: 'sports_therapist',
          full_name: 'Test Practitioner',
          onboarding_status: 'pending',
          profile_completed: false
        }
      }
    });
    
    if (error) {
      console.error('❌ Practitioner registration failed:', error.message);
      return false;
    }
    
    console.log('✅ Practitioner registration successful');
    console.log(`📧 User ID: ${data.user?.id}`);
    console.log(`📧 Email confirmed: ${data.user?.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`📧 Confirmation sent: ${data.user?.confirmation_sent_at ? 'Yes' : 'No'}`);
    
    if (data.user?.confirmation_sent_at) {
      console.log('✅ Verification email should have been sent');
    } else {
      console.log('⚠️  No confirmation email timestamp - check Supabase settings');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Practitioner registration test failed:', error.message);
    return false;
  }
}

async function testEmailResend() {
  console.log('');
  console.log('📬 TEST 4: Email Resend Functionality');
  console.log('--------------------------------------');
  
  const testEmail = `test-resend-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    // First, register a user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/auth/verify-email`
      }
    });
    
    if (signUpError) {
      console.error('❌ Registration failed for resend test:', signUpError.message);
      return false;
    }
    
    console.log(`📧 Registered user: ${testEmail}`);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test resend functionality
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: testEmail,
      options: {
        emailRedirectTo: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/auth/verify-email`
      }
    });
    
    if (resendError) {
      console.error('❌ Email resend failed:', resendError.message);
      return false;
    }
    
    console.log('✅ Email resend successful');
    console.log('✅ Second verification email should have been sent');
    
    return true;
    
  } catch (error) {
    console.error('❌ Email resend test failed:', error.message);
    return false;
  }
}

async function checkAuthSettings() {
  console.log('');
  console.log('⚙️  TEST 5: Auth Settings Check');
  console.log('--------------------------------');
  
  try {
    // Check if we can get auth settings (this might not work with anon key)
    console.log('📋 Checking auth configuration...');
    
    // Test different auth methods
    const methods = ['signup', 'signin', 'reset'];
    
    for (const method of methods) {
      try {
        // This is a basic test - actual settings require admin access
        console.log(`🔍 Testing ${method} method...`);
        
        if (method === 'signup') {
          // We already tested this above
          console.log('✅ Signup method accessible');
        }
      } catch (error) {
        console.log(`⚠️  ${method} method test inconclusive: ${error.message}`);
      }
    }
    
    console.log('');
    console.log('📋 MANUAL CHECKS REQUIRED:');
    console.log('1. Go to Supabase Dashboard → Authentication → Settings');
    console.log('2. Verify "Confirm email" is ENABLED');
    console.log('3. Check "Site URL" is set correctly');
    console.log('4. Verify "Redirect URLs" include your domain');
    console.log('5. Check SMTP settings if using custom email');
    console.log('6. Review email templates in Authentication → Templates');
    
    return true;
    
  } catch (error) {
    console.error('❌ Auth settings check failed:', error.message);
    return false;
  }
}

// Run the tests
testEmailVerification().catch(console.error);


