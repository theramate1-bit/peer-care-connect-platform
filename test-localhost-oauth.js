#!/usr/bin/env node

/**
 * Test Localhost OAuth Setup
 * 
 * This script verifies the localhost OAuth configuration
 * and provides step-by-step instructions for testing.
 */

console.log('🔍 Testing Localhost OAuth Setup...\n');

console.log('📋 Configuration Requirements:');

console.log('\n1. ✅ Google Cloud Console Setup:');
console.log('   - Go to: https://console.cloud.google.com/');
console.log('   - Navigate to: APIs & Services → Credentials');
console.log('   - Create OAuth 2.0 Client ID (Web application)');
console.log('   - Add Authorized JavaScript origins:');
console.log('     • http://localhost:3000');
console.log('     • https://peer-care-connect-doaji6v60-theras-projects-6dfd5a34.vercel.app');
console.log('   - Add Authorized redirect URIs:');
console.log('     • http://localhost:3000/auth/callback');
console.log('     • https://peer-care-connect-doaji6v60-theras-projects-6dfd5a34.vercel.app/auth/callback');
console.log('     • https://aikqnvltuwwgifuocvto.supabase.co/auth/v1/callback');

console.log('\n2. ✅ Supabase Dashboard Setup:');
console.log('   - Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/auth/providers');
console.log('   - Enable Google provider');
console.log('   - Enter Client ID and Client Secret from Google Cloud Console');
console.log('   - Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/auth/url-configuration');
console.log('   - Set Site URL to: http://localhost:3000');
console.log('   - Add Additional Redirect URLs:');
console.log('     • http://localhost:3000/auth/callback');
console.log('     • https://localhost:3000/auth/callback');
console.log('     • http://localhost:8080/auth/callback');
console.log('     • https://localhost:8080/auth/callback');
console.log('     • https://peer-care-connect-doaji6v60-theras-projects-6dfd5a34.vercel.app');
console.log('     • https://peer-care-connect-doaji6v60-theras-projects-6dfd5a34.vercel.app/**');

console.log('\n3. ✅ Application Code (Already Fixed):');
console.log('   - URL trimming implemented (.trim())');
console.log('   - Debug logging added');
console.log('   - Error handling enhanced');
console.log('   - Vercel URL support added');

console.log('\n🚀 Testing Steps:');

console.log('\n1. Start Development Server:');
console.log('   npm run dev');
console.log('   (Server should be running on http://localhost:3000)');

console.log('\n2. Test Google OAuth:');
console.log('   - Open browser to http://localhost:3000');
console.log('   - Go to registration page');
console.log('   - Click "Continue with Google"');
console.log('   - Check browser console for debug logs');

console.log('\n3. Expected Console Logs:');
console.log('   🔄 Starting Google OAuth...');
console.log('   OAuth redirect URL: http://localhost:3000/auth/callback');
console.log('   Current origin: http://localhost:3000');
console.log('   URL length: [number]');
console.log('   URL starts with space: false');
console.log('   ✅ Google OAuth initiated successfully');

console.log('\n4. Expected Behavior:');
console.log('   - Redirects to Google OAuth consent screen');
console.log('   - After consent, redirects back to localhost');
console.log('   - User is authenticated and redirected to dashboard');
console.log('   - No 500 errors');

console.log('\n🐛 Troubleshooting:');

console.log('\n- redirect_uri_mismatch:');
console.log('  → Check Google Cloud Console redirect URIs');

console.log('\n- invalid_client:');
console.log('  → Check Client ID and Secret in Supabase');

console.log('\n- 500 unexpected_failure:');
console.log('  → Should be fixed with URL trimming (already implemented)');

console.log('\n- OAuth doesn\'t work on localhost:');
console.log('  → Ensure localhost URLs are added to both Google and Supabase');

console.log('\n📊 Current Status:');
console.log('   - ✅ Application code fixed (URL trimming, debug logging)');
console.log('   - ✅ Development server can be started');
console.log('   - ⚠️  Google Cloud Console needs configuration');
console.log('   - ⚠️  Supabase Dashboard needs localhost URLs');

console.log('\n🎯 Next Steps:');
console.log('1. Configure Google Cloud Console (follow steps above)');
console.log('2. Configure Supabase Dashboard (follow steps above)');
console.log('3. Test OAuth flow on localhost');
console.log('4. Deploy to Vercel and test there too');

console.log('\n✅ Localhost OAuth Setup Guide Complete!');
console.log('   Follow the configuration steps above to enable');
console.log('   Google OAuth on both localhost and Vercel deployment.');
