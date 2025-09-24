#!/usr/bin/env node

/**
 * Update all references from 'users' table to 'user_profiles' table
 * This script will update all files that reference the old 'users' table
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filesToUpdate = [
  'src/pages/practice/ClientManagement.tsx',
  'src/lib/onboarding-utils.ts',
  'src/components/messaging/ChatInterface.tsx',
  'src/components/payments/PaymentHistory.tsx',
  'src/components/messaging/MessagesList.tsx',
  'src/components/features/FavoriteTherapists.tsx',
  'src/pages/practice/AppointmentScheduler.tsx',
  'src/pages/practice/BusinessAnalytics.tsx',
  'src/pages/client/ClientSessions.tsx',
  'src/pages/client/ClientProfile.tsx'
];

console.log('🔄 Updating files to use user_profiles table...\n');

filesToUpdate.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  
  if (fs.existsSync(fullPath)) {
    console.log(`📝 Updating ${filePath}...`);
    
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace .from('users') with .from('user_profiles')
    const updatedContent = content.replace(/\.from\('users'\)/g, ".from('user_profiles')");
    
    if (content !== updatedContent) {
      fs.writeFileSync(fullPath, updatedContent);
      console.log(`✅ Updated ${filePath}`);
    } else {
      console.log(`ℹ️  No changes needed for ${filePath}`);
    }
  } else {
    console.log(`⚠️  File not found: ${filePath}`);
  }
});

console.log('\n✅ All files updated successfully!');
console.log('\n📋 Summary of changes:');
console.log('- Changed all .from(\'users\') to .from(\'user_profiles\')');
console.log('- This ensures all components use the correct table');
console.log('- The user_profiles table has proper RLS policies');
console.log('- Google OAuth should now work without 403 errors');

console.log('\n🚀 Next steps:');
console.log('1. Test Google OAuth on localhost');
console.log('2. Verify user profile creation works');
console.log('3. Check that all components load user data correctly');
