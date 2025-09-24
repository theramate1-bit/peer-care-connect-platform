#!/usr/bin/env node

/**
 * Add Diverse Practitioner Data
 * 
 * This script adds more diverse practitioner data to make the marketplace
 * more realistic and comprehensive.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample practitioner data for different roles
const practitionerTemplates = {
  sports_therapist: [
    {
      first_name: 'Sarah',
      last_name: 'Johnson',
      email: 'sarah.johnson@example.com',
      bio: 'Experienced sports therapist specializing in injury rehabilitation and performance optimization. Certified in advanced sports massage and injury prevention techniques. Works with professional athletes and weekend warriors alike.',
      location: 'London, UK',
      professional_body: 'british_association_of_sports_therapists',
      registration_number: 'ST001234',
      qualification_type: 'itmmif',
      qualification_expiry: '2026-12-31'
    },
    {
      first_name: 'James',
      last_name: 'Mitchell',
      email: 'james.mitchell@example.com',
      bio: 'Sports therapist with expertise in rugby and football injuries. Specializes in concussion management and return-to-play protocols. Former professional rugby player with 10+ years clinical experience.',
      location: 'Manchester, UK',
      professional_body: 'society_of_sports_therapists',
      registration_number: 'ST005678',
      qualification_type: 'atmmif',
      qualification_expiry: '2025-08-15'
    }
  ],
  massage_therapist: [
    {
      first_name: 'Emma',
      last_name: 'Williams',
      email: 'emma.williams@example.com',
      bio: 'Licensed massage therapist with expertise in deep tissue massage, sports massage, and therapeutic bodywork. Specializing in stress relief, injury recovery, and chronic pain management.',
      location: 'Birmingham, UK',
      professional_body: 'other',
      professional_body_other: 'Federation of Holistic Therapists',
      registration_number: 'MT009876',
      qualification_type: 'equivalent',
      qualification_expiry: '2027-03-20'
    },
    {
      first_name: 'David',
      last_name: 'Chen',
      email: 'david.chen@example.com',
      bio: 'Specialized massage therapist focusing on Swedish massage, hot stone therapy, and aromatherapy. Trained in traditional Chinese medicine techniques and acupressure.',
      location: 'Edinburgh, UK',
      professional_body: 'other',
      professional_body_other: 'Complementary and Natural Healthcare Council',
      registration_number: 'MT004321',
      qualification_type: 'none',
      qualification_expiry: null
    }
  ],
  osteopath: [
    {
      first_name: 'Dr. Rebecca',
      last_name: 'Thompson',
      email: 'rebecca.thompson@example.com',
      bio: 'Qualified osteopath focusing on holistic treatment of musculoskeletal conditions. Specializes in manual therapy, postural assessment, and pain management. Experienced in treating back pain, neck pain, and sports injuries.',
      location: 'Bristol, UK',
      professional_body: 'general_osteopathic_council',
      registration_number: 'OST001234',
      qualification_type: 'equivalent',
      qualification_expiry: '2026-06-30'
    },
    {
      first_name: 'Dr. Michael',
      last_name: 'Roberts',
      email: 'michael.roberts@example.com',
      bio: 'Osteopath with special interest in pediatric and geriatric care. Certified in cranial osteopathy and visceral manipulation. Works with patients of all ages from newborns to elderly.',
      location: 'Leeds, UK',
      professional_body: 'general_osteopathic_council',
      registration_number: 'OST005678',
      qualification_type: 'equivalent',
      qualification_expiry: '2025-11-15'
    }
  ]
};

async function addPractitioners() {
  console.log('👨‍⚕️ ADDING DIVERSE PRACTITIONER DATA');
  console.log('=' .repeat(50));

  try {
    // Check existing practitioners
    const { data: existingPractitioners, error: existingError } = await supabase
      .from('users')
      .select('email, user_role')
      .in('user_role', ['sports_therapist', 'massage_therapist', 'osteopath']);

    if (existingError) {
      console.log('❌ Failed to check existing practitioners:', existingError.message);
      return false;
    }

    const existingEmails = existingPractitioners.map(p => p.email.toLowerCase());
    const existingRoles = existingPractitioners.map(p => p.user_role);

    console.log(`📊 Current practitioners: ${existingPractitioners.length}`);
    console.log(`   Sports Therapists: ${existingRoles.filter(r => r === 'sports_therapist').length}`);
    console.log(`   Massage Therapists: ${existingRoles.filter(r => r === 'massage_therapist').length}`);
    console.log(`   Osteopaths: ${existingRoles.filter(r => r === 'osteopath').length}`);

    let addedCount = 0;
    let skippedCount = 0;

    // Add practitioners for each role
    for (const [role, templates] of Object.entries(practitionerTemplates)) {
      console.log(`\n📝 Adding ${role.replace('_', ' ')} practitioners...`);

      for (const template of templates) {
        // Skip if email already exists
        if (existingEmails.includes(template.email.toLowerCase())) {
          console.log(`   ⏭️  Skipped ${template.first_name} ${template.last_name} (email exists)`);
          skippedCount++;
          continue;
        }

        // Create practitioner user
        const practitionerData = {
          email: template.email,
          first_name: template.first_name,
          last_name: template.last_name,
          user_role: role,
          bio: template.bio,
          location: template.location,
          professional_body: template.professional_body,
          professional_body_other: template.professional_body_other || null,
          registration_number: template.registration_number,
          qualification_type: template.qualification_type,
          qualification_expiry: template.qualification_expiry,
          is_active: true,
          is_verified: true,
          profile_completed: true,
          onboarding_status: 'completed',
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString()
        };

        const { data: newPractitioner, error: insertError } = await supabase
          .from('users')
          .insert(practitionerData)
          .select()
          .single();

        if (insertError) {
          console.log(`   ❌ Failed to add ${template.first_name} ${template.last_name}:`, insertError.message);
        } else {
          console.log(`   ✅ Added ${template.first_name} ${template.last_name} (${role.replace('_', ' ')})`);
          addedCount++;
        }
      }
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Added: ${addedCount} practitioners`);
    console.log(`   Skipped: ${skippedCount} practitioners (already exist)`);

    if (addedCount > 0) {
      console.log('\n🎉 Successfully added diverse practitioner data!');
      console.log('The marketplace now has a more realistic variety of practitioners.');
    } else {
      console.log('\n💡 No new practitioners were added (all already exist).');
    }

    return addedCount > 0;

  } catch (error) {
    console.log('❌ Failed to add practitioners:', error.message);
    return false;
  }
}

async function verifyMarketplaceDiversity() {
  console.log('\n🔍 VERIFYING MARKETPLACE DIVERSITY');
  console.log('=' .repeat(50));

  try {
    const { data: practitioners, error } = await supabase
      .from('users')
      .select('first_name, last_name, user_role, location, bio')
      .in('user_role', ['sports_therapist', 'massage_therapist', 'osteopath'])
      .eq('is_active', true);

    if (error) {
      console.log('❌ Failed to verify practitioners:', error.message);
      return false;
    }

    console.log(`✅ Total active practitioners: ${practitioners.length}`);

    const roleCounts = practitioners.reduce((acc, p) => {
      acc[p.user_role] = (acc[p.user_role] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📊 Role Distribution:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`   ${role.replace('_', ' ')}: ${count}`);
    });

    const locations = [...new Set(practitioners.map(p => p.location))];
    console.log(`\n📍 Locations: ${locations.length} different locations`);
    locations.forEach(location => {
      const count = practitioners.filter(p => p.location === location).length;
      console.log(`   - ${location}: ${count} practitioners`);
    });

    const completeProfiles = practitioners.filter(p => 
      p.bio && p.bio.length > 50 && p.location
    ).length;

    console.log(`\n📋 Profile Quality:`);
    console.log(`   Complete profiles: ${completeProfiles}/${practitioners.length} (${Math.round(completeProfiles/practitioners.length*100)}%)`);

    return practitioners.length >= 3; // At least 3 practitioners for a good marketplace

  } catch (error) {
    console.log('❌ Failed to verify diversity:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 ENHANCING MARKETPLACE WITH DIVERSE PRACTITIONERS');
  console.log('=' .repeat(60));

  const addedPractitioners = await addPractitioners();
  const diversityGood = await verifyMarketplaceDiversity();

  console.log('\n📋 FINAL RESULTS');
  console.log('=' .repeat(60));
  
  if (addedPractitioners && diversityGood) {
    console.log('🎉 MARKETPLACE ENHANCEMENT SUCCESSFUL!');
    console.log('✅ Added diverse practitioner data');
    console.log('✅ Marketplace has good diversity');
    console.log('\n🚀 The marketplace is now ready with:');
    console.log('- Multiple practitioner types (sports therapists, massage therapists, osteopaths)');
    console.log('- Practitioners from different UK locations');
    console.log('- Complete professional profiles');
    console.log('- Realistic specializations and experience');
  } else {
    console.log('⚠️  MARKETPLACE ENHANCEMENT NEEDS ATTENTION');
    if (!addedPractitioners) {
      console.log('❌ Failed to add new practitioners');
    }
    if (!diversityGood) {
      console.log('❌ Marketplace diversity is insufficient');
    }
  }

  console.log('\n🧪 Next: Run the complete test suite to verify everything works!');
  console.log('   node test-marketplace-complete.js');
}

main().catch(console.error);
