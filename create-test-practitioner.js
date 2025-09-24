// Create test practitioner to verify prevention systems
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aikqnvltuwwgifuocvto.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestPractitioner() {
  console.log('👨‍⚕️ CREATING TEST PRACTITIONER\n');
  console.log('=' .repeat(50));

  try {
    // Create test practitioner user profile
    console.log('1. Creating test practitioner user profile...');
    
    const testPractitionerId = 'test-practitioner-' + Date.now();
    const { error: userError } = await supabase
      .from('user_profiles')
      .insert({
        id: testPractitionerId,
        email: 'test.sports.therapist@example.com',
        first_name: 'John',
        last_name: 'Smith',
        user_role: 'sports_therapist',
        phone: '07123456789',
        location: 'London, UK',
        onboarding_status: 'completed',
        profile_completed: true
      });

    if (userError) {
      console.error('❌ Error creating user profile:', userError);
      return;
    }
    console.log('✅ User profile created successfully');

    // Create test practitioner therapist profile
    console.log('\n2. Creating test practitioner therapist profile...');
    
    const { error: therapistError } = await supabase
      .from('therapist_profiles')
      .insert({
        user_id: testPractitionerId,
        bio: 'Experienced sports therapist with 8 years of experience in injury rehabilitation and performance enhancement.',
        location: 'London, UK',
        experience_years: 8,
        specializations: ['sports_injury', 'rehabilitation', 'strength_training'],
        qualifications: ['BSc Sports Therapy', 'Level 3 Personal Training', 'First Aid Certified'],
        hourly_rate: 65,
        availability: {
          monday: { start: '09:00', end: '17:00' },
          tuesday: { start: '09:00', end: '17:00' },
          wednesday: { start: '09:00', end: '17:00' },
          thursday: { start: '09:00', end: '17:00' },
          friday: { start: '09:00', end: '17:00' }
        },
        professional_body: 'society_of_sports_therapists',
        registration_number: 'SST123456',
        is_active: true
      });

    if (therapistError) {
      console.error('❌ Error creating therapist profile:', therapistError);
      return;
    }
    console.log('✅ Therapist profile created successfully');

    // Verify the creation
    console.log('\n3. Verifying practitioner creation...');
    
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', testPractitionerId)
      .single();

    const { data: therapistProfile } = await supabase
      .from('therapist_profiles')
      .select('*')
      .eq('user_id', testPractitionerId)
      .single();

    console.log('✅ User Profile:');
    console.log(`  Name: ${userProfile?.first_name} ${userProfile?.last_name}`);
    console.log(`  Email: ${userProfile?.email}`);
    console.log(`  Role: ${userProfile?.user_role}`);
    console.log(`  Phone: ${userProfile?.phone}`);
    console.log(`  Location: ${userProfile?.location}`);

    console.log('\n✅ Therapist Profile:');
    console.log(`  Bio: ${therapistProfile?.bio?.substring(0, 50)}...`);
    console.log(`  Experience: ${therapistProfile?.experience_years} years`);
    console.log(`  Specializations: ${therapistProfile?.specializations?.join(', ')}`);
    console.log(`  Hourly Rate: £${therapistProfile?.hourly_rate}`);
    console.log(`  Professional Body: ${therapistProfile?.professional_body}`);

    console.log('\n🎉 Test practitioner created successfully!');
    console.log('Now you can test client-practitioner connections.');

  } catch (error) {
    console.error('❌ Create practitioner error:', error);
  }
}

createTestPractitioner();
