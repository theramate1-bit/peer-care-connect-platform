// Check all user roles in the database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aikqnvltuwwgifuocvto.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllUserRoles() {
  console.log('🔍 CHECKING ALL USER ROLES\n');
  console.log('=' .repeat(50));

  try {
    // Get all users
    const { data: allUsers, error: usersError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`Total users in database: ${allUsers?.length || 0}\n`);

    if (!allUsers || allUsers.length === 0) {
      console.log('ℹ️ No users found in database');
      return;
    }

    // Group users by role
    const usersByRole = allUsers.reduce((acc, user) => {
      const role = user.user_role || 'unknown';
      if (!acc[role]) acc[role] = [];
      acc[role].push(user);
      return acc;
    }, {});

    // Display users by role
    Object.entries(usersByRole).forEach(([role, users]) => {
      console.log(`👥 ${role.toUpperCase()} (${users.length} users):`);
      users.forEach(user => {
        const status = user.onboarding_status === 'completed' ? '✅' : '⚠️';
        console.log(`  ${status} ${user.email} - ${user.first_name} ${user.last_name || ''} (${user.onboarding_status})`);
      });
      console.log('');
    });

    // Check for potential issues
    console.log('🔍 POTENTIAL ISSUES:');
    console.log('-'.repeat(30));
    
    let totalIssues = 0;
    
    allUsers.forEach(user => {
      const issues = [];
      if (!user.first_name) issues.push('Missing first_name');
      if (!user.last_name) issues.push('Missing last_name');
      if (!user.phone) issues.push('Missing phone');
      if (user.onboarding_status !== 'completed') issues.push('Onboarding not completed');
      
      if (issues.length > 0) {
        totalIssues++;
        console.log(`❌ ${user.email} (${user.user_role}): ${issues.join(', ')}`);
      }
    });

    if (totalIssues === 0) {
      console.log('✅ No issues found - all user profiles are complete');
    } else {
      console.log(`\n⚠️ Found ${totalIssues} users with incomplete profiles`);
    }

  } catch (error) {
    console.error('❌ Check error:', error);
  }
}

checkAllUserRoles();
