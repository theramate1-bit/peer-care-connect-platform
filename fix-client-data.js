// Fix script to update client data
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aikqnvltuwwgifuocvto.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';
const supabase = createClient(supabaseUrl, supabaseKey);

const userId = 'bda9384a-7e7f-4bbe-86d7-d1ced213cf93';

async function fixClientData() {
  console.log('🔧 Fixing client data...\n');

  try {
    // Step 1: Update user profile with missing data
    console.log('1. Updating user profile...');
    const { error: userUpdateError } = await supabase
      .from('user_profiles')
      .update({
        last_name: 'Doe', // You'll need to provide your actual last name
        location: 'London, UK', // You'll need to provide your actual location
        avatar_preferences: {
          hairColor: 'brown',
          clothingColor: 'blue',
          accessories: [],
          backgroundColor: 'f0f0f0',
          skinColor: 'light',
          clothing: 'shirt',
          hairStyle: 'short',
          eyes: 'default',
          eyebrows: 'default',
          mouth: 'default',
          flip: false,
          rotate: 0,
          scale: 1
        }
      })
      .eq('id', userId);

    if (userUpdateError) {
      console.error('❌ Error updating user profile:', userUpdateError);
      return;
    }
    console.log('✅ User profile updated successfully');

    // Step 2: Create client profile with preferences
    console.log('\n2. Creating client profile...');
    const { error: clientCreateError } = await supabase
      .from('client_profiles')
      .insert({
        user_id: userId,
        preferences: {
          primary_goal: 'Pain Relief', // You'll need to provide your actual goal
          preferred_therapy_types: ['Sports Therapy', 'Massage Therapy', 'Osteopathy', 'Physiotherapy'],
          budget: '£50-100 per session',
          preferred_gender: 'No preference',
          preferred_location: 'Any location',
          preferred_time: 'Flexible',
          max_travel_distance: 10
        },
        medical_history: {
          conditions: '',
          medications: '',
          allergies: '',
          previous_therapy: ''
        },
        emergency_contact_name: '',
        emergency_contact_phone: ''
      });

    if (clientCreateError) {
      console.error('❌ Error creating client profile:', clientCreateError);
      return;
    }
    console.log('✅ Client profile created successfully');

    // Step 3: Verify the fix
    console.log('\n3. Verifying the fix...');
    const { data: updatedUser } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: newClientProfile } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    console.log('✅ Updated user profile:', {
      first_name: updatedUser.first_name,
      last_name: updatedUser.last_name,
      location: updatedUser.location,
      avatar_preferences: updatedUser.avatar_preferences
    });

    console.log('✅ New client profile:', {
      preferences: newClientProfile.preferences
    });

    console.log('\n🎉 Client data fixed successfully!');
    console.log('You can now refresh your profile page to see the updated data.');

  } catch (error) {
    console.error('❌ Fix error:', error);
  }
}

fixClientData();
