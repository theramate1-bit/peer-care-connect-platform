#!/usr/bin/env node

/**
 * Check Credit System Database Schema
 * 
 * This script checks what credit-related tables and functions exist in the database.
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

async function checkCreditSystem() {
  console.log('🔍 CHECKING CREDIT SYSTEM DATABASE SCHEMA');
  console.log('=' .repeat(60));

  try {
    // Check if credits table exists
    console.log('\n📊 CHECKING CREDITS TABLE');
    console.log('=' .repeat(40));
    
    const { data: creditsTable, error: creditsError } = await supabase
      .from('credits')
      .select('*')
      .limit(1);

    if (creditsError) {
      console.log('❌ Credits table does not exist or is not accessible');
      console.log('Error:', creditsError.message);
    } else {
      console.log('✅ Credits table exists');
      console.log('Sample data:', creditsTable);
    }

    // Check if credit_transactions table exists
    console.log('\n📋 CHECKING CREDIT_TRANSACTIONS TABLE');
    console.log('=' .repeat(40));
    
    const { data: transactionsTable, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('*')
      .limit(1);

    if (transactionsError) {
      console.log('❌ Credit_transactions table does not exist or is not accessible');
      console.log('Error:', transactionsError.message);
    } else {
      console.log('✅ Credit_transactions table exists');
      console.log('Sample data:', transactionsTable);
    }

    // Check if client_sessions table has credit-related columns
    console.log('\n📅 CHECKING CLIENT_SESSIONS TABLE');
    console.log('=' .repeat(40));
    
    const { data: sessionsTable, error: sessionsError } = await supabase
      .from('client_sessions')
      .select('*')
      .limit(1);

    if (sessionsError) {
      console.log('❌ Client_sessions table does not exist or is not accessible');
      console.log('Error:', sessionsError.message);
    } else {
      console.log('✅ Client_sessions table exists');
      if (sessionsTable && sessionsTable.length > 0) {
        const columns = Object.keys(sessionsTable[0]);
        console.log('Available columns:', columns);
        
        const creditColumns = columns.filter(col => 
          col.includes('credit') || col.includes('peer') || col.includes('is_peer')
        );
        
        if (creditColumns.length > 0) {
          console.log('✅ Credit-related columns found:', creditColumns);
        } else {
          console.log('❌ No credit-related columns found');
        }
      } else {
        console.log('ℹ️  Table is empty, checking schema...');
      }
    }

    // Check for credit-related functions
    console.log('\n⚙️ CHECKING CREDIT FUNCTIONS');
    console.log('=' .repeat(40));

    // Try to call the functions that should exist
    const functionsToCheck = [
      'get_credit_balance',
      'update_credit_balance', 
      'process_credit_transaction',
      'get_credit_transactions'
    ];

    for (const funcName of functionsToCheck) {
      try {
        console.log(`Checking function: ${funcName}`);
        
        if (funcName === 'get_credit_balance') {
          const { data, error } = await supabase.rpc(funcName, { p_user_id: 'test-id' });
          if (error) {
            console.log(`❌ ${funcName}: ${error.message}`);
          } else {
            console.log(`✅ ${funcName}: Available`);
          }
        } else if (funcName === 'get_credit_transactions') {
          const { data, error } = await supabase.rpc(funcName, { 
            p_user_id: 'test-id',
            p_limit: 10,
            p_offset: 0
          });
          if (error) {
            console.log(`❌ ${funcName}: ${error.message}`);
          } else {
            console.log(`✅ ${funcName}: Available`);
          }
        } else {
          const { data, error } = await supabase.rpc(funcName, { 
            p_user_id: 'test-id',
            p_amount: 10,
            p_transaction_type: 'earn',
            p_description: 'test'
          });
          if (error) {
            console.log(`❌ ${funcName}: ${error.message}`);
          } else {
            console.log(`✅ ${funcName}: Available`);
          }
        }
      } catch (error) {
        console.log(`❌ ${funcName}: ${error.message}`);
      }
    }

    // Check what functions actually exist
    console.log('\n🔍 CHECKING AVAILABLE FUNCTIONS');
    console.log('=' .repeat(40));

    const { data: functions, error: functionsError } = await supabase
      .rpc('get_available_functions');

    if (functionsError) {
      console.log('❌ Could not get available functions:', functionsError.message);
    } else {
      console.log('✅ Available functions:', functions);
    }

    console.log('\n📋 SUMMARY');
    console.log('=' .repeat(40));
    console.log('Based on the checks above, here\'s what needs to be done:');
    console.log('1. Create credits table if it doesn\'t exist');
    console.log('2. Create credit_transactions table if it doesn\'t exist');
    console.log('3. Add credit-related columns to client_sessions table');
    console.log('4. Create credit management functions');
    console.log('5. Set up proper RLS policies for credit system');

  } catch (error) {
    console.log('❌ Error checking credit system:', error.message);
  }
}

// Run the check
checkCreditSystem().catch(console.error);
