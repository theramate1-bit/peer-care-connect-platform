// Check what columns actually exist in the user_profiles table
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aikqnvltuwwgifuocvto.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableSchema() {
  console.log('🔍 Checking table schema...\n');

  try {
    // Get a sample user to see what columns exist
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1)
      .single();

    if (userError) {
      console.error('❌ Error fetching user:', userError);
      return;
    }

    console.log('📋 User profiles table columns:');
    console.log(Object.keys(user).map(key => `  - ${key}`).join('\n'));

    // Check client_profiles table
    const { data: client, error: clientError } = await supabase
      .from('client_profiles')
      .select('*')
      .limit(1);

    if (clientError) {
      console.log('❌ Error fetching client profile:', clientError);
    } else if (client && client.length > 0) {
      console.log('\n📋 Client profiles table columns:');
      console.log(Object.keys(client[0]).map(key => `  - ${key}`).join('\n'));
    } else {
      console.log('\n📋 Client profiles table is empty');
    }

  } catch (error) {
    console.error('❌ Schema check error:', error);
  }
}

checkTableSchema();
