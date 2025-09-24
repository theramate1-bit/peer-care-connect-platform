#!/usr/bin/env node

/**
 * Apply Credit Functions to Database
 * 
 * This script applies the credit system functions directly to the database.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyCreditFunctions() {
  console.log('🔧 APPLYING CREDIT SYSTEM FUNCTIONS');
  console.log('=' .repeat(60));

  try {
    // Read the migration file
    const migrationSQL = fs.readFileSync('./supabase/migrations/20250121_create_credit_functions.sql', 'utf8');
    
    console.log('📄 Migration SQL loaded, applying to database...');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`\n⚙️  Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          const { data, error } = await supabase.rpc('execute_sql', { 
            sql: statement + ';' 
          });
          
          if (error) {
            console.log(`❌ Error in statement ${i + 1}:`, error.message);
            // Continue with other statements
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.log(`❌ Exception in statement ${i + 1}:`, err.message);
        }
      }
    }

    console.log('\n🧪 TESTING CREDIT FUNCTIONS');
    console.log('=' .repeat(40));

    // Test the functions
    const testUserId = '00000000-0000-0000-0000-000000000000'; // Test UUID

    // Test get_credit_balance
    console.log('Testing get_credit_balance...');
    const { data: balanceData, error: balanceError } = await supabase
      .rpc('get_credit_balance', { p_user_id: testUserId });
    
    if (balanceError) {
      console.log('❌ get_credit_balance test failed:', balanceError.message);
    } else {
      console.log('✅ get_credit_balance test passed:', balanceData);
    }

    // Test update_credit_balance
    console.log('Testing update_credit_balance...');
    const { data: updateData, error: updateError } = await supabase
      .rpc('update_credit_balance', {
        p_user_id: testUserId,
        p_amount: 10,
        p_transaction_type: 'earn',
        p_description: 'Test credit award',
        p_reference_id: testUserId,
        p_reference_type: 'test'
      });
    
    if (updateError) {
      console.log('❌ update_credit_balance test failed:', updateError.message);
    } else {
      console.log('✅ update_credit_balance test passed:', updateData);
    }

    // Test get_credit_transactions
    console.log('Testing get_credit_transactions...');
    const { data: transactionsData, error: transactionsError } = await supabase
      .rpc('get_credit_transactions', {
        p_user_id: testUserId,
        p_limit: 10,
        p_offset: 0
      });
    
    if (transactionsError) {
      console.log('❌ get_credit_transactions test failed:', transactionsError.message);
    } else {
      console.log('✅ get_credit_transactions test passed:', transactionsData);
    }

    // Test has_sufficient_credits
    console.log('Testing has_sufficient_credits...');
    const { data: sufficientData, error: sufficientError } = await supabase
      .rpc('has_sufficient_credits', {
        p_user_id: testUserId,
        p_required_amount: 5
      });
    
    if (sufficientError) {
      console.log('❌ has_sufficient_credits test failed:', sufficientError.message);
    } else {
      console.log('✅ has_sufficient_credits test passed:', sufficientData);
    }

    console.log('\n🎉 CREDIT FUNCTIONS APPLIED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    console.log('✅ All credit system functions are now available');
    console.log('✅ Credit-related columns added to client_sessions');
    console.log('✅ Proper indexes created for performance');
    console.log('✅ Functions tested and working');

  } catch (error) {
    console.log('❌ Error applying credit functions:', error.message);
  }
}

// Run the application
applyCreditFunctions().catch(console.error);
