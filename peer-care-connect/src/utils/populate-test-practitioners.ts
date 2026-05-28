import { supabase } from '@/integrations/supabase/client';
import { GeocodingService } from '@/lib/geocoding';

// Test practitioner data with real locations
const testPractitioners = [
  {
    first_name: 'Sarah',
    last_name: 'Johnson',
    user_role: 'sports_therapist',
    location: 'London, UK',
    bio: 'Experienced sports therapist specializing in injury rehabilitation and performance optimization.',
    specializations: ['Sports Injury', 'Rehabilitation', 'Performance'],
    hourly_rate: 75,
    experience_years: 8,
    professional_statement: 'Helping athletes achieve their peak performance through evidence-based treatment.',
    treatment_philosophy: 'Holistic approach combining manual therapy, exercise prescription, and injury prevention.'
  },
  {
    first_name: 'Michael',
    last_name: 'Chen',
    user_role: 'massage_therapist',
    location: 'Manchester, UK',
    bio: 'Licensed massage therapist with expertise in deep tissue and therapeutic massage.',
    specializations: ['Deep Tissue', 'Therapeutic Massage', 'Stress Relief'],
    hourly_rate: 60,
    experience_years: 5,
    professional_statement: 'Providing therapeutic massage to help clients recover and maintain optimal health.',
    treatment_philosophy: 'Tailored treatments that address both physical tension and mental stress.'
  },
  {
    first_name: 'Emma',
    last_name: 'Williams',
    user_role: 'osteopath',
    location: 'Birmingham, UK',
    bio: 'Registered osteopath focusing on musculoskeletal health and pain management.',
    specializations: ['Pain Management', 'Postural Correction', 'Joint Mobilization'],
    hourly_rate: 85,
    experience_years: 10,
    professional_statement: 'Using osteopathic principles to restore balance and function to the body.',
    treatment_philosophy: 'Treating the whole person, not just the symptoms.'
  },
  {
    first_name: 'David',
    last_name: 'Brown',
    user_role: 'sports_therapist',
    location: 'Leeds, UK',
    bio: 'Sports therapist specializing in football and rugby injuries.',
    specializations: ['Football Injuries', 'Rugby Injuries', 'Concussion Management'],
    hourly_rate: 70,
    experience_years: 6,
    professional_statement: 'Supporting athletes in their recovery and return to sport.',
    treatment_philosophy: 'Evidence-based treatment with focus on safe return to play.'
  },
  {
    first_name: 'Lisa',
    last_name: 'Taylor',
    user_role: 'massage_therapist',
    location: 'Liverpool, UK',
    bio: 'Specialized in prenatal and postnatal massage therapy.',
    specializations: ['Prenatal Massage', 'Postnatal Care', 'Women\'s Health'],
    hourly_rate: 65,
    experience_years: 7,
    professional_statement: 'Supporting women through pregnancy and beyond with specialized massage therapy.',
    treatment_philosophy: 'Gentle, nurturing care that supports the body\'s natural healing processes.'
  },
  {
    first_name: 'James',
    last_name: 'Wilson',
    user_role: 'osteopath',
    location: 'Newcastle, UK',
    bio: 'Osteopath with expertise in chronic pain and complex musculoskeletal conditions.',
    specializations: ['Chronic Pain', 'Complex Conditions', 'Rehabilitation'],
    hourly_rate: 90,
    experience_years: 12,
    professional_statement: 'Helping patients with complex conditions find relief and improved function.',
    treatment_philosophy: 'Comprehensive assessment and treatment of the whole musculoskeletal system.'
  }
];

export async function populateTestPractitioners(): Promise<{
  success: number;
  failed: number;
  results: Array<{ name: string; success: boolean; error?: string }>;
}> {
  const results: Array<{ name: string; success: boolean; error?: string }> = [];
  let successCount = 0;
  let failedCount = 0;

  try {
    for (const practitioner of testPractitioners) {
      try {
        // Geocode the location
        const geocodeResult = await GeocodingService.geocodeAddress(practitioner.location);
        
        if (!geocodeResult) {
          throw new Error('Could not geocode location');
        }

        // Create user profile
        const { data: userData, error: userError } = await supabase.auth.admin.createUser({
          email: `${practitioner.first_name.toLowerCase()}.${practitioner.last_name.toLowerCase()}@example.com`,
          password: 'TestPassword123!',
          email_confirm: true,
          user_metadata: {
            user_role: practitioner.user_role,
            first_name: practitioner.first_name,
            last_name: practitioner.last_name,
            full_name: `${practitioner.first_name} ${practitioner.last_name}`,
            onboarding_status: 'completed',
            profile_completed: true
          }
        });

        if (userError) {
          throw userError;
        }

        if (!userData.user) {
          throw new Error('User creation failed');
        }

        // Update user profile with practitioner data
        const { error: profileError } = await supabase
          .from('users')
          .update({
            bio: practitioner.bio,
            location: practitioner.location,
            latitude: geocodeResult.latitude,
            longitude: geocodeResult.longitude,
            specializations: practitioner.specializations,
            hourly_rate: practitioner.hourly_rate,
            experience_years: practitioner.experience_years,
            professional_statement: practitioner.professional_statement,
            treatment_philosophy: practitioner.treatment_philosophy,
            service_radius_km: 25,
            profile_completed: true,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', userData.user.id);

        if (profileError) {
          throw profileError;
        }

        successCount++;
        results.push({
          name: `${practitioner.first_name} ${practitioner.last_name}`,
          success: true
        });

        console.log(`✅ Created practitioner: ${practitioner.first_name} ${practitioner.last_name}`);

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        failedCount++;
        results.push({
          name: `${practitioner.first_name} ${practitioner.last_name}`,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        console.error(`❌ Failed to create practitioner: ${practitioner.first_name} ${practitioner.last_name}`, error);
      }
    }

    return { success: successCount, failed: failedCount, results };
  } catch (error) {
    console.error('Error populating test practitioners:', error);
    throw error;
  }
}

// Function to run the population (for testing)
export async function runPopulation() {
  console.log('🚀 Starting test practitioner population...');
  
  try {
    const result = await populateTestPractitioners();
    
    console.log(`\n📊 Results:`);
    console.log(`✅ Successfully created: ${result.success} practitioners`);
    console.log(`❌ Failed: ${result.failed} practitioners`);
    
    if (result.results.length > 0) {
      console.log('\n📋 Detailed Results:');
      result.results.forEach(r => {
        console.log(`${r.success ? '✅' : '❌'} ${r.name}${r.error ? ` - ${r.error}` : ''}`);
      });
    }
    
    return result;
  } catch (error) {
    console.error('💥 Population failed:', error);
    throw error;
  }
}
