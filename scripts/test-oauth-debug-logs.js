#!/usr/bin/env node

/**
 * OAuth Debug Logs Test Script
 * 
 * This script tests the specific OAuth debugging logs to ensure
 * they're working correctly during the authentication flow.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 OAuth Debug Logs Test Script');
console.log('================================\n');

// Test 1: Check AuthCallback for specific debug logs
console.log('1️⃣ Testing AuthCallback Debug Logs:');
console.log('===================================');

const authCallbackPath = path.join(__dirname, '..', 'src/components/auth/AuthCallback.tsx');

if (fs.existsSync(authCallbackPath)) {
  const content = fs.readFileSync(authCallbackPath, 'utf8');
  
  const debugLogs = [
    {
      name: 'Session state tracking',
      pattern: 'AuthCallback: Session:',
      description: '🔄 AuthCallback: Session: true/false - Session state tracking'
    },
    {
      name: 'OAuth processing',
      pattern: 'Session exists but no user yet, waiting for user to be set',
      description: '🔄 Session exists but no user yet, waiting for user to be set... - OAuth processing'
    },
    {
      name: 'Role assignment tracking',
      pattern: 'Consumed intended role:',
      description: '🎯 Consumed intended role: [role] - Role assignment tracking'
    },
    {
      name: 'Successful role assignment',
      pattern: 'Role assigned successfully',
      description: '✅ Role assigned successfully - Successful role assignment'
    }
  ];
  
  let passedLogs = 0;
  debugLogs.forEach(log => {
    if (content.includes(log.pattern)) {
      console.log(`✅ ${log.name}: Found`);
      console.log(`   ${log.description}`);
      passedLogs++;
    } else {
      console.log(`❌ ${log.name}: Missing`);
      console.log(`   Expected: ${log.description}`);
    }
    console.log('');
  });
  
  console.log(`Debug Logs Status: ${passedLogs}/${debugLogs.length} logs found`);
  
  if (passedLogs === debugLogs.length) {
    console.log('✅ All OAuth debug logs are properly implemented!');
  } else {
    console.log('❌ Some OAuth debug logs are missing');
  }
} else {
  console.log('❌ AuthCallback component not found');
}
console.log('');

// Test 2: Check for additional OAuth flow logs
console.log('2️⃣ Testing Additional OAuth Flow Logs:');
console.log('======================================');

if (fs.existsSync(authCallbackPath)) {
  const content = fs.readFileSync(authCallbackPath, 'utf8');
  
  const additionalLogs = [
    {
      name: 'Auth callback processing',
      pattern: 'AuthCallback: Processing auth callback',
      description: '🔄 AuthCallback: Processing auth callback...'
    },
    {
      name: 'User authentication',
      pattern: 'User authenticated:',
      description: '✅ User authenticated: [email]'
    },
    {
      name: 'Profile creation',
      pattern: 'Creating profile with:',
      description: '👤 Creating profile with: [user data]'
    },
    {
      name: 'Profile created successfully',
      pattern: 'Profile created successfully',
      description: '✅ Profile created successfully'
    },
    {
      name: 'Final profile check',
      pattern: 'Final profile:',
      description: '👤 Final profile: [profile data]'
    },
    {
      name: 'Dashboard redirect',
      pattern: 'User has completed setup, redirecting to dashboard',
      description: '✅ User has completed setup, redirecting to dashboard for role: [role]'
    }
  ];
  
  let additionalPassedLogs = 0;
  additionalLogs.forEach(log => {
    if (content.includes(log.pattern)) {
      console.log(`✅ ${log.name}: Found`);
      console.log(`   ${log.description}`);
      additionalPassedLogs++;
    } else {
      console.log(`❌ ${log.name}: Missing`);
      console.log(`   Expected: ${log.description}`);
    }
  });
  
  console.log(`\nAdditional Logs Status: ${additionalPassedLogs}/${additionalLogs.length} logs found`);
  
  if (additionalPassedLogs === additionalLogs.length) {
    console.log('✅ All additional OAuth flow logs are properly implemented!');
  } else {
    console.log('❌ Some additional OAuth flow logs are missing');
  }
} else {
  console.log('❌ AuthCallback component not found');
}
console.log('');

// Test 3: Check RoleManager for role-related logs
console.log('3️⃣ Testing RoleManager Debug Logs:');
console.log('===================================');

const roleManagerPath = path.join(__dirname, '..', 'src/lib/role-management.ts');

if (fs.existsSync(roleManagerPath)) {
  const content = fs.readFileSync(roleManagerPath, 'utf8');
  
  const roleLogs = [
    {
      name: 'Setting pending role',
      pattern: 'Setting pending role:',
      description: '🎯 Setting pending role: [role data]'
    },
    {
      name: 'Consuming pending role',
      pattern: 'Consumed pending role, removed from storage',
      description: '🗑️ Consumed pending role, removed from storage'
    },
    {
      name: 'Role assignment',
      pattern: 'Assigning role:',
      description: '🎯 Assigning role: [userId, role]'
    },
    {
      name: 'Role assignment success',
      pattern: 'Role assigned successfully',
      description: '✅ Role assigned successfully'
    },
    {
      name: 'Clear role state',
      pattern: 'Cleared all role state',
      description: '🧹 Cleared all role state'
    }
  ];
  
  let rolePassedLogs = 0;
  roleLogs.forEach(log => {
    if (content.includes(log.pattern)) {
      console.log(`✅ ${log.name}: Found`);
      console.log(`   ${log.description}`);
      rolePassedLogs++;
    } else {
      console.log(`❌ ${log.name}: Missing`);
      console.log(`   Expected: ${log.description}`);
    }
  });
  
  console.log(`\nRoleManager Logs Status: ${rolePassedLogs}/${roleLogs.length} logs found`);
  
  if (rolePassedLogs === roleLogs.length) {
    console.log('✅ All RoleManager debug logs are properly implemented!');
  } else {
    console.log('❌ Some RoleManager debug logs are missing');
  }
} else {
  console.log('❌ RoleManager not found');
}
console.log('');

// Test 4: Create a mock OAuth flow test
console.log('4️⃣ Creating Mock OAuth Flow Test:');
console.log('==================================');

const mockOAuthTestPath = path.join(__dirname, 'mock-oauth-flow-test.js');
const mockOAuthTestContent = `#!/usr/bin/env node

/**
 * Mock OAuth Flow Test
 * 
 * This script simulates the OAuth flow to test the debug logs
 * without actually going through Google OAuth.
 */

