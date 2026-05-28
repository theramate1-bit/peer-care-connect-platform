#!/usr/bin/env node

/**
 * OAuth Diagnostic Script
 * 
 * This script helps diagnose OAuth authentication issues
 * by checking the current state and configuration.
 */

console.log('🔍 OAuth Diagnostic Script');
console.log('==========================\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('========================');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL || 'NOT SET');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('');

// Check if we're in a browser environment
console.log('🌐 Browser Environment Check:');
console.log('==============================');
if (typeof window !== 'undefined') {
  console.log('✅ Running in browser environment');
  console.log('Current URL:', window.location.href);
  console.log('Session Storage:', typeof sessionStorage !== 'undefined' ? 'Available' : 'Not Available');
  console.log('Local Storage:', typeof localStorage !== 'undefined' ? 'Available' : 'Not Available');
  
  // Check for pending role in session storage
  if (typeof sessionStorage !== 'undefined') {
    const pendingRole = sessionStorage.getItem('pending_user_role');
    console.log('Pending Role:', pendingRole || 'None');
  }
  
  // Check for any auth-related data in localStorage
  if (typeof localStorage !== 'undefined') {
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || key.includes('auth') || key.includes('session')
    );
    console.log('Auth-related localStorage keys:', authKeys.length > 0 ? authKeys : 'None');
  }
} else {
  console.log('❌ Not running in browser environment');
}
console.log('');

// Check Supabase configuration
console.log('🔧 Supabase Configuration:');
console.log('==========================');
try {
  // Try to import Supabase client (this might fail in Node.js)
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://aikqnvltuwwgifuocvto.supabase.co';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client created successfully');
  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase Key:', supabaseKey.substring(0, 20) + '...');
  
  // Test connection
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.log('❌ Supabase session error:', error.message);
    } else {
      console.log('✅ Supabase session check successful');
      console.log('Current session:', data.session ? 'Active' : 'None');
    }
  }).catch(err => {
    console.log('❌ Supabase connection error:', err.message);
  });
  
} catch (error) {
  console.log('❌ Failed to create Supabase client:', error.message);
}
console.log('');

// Check OAuth redirect URLs
console.log('🔗 OAuth Redirect URLs:');
console.log('=======================');
const redirectUrls = [
  'http://localhost:3000/auth/callback',
  'https://theramate-j7yroq1sy-theras-projects-6dfd5a34.vercel.app/auth/callback',
  'https://theramate-dr1vzfs7v-theras-projects-6dfd5a34.vercel.app/auth/callback'
];

redirectUrls.forEach(url => {
  console.log('Redirect URL:', url);
});
console.log('');

// Common OAuth issues and solutions
console.log('🚨 Common OAuth Issues & Solutions:');
console.log('===================================');
console.log(`
1. **User not authenticated after OAuth callback**
   - Check if Supabase auth state is properly updated
   - Verify AuthContext is listening to auth state changes
   - Check if session is being stored correctly

2. **Role not assigned after OAuth**
   - Check if pending role is stored in sessionStorage
   - Verify RoleManager.consumePendingRole() is called
   - Check if role assignment to database succeeds

3. **Redirect loops or wrong redirects**
   - Check AuthCallback logic for proper role checking
   - Verify user profile exists and has correct role
   - Check onboarding status logic

4. **Session not persisting**
   - Check Supabase client configuration
   - Verify localStorage is available and working
   - Check for session expiration

5. **Environment variable issues**
   - Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set
   - Check if variables are available in production
   - Verify Supabase project is active and accessible
`);

console.log('🔍 Diagnostic Complete!');
console.log('======================');
console.log('If you\'re still experiencing issues, check the browser console for detailed logs.');
console.log('The AuthCallback component has extensive logging to help debug OAuth flow issues.');
