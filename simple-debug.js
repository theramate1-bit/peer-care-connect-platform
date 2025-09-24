// Simple debug script to check client data
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aikqnvltuwwgifuocvto.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('=== USER PROFILES ===');
  const { data: users, error: userError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_role', 'client');
  
  if (userError) {
    console.log('User Error:', userError);
  } else {
    console.log('Users found:', users.length);
    users.forEach((user, i) => {
      console.log(`User ${i+1}:`, {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        location: user.location,
        onboarding_status: user.onboarding_status
      });
    });
  }

  console.log('\n=== CLIENT PROFILES ===');
  const { data: clients, error: clientError } = await supabase
    .from('client_profiles')
    .select('*');
  
  if (clientError) {
    console.log('Client Error:', clientError);
  } else {
    console.log('Client profiles found:', clients.length);
    clients.forEach((client, i) => {
      console.log(`Client ${i+1}:`, {
        user_id: client.user_id,
        preferences: client.preferences
      });
    });
  }
}

checkData().catch(console.error);