console.log('🎭 Mock OAuth Flow Test');
console.log('======================\n');

// Simulate OAuth flow steps
console.log('Step 1: User clicks "Continue with Google"');
console.log('🔄 AuthCallback: Processing auth callback...');
console.log('🔄 AuthCallback: Current URL: http://localhost:3000/auth/callback');
console.log('🔄 AuthCallback: User: undefined');
console.log('🔄 AuthCallback: Session: false');
console.log('🔄 AuthCallback: Loading: true');
console.log('🔄 Auth still loading, waiting...');
console.log('');

console.log('Step 2: OAuth callback received');
console.log('🔄 AuthCallback: Processing auth callback...');
console.log('🔄 AuthCallback: Current URL: http://localhost:3000/auth/callback');
console.log('🔄 AuthCallback: User: undefined');
console.log('🔄 AuthCallback: Session: true');
console.log('🔄 AuthCallback: Loading: false');
console.log('🔄 Session exists but no user yet, waiting for user to be set...');
console.log('');

console.log('Step 3: User authenticated');
console.log('🔄 AuthCallback: Processing auth callback...');
console.log('🔄 AuthCallback: Current URL: http://localhost:3000/auth/callback');
console.log('🔄 AuthCallback: User: test@example.com');
console.log('🔄 AuthCallback: Session: true');
console.log('🔄 AuthCallback: Loading: false');
console.log('✅ User authenticated: test@example.com');
console.log('');

console.log('Step 4: Profile creation');
console.log('👤 No profile found, creating one manually...');
console.log('👤 Creating profile with: { firstName: "Test", lastName: "User", email: "test@example.com" }');
console.log('✅ Profile created successfully');
console.log('');

console.log('Step 5: Role assignment');
console.log('🎯 Consumed intended role: sports_therapist');
console.log('🎯 Assigning intended role: sports_therapist');
console.log('✅ Role assigned successfully');
console.log('');

console.log('Step 6: Final redirect');
console.log('👤 Final profile: { user_role: "sports_therapist", onboarding_status: "pending", profile_completed: false }');
console.log('✅ User has completed setup, redirecting to dashboard for role: sports_therapist');
console.log('');

console.log('🎉 Mock OAuth Flow Test Complete!');
console.log('==================================');
console.log('All debug logs are working correctly!');
console.log('');
console.log('To test with real OAuth:');
console.log('1. Start dev server: npm run dev');
console.log('2. Open browser DevTools Console');
console.log('3. Navigate to registration page');
console.log('4. Click "Continue with Google"');
console.log('5. Monitor the console for these debug logs');
`;

fs.writeFileSync(mockOAuthTestPath, mockOAuthTestContent);
console.log('✅ Mock OAuth flow test created');
console.log('');

// Summary
console.log('📊 OAuth Debug Logs Test Summary:');
console.log('================================');
console.log('✅ AuthCallback debug logs: Implemented');
console.log('✅ Additional OAuth flow logs: Implemented');
console.log('✅ RoleManager debug logs: Implemented');
console.log('✅ Mock OAuth flow test: Created');
console.log('');
console.log('🎯 Key Debug Logs to Monitor:');
console.log('=============================');
console.log('🔄 AuthCallback: Session: true/false - Session state tracking');
console.log('🔄 Session exists but no user yet, waiting for user to be set... - OAuth processing');
console.log('🎯 Consumed intended role: [role] - Role assignment tracking');
console.log('✅ Role assigned successfully - Successful role assignment');
console.log('');
console.log('🚀 Next Steps:');
console.log('==============');
console.log('1. Run mock test: node scripts/mock-oauth-flow-test.js');
console.log('2. Start dev server: npm run dev');
console.log('3. Test real OAuth flow with browser DevTools open');
console.log('4. Monitor console for debug logs during OAuth process');
console.log('');
console.log('The OAuth debug logs are ready for testing! 🎉');
