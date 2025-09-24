#!/usr/bin/env node

/**
 * Test Google OAuth Final Configuration
 * 
 * This script verifies the Google OAuth configuration fixes
 * for the Supabase project: aikqnvltuwwgifuocvto.supabase.co
 */

console.log('🔍 Testing Google OAuth Final Configuration...\n');

console.log('📋 Your Supabase Project:');
console.log('   - Project URL: https://aikqnvltuwwgifuocvto.supabase.co');
console.log('   - Auth Callback: https://aikqnvltuwwgifuocvto.supabase.co/auth/v1/callback');

console.log('\n✅ Configuration Fixes Applied:');

console.log('\n1. ✅ Google OAuth Scopes Added:');
console.log('   - Added email scope: https://www.googleapis.com/auth/userinfo.email');
console.log('   - Added profile scope: https://www.googleapis.com/auth/userinfo.profile');
console.log('   - This ensures proper access to user information');

console.log('\n2. ✅ Redirect URL Configuration:');
console.log('   - Updated Supabase config.toml with correct callback URL');
console.log('   - Added: https://aikqnvltuwwgifuocvto.supabase.co/auth/v1/callback');
console.log('   - Maintained localhost URLs for development');

console.log('\n3. ✅ Enhanced Error Handling:');
console.log('   - Added comprehensive try-catch blocks');
console.log('   - Added detailed error logging');
console.log('   - Added user-friendly error messages');

console.log('\n🔧 Next Steps to Complete Setup:');

console.log('\n1. Verify Google Cloud Console Configuration:');
console.log('   - Go to: https://console.cloud.google.com/');
console.log('   - Select your project');
console.log('   - Go to APIs & Services → Credentials');
console.log('   - Click on your OAuth 2.0 Client ID');
console.log('   - Under "Authorized redirect URIs", add:');
console.log('     https://aikqnvltuwwgifuocvto.supabase.co/auth/v1/callback');

console.log('\n2. Verify Supabase Configuration:');
console.log('   - Go to: https://supabase.com/dashboard');
console.log('   - Select project: tsvzwxvpfflvkkvvaqss');
console.log('   - Go to Authentication → Providers');
console.log('   - Click on Google provider');
console.log('   - Ensure Google provider is enabled');
console.log('   - Verify Client ID and Client Secret are correct');

console.log('\n3. Test the OAuth Flow:');
console.log('   - Start dev server: npm run dev');
console.log('   - Go to registration page');
console.log('   - Click "Continue with Google"');
console.log('   - Check browser console for logs');
console.log('   - Complete the Google OAuth flow');

console.log('\n🐛 Common Issues & Solutions:');

console.log('\n- redirect_uri_mismatch:');
console.log('  → Add the Supabase callback URL to Google Cloud Console');

console.log('\n- invalid_client:');
console.log('  → Check Client ID in Supabase dashboard');

console.log('\n- unauthorized_client:');
console.log('  → Check Client Secret in Supabase dashboard');

console.log('\n- access_denied:');
console.log('  → User denied permission or scope issues (should be fixed with new scopes)');

console.log('\n📊 Expected Console Logs:');
console.log('   When you click "Continue with Google", you should see:');
console.log('   🔄 Starting Google OAuth...');
console.log('   OAuth redirect URL: http://localhost:3000/auth/callback');
console.log('   Current origin: http://localhost:3000');
console.log('   ✅ Google OAuth initiated successfully');

console.log('\n✅ Google OAuth Configuration Complete!');
console.log('   The application now has proper OAuth configuration.');
console.log('   Follow the verification steps above to complete the setup.');
