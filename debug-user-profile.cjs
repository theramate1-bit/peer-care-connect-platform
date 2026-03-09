/**
 * Check User Profile in Database
 * This script helps debug if the user profile exists and what the issue might be
 */

console.log('🔍 Checking User Profile in Database...\n');

console.log('📋 USER INFO FROM LOGS:');
console.log('• User ID: 5ece55cb-fcb6-4cbd-a743-e6414c471645');
console.log('• Email: raymancapital@protonmail.com');
console.log('• Status: Authenticated but userProfile undefined\n');

console.log('🚨 POSSIBLE ISSUES:');
console.log('1. Database trigger not creating user profile');
console.log('2. User profile exists but AuthCallback not reaching it');
console.log('3. AuthCallback component not being loaded');
console.log('4. Infinite redirect loop preventing callback execution\n');

console.log('🔍 DEBUGGING STEPS:');
console.log('1. Check if you\'re actually hitting /auth/callback:');
console.log('   - Look at the URL in your browser');
console.log('   - Should be: https://theramate.co.uk/auth/callback');
console.log('   - NOT: https://theramate.co.uk/\n');

console.log('2. Check browser console for AuthCallback debug messages:');
console.log('   - Look for: "🔍 AuthCallback: User authenticated:"');
console.log('   - If you don\'t see this, AuthCallback isn\'t running\n');

console.log('3. Check Network tab for API calls:');
console.log('   - Look for calls to Supabase');
console.log('   - Check if user profile is being fetched\n');

console.log('4. Try manual navigation test:');
console.log('   - Go directly to: https://theramate.co.uk/auth/callback');
console.log('   - See if AuthCallback component loads\n');

console.log('💡 QUICK FIXES TO TRY:');
console.log('1. Clear browser cache and cookies completely');
console.log('2. Try incognito/private browsing mode');
console.log('3. Check if you have any browser extensions blocking requests');
console.log('4. Try a different browser');
console.log('5. Check if JavaScript is enabled\n');

console.log('🎯 EXPECTED FLOW:');
console.log('1. User clicks "Continue with Google"');
console.log('2. Google OAuth redirects to: /auth/callback');
console.log('3. AuthCallback component loads');
console.log('4. Debug messages appear in console');
console.log('5. User profile is fetched from database');
console.log('6. Redirect to role selection or dashboard\n');

console.log('🚨 CRITICAL QUESTION:');
console.log('Are you actually hitting the /auth/callback URL?');
console.log('Check your browser\'s address bar when the issue occurs.\n');

console.log('If you\'re hitting / instead of /auth/callback, then:');
console.log('• The OAuth redirect URL is still wrong');
console.log('• Or there\'s a redirect happening after OAuth');
console.log('• Or the AuthCallback component has an error\n');
