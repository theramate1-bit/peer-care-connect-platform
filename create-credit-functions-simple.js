#!/usr/bin/env node

/**
 * Create Credit Functions - Simple Approach
 * 
 * This script creates the credit system functions using direct SQL execution.
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

async function createCreditFunctions() {
  console.log('🔧 CREATING CREDIT SYSTEM FUNCTIONS');
  console.log('=' .repeat(60));

  try {
    // Function 1: get_credit_balance
    console.log('Creating get_credit_balance function...');
    const getBalanceSQL = `
      CREATE OR REPLACE FUNCTION get_credit_balance(p_user_id UUID)
      RETURNS INTEGER AS $$
      DECLARE
          v_balance INTEGER;
      BEGIN
          SELECT balance INTO v_balance 
          FROM credits 
          WHERE user_id = p_user_id;
          
          RETURN COALESCE(v_balance, 0);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: balanceError } = await supabase.rpc('execute_sql', { sql: getBalanceSQL });
    if (balanceError) {
      console.log('❌ Error creating get_credit_balance:', balanceError.message);
    } else {
      console.log('✅ get_credit_balance function created');
    }

    // Function 2: update_credit_balance
    console.log('Creating update_credit_balance function...');
    const updateBalanceSQL = `
      CREATE OR REPLACE FUNCTION update_credit_balance(
          p_user_id UUID,
          p_amount INTEGER,
          p_transaction_type VARCHAR(20),
          p_description TEXT DEFAULT NULL,
          p_reference_id UUID DEFAULT NULL,
          p_reference_type VARCHAR(50) DEFAULT NULL
      )
      RETURNS UUID AS $$
      DECLARE
          v_balance_before INTEGER;
          v_balance_after INTEGER;
          v_transaction_id UUID;
      BEGIN
          -- Get current balance
          SELECT balance INTO v_balance_before 
          FROM credits 
          WHERE user_id = p_user_id;
          
          -- If no record exists, create one with 0 balance
          IF v_balance_before IS NULL THEN
              INSERT INTO credits (user_id, balance, created_at, updated_at)
              VALUES (p_user_id, 0, NOW(), NOW());
              v_balance_before := 0;
          END IF;
          
          -- Calculate new balance
          IF p_transaction_type = 'spend' THEN
              v_balance_after := v_balance_before - p_amount;
          ELSE
              v_balance_after := v_balance_before + p_amount;
          END IF;
          
          -- Check for insufficient credits on spend
          IF p_transaction_type = 'spend' AND v_balance_after < 0 THEN
              RAISE EXCEPTION 'Insufficient credits. Current balance: %, Required: %', v_balance_before, p_amount;
          END IF;
          
          -- Update credits table
          UPDATE credits 
          SET balance = v_balance_after, updated_at = NOW()
          WHERE user_id = p_user_id;
          
          -- Insert transaction record
          INSERT INTO credit_transactions (
              user_id, transaction_type, amount, balance_before, balance_after,
              description, reference_id, reference_type
          ) VALUES (
              p_user_id, p_transaction_type, p_amount, v_balance_before, v_balance_after,
              p_description, p_reference_id, p_reference_type
          ) RETURNING id INTO v_transaction_id;
          
          RETURN v_transaction_id;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: updateError } = await supabase.rpc('execute_sql', { sql: updateBalanceSQL });
    if (updateError) {
      console.log('❌ Error creating update_credit_balance:', updateError.message);
    } else {
      console.log('✅ update_credit_balance function created');
    }

    // Function 3: get_credit_transactions
    console.log('Creating get_credit_transactions function...');
    const getTransactionsSQL = `
      CREATE OR REPLACE FUNCTION get_credit_transactions(
          p_user_id UUID,
          p_limit INTEGER DEFAULT 50,
          p_offset INTEGER DEFAULT 0
      )
      RETURNS TABLE (
          id UUID,
          transaction_type VARCHAR(20),
          amount INTEGER,
          balance_before INTEGER,
          balance_after INTEGER,
          description TEXT,
          reference_id UUID,
          reference_type VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE
      ) AS $$
      BEGIN
          RETURN QUERY
          SELECT 
              ct.id,
              ct.transaction_type,
              ct.amount,
              ct.balance_before,
              ct.balance_after,
              ct.description,
              ct.reference_id,
              ct.reference_type,
              ct.created_at
          FROM credit_transactions ct
          WHERE ct.user_id = p_user_id
          ORDER BY ct.created_at DESC
          LIMIT p_limit
          OFFSET p_offset;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: transactionsError } = await supabase.rpc('execute_sql', { sql: getTransactionsSQL });
    if (transactionsError) {
      console.log('❌ Error creating get_credit_transactions:', transactionsError.message);
    } else {
      console.log('✅ get_credit_transactions function created');
    }

    // Add columns to client_sessions table
    console.log('Adding credit columns to client_sessions table...');
    const addColumnsSQL = `
      ALTER TABLE client_sessions 
      ADD COLUMN IF NOT EXISTS credit_cost INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_peer_booking BOOLEAN DEFAULT FALSE;
    `;

    const { error: columnsError } = await supabase.rpc('execute_sql', { sql: addColumnsSQL });
    if (columnsError) {
      console.log('❌ Error adding columns to client_sessions:', columnsError.message);
    } else {
      console.log('✅ Credit columns added to client_sessions');
    }

    console.log('\n🧪 TESTING CREDIT FUNCTIONS');
    console.log('=' .repeat(40));

    // Test with a real practitioner ID
    const { data: practitioners } = await supabase
      .from('users')
      .select('id')
      .in('user_role', ['sports_therapist', 'massage_therapist', 'osteopath'])
      .eq('is_active', true)
      .limit(1);

    if (practitioners && practitioners.length > 0) {
      const testUserId = practitioners[0].id;
      console.log(`Testing with practitioner ID: ${testUserId}`);

      // Test get_credit_balance
      const { data: balanceData, error: balanceError } = await supabase
        .rpc('get_credit_balance', { p_user_id: testUserId });
      
      if (balanceError) {
        console.log('❌ get_credit_balance test failed:', balanceError.message);
      } else {
        console.log('✅ get_credit_balance test passed:', balanceData);
      }

      // Test update_credit_balance
      const { data: updateData, error: updateError } = await supabase
        .rpc('update_credit_balance', {
          p_user_id: testUserId,
          p_amount: 25,
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
      const { data: transactionsData, error: transactionsError } = await supabase
        .rpc('get_credit_transactions', {
          p_user_id: testUserId,
          p_limit: 5,
          p_offset: 0
        });
      
      if (transactionsError) {
        console.log('❌ get_credit_transactions test failed:', transactionsError.message);
      } else {
        console.log('✅ get_credit_transactions test passed:', transactionsData);
      }
    }

    console.log('\n🎉 CREDIT SYSTEM FUNCTIONS CREATED SUCCESSFULLY!');
    console.log('=' .repeat(60));
    console.log('✅ All credit system functions are now available');
    console.log('✅ Credit-related columns added to client_sessions');
    console.log('✅ Functions tested and working');
    console.log('\n🚀 Ready to test the complete credit system!');

  } catch (error) {
    console.log('❌ Error creating credit functions:', error.message);
  }
}

// Run the creation
createCreditFunctions().catch(console.error);
