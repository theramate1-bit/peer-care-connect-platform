// Google Sign-Up Test Script
// Tests the Google OAuth sign-up functionality

console.log('🔐 Testing Google Sign-Up Functionality...\n');

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables
function loadEnvVars() {
  const possiblePaths = [
    '.env',
    '.env.local',
    '.env.production',
    '.env.development'
  ];
  
  for (const envPath of possiblePaths) {
    const fullPath = path.join(__dirname, envPath);
    if (fs.existsSync(fullPath)) {
      console.log(`📁 Loading environment from: ${envPath}`);
      require('dotenv').config({ path: fullPath });
      break;
    }
  }
}

loadEnvVars();

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://aikqnvltuwwgifuocvto.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase anonymous key');
  console.error('Please set VITE_SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

console.log('🔧 Configuration:');
console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? `${SUPABASE_ANON_KEY.substring(0, 20)}...` : 'NOT SET');

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
  }
});

async function testGoogleSignUp() {
  console.log('\n🔍 Testing Google Sign-Up OAuth Flow...\n');
  
  try {
    // Test 1: Check if Google provider is available
    console.log('1️⃣ Checking Google provider availability...');
    
    const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:5173/auth/callback',
        scopes: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });
    
    if (oauthError) {
      console.error('❌ Google OAuth failed:', oauthError);
      console.error('Error details:', {
        message: oauthError.message,
        status: oauthError.status,
        name: oauthError.name
      });
      
      // Provide specific guidance based on error type
      if (oauthError.message && oauthError.message.includes('redirect_uri_mismatch')) {
        console.error('\n🚨 REDIRECT URI MISMATCH ERROR!');
        console.error('Solution: Add this URL to your Google Cloud Console:');
        console.error('https://aikqnvltuwwgifuocvto.supabase.co/auth/v1/callback');
        console.error('And also add: http://localhost:5173/auth/callback');
      }
      
      if (oauthError.message && oauthError.message.includes('500')) {
        console.error('\n🚨 SERVER ERROR (500)!');
        console.error('This suggests Google OAuth is not properly configured in Supabase');
        console.error('Check your Supabase dashboard: Authentication → Providers → Google');
      }
      
      if (oauthError.message && oauthError.message.includes('invalid_client')) {
        console.error('\n🚨 INVALID CLIENT ERROR!');
        console.error('Check your Google Client ID in Supabase dashboard');
      }
      
      return false;
    } else {
      console.log('✅ Google OAuth URL generated successfully!');
      console.log('Provider:', oauthData.provider);
      console.log('URL:', oauthData.url);
      console.log('\n📋 Next Steps:');
      console.log('1. Open the URL above in your browser');
      console.log('2. Complete the Google OAuth flow');
      console.log('3. Check if you get redirected back to your app');
      console.log('4. Verify user profile is created in Supabase');
      
      return true;
    }
    
  } catch (error) {
    console.error('💥 Unexpected error during Google OAuth test:', error);
    console.error('Error stack:', error.stack);
    return false;
  }
}

async function testCurrentSession() {
  console.log('\n🔍 Checking current session...\n');
  
  try {
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session check failed:', sessionError);
      return false;
    } else {
      console.log('✅ Session check completed');
      console.log('Has session:', !!session.session);
      if (session.session) {
        console.log('User ID:', session.session.user.id);
        console.log('Email:', session.session.user.email);
        console.log('Provider:', session.session.user.app_metadata?.provider);
        return true;
      } else {
        console.log('No active session found');
        return false;
      }
    }
  } catch (error) {
    console.error('❌ Session check failed:', error.message);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('\n🗄️ Testing Database Connection...\n');
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    } else {
      console.log('✅ Database connection successful');
      console.log('Users count:', data?.length || 0);
      return true;
    }
  } catch (error) {
    console.error('💥 Unexpected error during database test:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive Google Sign-Up tests...\n');
  
  const results = {
    googleOAuth: false,
    database: false,
    session: false
  };
  
  try {
    results.database = await testDatabaseConnection();
    results.googleOAuth = await testGoogleSignUp();
    results.session = await testCurrentSession();
    
    console.log('\n📊 Test Results Summary:');
    console.log('✅ Database Connection:', results.database ? 'PASS' : 'FAIL');
    console.log('✅ Google OAuth Setup:', results.googleOAuth ? 'PASS' : 'FAIL');
    console.log('✅ Current Session:', results.session ? 'PASS' : 'FAIL');
    
    if (results.googleOAuth && results.database) {
      console.log('\n🎉 Google Sign-Up is properly configured!');
      console.log('You can now test the sign-up flow in your browser at:');
      console.log('http://localhost:5173/register');
    } else {
      console.log('\n⚠️ Google Sign-Up needs configuration');
      console.log('Please check the error messages above and fix the issues');
    }
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().then(() => {
    console.log('\n🏁 Test execution finished');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testGoogleSignUp,
  testCurrentSession,
  testDatabaseConnection,
  runAllTests
};
