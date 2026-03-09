/**
 * Test OAuth Redirect URL
 * This script helps verify the OAuth redirect configuration
 */

console.log('🔍 Testing OAuth Redirect URL Configuration...\n');

console.log('📋 CURRENT SITUATION:');
console.log('• User is authenticated (SIGNED_IN event)');
console.log('• AuthProvider is working correctly');
console.log('• userProfile is undefined (expected for new OAuth users)');
console.log('• NO AuthCallback debug messages (means not hitting /auth/callback)');
console.log('• User is hitting root URL (/) instead of callback URL\n');

console.log('🚨 ROOT CAUSE:');
console.log('The OAuth redirect URL is still pointing to the wrong location!\n');

console.log('🔍 DEBUGGING STEPS:');
console.log('1. Check what URL you\'re actually hitting:');
console.log('   - Look at browser address bar');
console.log('   - Should be: https://theramate.co.uk/auth/callback');
console.log('   - Currently: https://theramate.co.uk/\n');

console.log('2. Check Supabase Auth settings:');
console.log('   - Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto');
console.log('   - Go to: Authentication → URL Configuration');
console.log('   - Check "Site URL" and "Redirect URLs"\n');

console.log('3. Test the OAuth flow step by step:');
console.log('   - Go to: https://theramate.co.uk/register');
console.log('   - Click "Continue with Google"');
console.log('   - Watch the URL during the OAuth process');
console.log('   - Note where Google redirects you\n');

console.log('💡 QUICK FIXES:');
console.log('1. Update Supabase Site URL:');
console.log('   - Set Site URL to: https://theramate.co.uk');
console.log('   - Add Redirect URL: https://theramate.co.uk/auth/callback\n');

console.log('2. Test with old URL:');
console.log('   - Try: https://theramate-ffr8yo2uu-theras-projects-6dfd5a34.vercel.app/register');
console.log('   - This should work if OAuth is configured for the old URL\n');

console.log('3. Check browser cache:');
console.log('   - Clear all browser data');
console.log('   - Try incognito mode\n');

console.log('🎯 EXPECTED BEHAVIOR:');
console.log('When OAuth works correctly:');
console.log('1. User clicks "Continue with Google"');
console.log('2. Google OAuth page loads');
console.log('3. User authorizes the app');
console.log('4. Google redirects to: https://theramate.co.uk/auth/callback');
console.log('5. AuthCallback component loads');
console.log('6. Debug messages appear in console');
console.log('7. User is redirected to role selection\n');

console.log('🚨 CRITICAL:');
console.log('If you\'re hitting / instead of /auth/callback, then:');
console.log('• The OAuth redirect URL is wrong in Supabase');
console.log('• Or there\'s a redirect happening after OAuth');
console.log('• Or the AuthCallback component has an error\n');

console.log('📞 NEXT STEPS:');
console.log('1. Check your browser address bar - what URL do you see?');
console.log('2. Check Supabase Auth settings');
console.log('3. Try the old Vercel URL to confirm OAuth works');
console.log('4. Update Supabase settings if needed\n');
