// Check client_profiles table schema
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aikqnvltuwwgifuocvto.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClientSchema() {
  console.log('🔍 Checking client_profiles table schema...\n');

  try {
    // Try to insert a minimal record to see what columns are required
    const { error: insertError } = await supabase
      .from('client_profiles')
      .insert({
        user_id: 'test-user-id'
      });

    if (insertError) {
      console.log('❌ Insert error (expected):', insertError.message);
      
      // Try to get table info by attempting a select
      const { data, error: selectError } = await supabase
        .from('client_profiles')
        .select('*')
        .limit(0);

      if (selectError) {
        console.log('❌ Select error:', selectError.message);
      } else {
        console.log('✅ Table exists but is empty');
      }
    } else {
      console.log('✅ Minimal insert succeeded');
    }

  } catch (error) {
    console.error('❌ Schema check error:', error);
  }
}

checkClientSchema();
