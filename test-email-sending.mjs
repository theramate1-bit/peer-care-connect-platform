#!/usr/bin/env node

/**
 * Simple Email Sending Test
 * Tests if Supabase is actually sending emails
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEmailSending() {
  console.log('📧 EMAIL SENDING TEST');
  console.log('====================');
  console.log(`🌐 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Anon Key: ${supabaseAnonKey.substring(0, 20)}...`);
  console.log('');

  // Test with a real email (replace with your email for testing)
  const testEmail = 'rayman196823@gmail.com'; // Use your actual email for testing
  const testPassword = 'TestPassword123!';
  
  console.log(`📧 Testing with email: ${testEmail}`);
  console.log('⚠️  IMPORTANT: Check your email inbox and spam folder!');
  console.log('');

  try {
    // Test client registration
    console.log('👤 Testing CLIENT registration...');
    const clientEmail = `client-${Date.now()}@gmail.com`;
    
    const { data: clientData, error: clientError } = await supabase.auth.signUp({
      email: clientEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'https://peer-care-connect-596lwcpa8-theras-projects-6dfd5a34.vercel.app/auth/verify-email',
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

    if (clientError) {
      console.error('❌ Client registration failed:', clientError.message);
    } else {
      console.log('✅ Client registration successful');
      console.log(`📧 User ID: ${clientData.user?.id}`);
      console.log(`📧 Email confirmed: ${clientData.user?.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`📧 Confirmation sent: ${clientData.user?.confirmation_sent_at ? 'Yes' : 'No'}`);
      
      if (clientData.user?.confirmation_sent_at) {
        console.log('✅ Verification email SENT to:', clientEmail);
        console.log('📬 Check your email inbox and spam folder!');
      } else {
        console.log('⚠️  No confirmation email timestamp - email may not have been sent');
      }
    }

    console.log('');

    // Test practitioner registration
    console.log('🏥 Testing PRACTITIONER registration...');
    const practitionerEmail = `practitioner-${Date.now()}@gmail.com`;
    
    const { data: practitionerData, error: practitionerError } = await supabase.auth.signUp({
      email: practitionerEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'https://peer-care-connect-596lwcpa8-theras-projects-6dfd5a34.vercel.app/auth/verify-email',
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

    if (practitionerError) {
      console.error('❌ Practitioner registration failed:', practitionerError.message);
    } else {
      console.log('✅ Practitioner registration successful');
      console.log(`📧 User ID: ${practitionerData.user?.id}`);
      console.log(`📧 Email confirmed: ${practitionerData.user?.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`📧 Confirmation sent: ${practitionerData.user?.confirmation_sent_at ? 'Yes' : 'No'}`);
      
      if (practitionerData.user?.confirmation_sent_at) {
        console.log('✅ Verification email SENT to:', practitionerEmail);
        console.log('📬 Check your email inbox and spam folder!');
      } else {
        console.log('⚠️  No confirmation email timestamp - email may not have been sent');
      }
    }

    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. Check your email inbox for verification emails');
    console.log('2. Check spam/junk folder');
    console.log('3. If no emails received, check Supabase Dashboard:');
    console.log('   - Authentication → Settings → Confirm email: ENABLED');
    console.log('   - Authentication → Settings → Site URL: Set correctly');
    console.log('   - Authentication → Settings → Redirect URLs: Include your domain');
    console.log('   - Authentication → Templates: Check email templates');
    console.log('4. If using custom SMTP, verify SMTP settings');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testEmailSending().catch(console.error);
