// Check practitioner onboarding and profile data integrity
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aikqnvltuwwgifuocvto.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPractitionerData() {
  console.log('🔍 CHECKING PRACTITIONER DATA INTEGRITY\n');
  console.log('=' .repeat(50));

  try {
    // Step 1: Get all practitioner users
    console.log('\n📊 STEP 1: PRACTITIONER USERS');
    console.log('-'.repeat(30));
    
    const { data: practitioners, error: practitionersError } = await supabase
      .from('user_profiles')
      .select('*')
      .in('user_role', ['sports_therapist', 'massage_therapist', 'osteopath'])
      .eq('onboarding_status', 'completed');

    if (practitionersError) {
      console.error('❌ Error fetching practitioners:', practitionersError);
      return;
    }

    console.log(`Total practitioner users: ${practitioners?.length || 0}`);

    if (!practitioners || practitioners.length === 0) {
      console.log('ℹ️ No practitioner users found');
      return;
    }

    // Step 2: Check user profile completeness
    console.log('\n👤 STEP 2: USER PROFILE COMPLETENESS');
    console.log('-'.repeat(30));
    
    let incompleteUserProfiles = 0;
    for (const practitioner of practitioners) {
      const issues = [];
      if (!practitioner.first_name) issues.push('Missing first_name');
      if (!practitioner.last_name) issues.push('Missing last_name');
      if (!practitioner.phone) issues.push('Missing phone');
      if (practitioner.onboarding_status !== 'completed') issues.push('Onboarding not completed');
      
      if (issues.length > 0) {
        incompleteUserProfiles++;
        console.log(`❌ ${practitioner.email}: ${issues.join(', ')}`);
      } else {
        console.log(`✅ ${practitioner.email}: Complete`);
      }
    }

    console.log(`\nUser profiles incomplete: ${incompleteUserProfiles}/${practitioners.length}`);

    // Step 3: Check therapist profiles
    console.log('\n🏥 STEP 3: THERAPIST PROFILES');
    console.log('-'.repeat(30));
    
    const { data: therapistProfiles, error: profilesError } = await supabase
      .from('therapist_profiles')
      .select('*');

    if (profilesError) {
      console.error('❌ Error fetching therapist profiles:', profilesError);
    } else {
      console.log(`Total therapist profiles: ${therapistProfiles?.length || 0}`);
      
      // Check for missing therapist profiles
      const profileUserIds = therapistProfiles?.map(p => p.user_id) || [];
      const practitionersWithoutProfiles = practitioners.filter(p => !profileUserIds.includes(p.id));
      
      console.log(`Practitioners without therapist profiles: ${practitionersWithoutProfiles.length}`);
      
      if (practitionersWithoutProfiles.length > 0) {
        console.log('Missing profiles for:');
        practitionersWithoutProfiles.forEach(p => {
          console.log(`  - ${p.email} (${p.user_role})`);
        });
      }
    }

    // Step 4: Check therapist profile completeness
    console.log('\n📋 STEP 4: THERAPIST PROFILE COMPLETENESS');
    console.log('-'.repeat(30));
    
    if (therapistProfiles && therapistProfiles.length > 0) {
      let incompleteTherapistProfiles = 0;
      
      for (const profile of therapistProfiles) {
        const issues = [];
        if (!profile.bio) issues.push('Missing bio');
        if (!profile.location) issues.push('Missing location');
        if (!profile.experience_years || profile.experience_years === 0) issues.push('Missing experience_years');
        if (!profile.specializations || profile.specializations.length === 0) issues.push('Missing specializations');
        if (!profile.qualifications || profile.qualifications.length === 0) issues.push('Missing qualifications');
        if (!profile.hourly_rate || profile.hourly_rate === 0) issues.push('Missing hourly_rate');
        
        if (issues.length > 0) {
          incompleteTherapistProfiles++;
          console.log(`❌ Profile ${profile.id}: ${issues.join(', ')}`);
        } else {
          console.log(`✅ Profile ${profile.id}: Complete`);
        }
      }
      
      console.log(`\nTherapist profiles incomplete: ${incompleteTherapistProfiles}/${therapistProfiles.length}`);
    }

    // Step 5: Overall assessment
    console.log('\n📊 STEP 5: OVERALL ASSESSMENT');
    console.log('-'.repeat(30));
    
    const totalIssues = incompleteUserProfiles + (practitionersWithoutProfiles?.length || 0);
    
    if (totalIssues === 0) {
      console.log('🎉 All practitioner data is complete!');
    } else {
      console.log(`⚠️ Found ${totalIssues} data issues:`);
      console.log(`  - Incomplete user profiles: ${incompleteUserProfiles}`);
      console.log(`  - Missing therapist profiles: ${practitionersWithoutProfiles?.length || 0}`);
    }

    // Step 6: Recommendations
    console.log('\n💡 STEP 6: RECOMMENDATIONS');
    console.log('-'.repeat(30));
    
    if (incompleteUserProfiles > 0) {
      console.log('1. Fix incomplete user profiles - update missing fields');
    }
    
    if (practitionersWithoutProfiles?.length > 0) {
      console.log('2. Create missing therapist profiles for practitioners');
    }
    
    if (totalIssues === 0) {
      console.log('1. ✅ All practitioner data is complete - no action needed');
      console.log('2. ✅ Consider implementing monitoring to prevent future issues');
    }

  } catch (error) {
    console.error('❌ Check error:', error);
  }
}

checkPractitionerData();
