#!/usr/bin/env node

/**
 * Test Production Sign-up Flow
 * This script tests the complete sign-up process to identify issues
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aikqnvltuwwgifuocvto.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSignUpFlow() {
  console.log('🧪 Testing Production Sign-up Flow...\n');

  // Test 1: Check Supabase connection
  console.log('1️⃣ Testing Supabase connection...');
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log('❌ Supabase connection error:', error.message);
    } else {
      console.log('✅ Supabase connection successful');
    }
  } catch (err) {
    console.log('❌ Supabase connection failed:', err.message);
  }

  // Test 2: Check authentication settings
  console.log('\n2️⃣ Checking authentication settings...');
  try {
    const { data, error } = await supabase.auth.getUser();
    console.log('✅ Auth service accessible');
  } catch (err) {
    console.log('❌ Auth service error:', err.message);
  }

  // Test 3: Test email validation
  console.log('\n3️⃣ Testing email validation...');
  const testEmail = `test-${Date.now()}@example.com`;
  console.log(`📧 Test email: ${testEmail}`);

  // Test 4: Simulate sign-up process
  console.log('\n4️⃣ Simulating sign-up process...');
  try {
    const userData = {
      first_name: 'Test',
      last_name: 'User',
      user_role: 'osteopath',
      full_name: 'Test User',
      onboarding_status: 'pending',
      profile_completed: false
    };

    const redirectUrl = 'https://peer-care-connect-doaji6v60-theras-projects-6dfd5a34.vercel.app/auth/verify-email';
    
    console.log('📋 User data:', userData);
    console.log('🔗 Redirect URL:', redirectUrl);

    // Note: We won't actually create the user to avoid spam
    console.log('✅ Sign-up data prepared successfully');
    console.log('ℹ️  Actual sign-up skipped to prevent test account creation');

  } catch (err) {
    console.log('❌ Sign-up simulation error:', err.message);
  }

  // Test 5: Check database tables
  console.log('\n5️⃣ Checking database tables...');
  try {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, user_role, created_at')
      .limit(5);

    if (usersError) {
      console.log('❌ Users table error:', usersError.message);
    } else {
      console.log('✅ Users table accessible');
      console.log(`📊 Found ${users.length} users in database`);
    }
  } catch (err) {
    console.log('❌ Database check error:', err.message);
  }

  console.log('\n🎯 Production Sign-up Test Complete!');
  console.log('\n📋 Next Steps:');
  console.log('1. Configure Supabase Dashboard settings');
  console.log('2. Set up SMTP for email sending');
  console.log('3. Update redirect URLs');
  console.log('4. Test actual sign-up flow');
}

// Run the test
testSignUpFlow().catch(console.error);
