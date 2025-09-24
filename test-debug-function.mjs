#!/usr/bin/env node

/**
 * Test Debug Function
 * This script tests the debug version of create-checkout
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://aikqnvltuwwgifuocvto.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

class DebugFunctionTester {
  constructor() {
    this.testResults = [];
    this.currentUser = null;
  }

  log(message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    if (data) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
    this.testResults.push({ timestamp, message, data });
  }

  async runTest() {
    try {
      this.log('🚀 Testing Debug Create-Checkout Function');
      
      // Step 1: Sign in with existing user
      await this.signInWithExistingUser();
      
      // Step 2: Test debug function
      await this.testDebugFunction();
      
    } catch (error) {
      this.log('❌ Test failed:', error.message);
      console.error('Full error:', error);
    }
  }

  async signInWithExistingUser() {
    this.log('👤 Signing in with existing user...');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'test-1757686132816@example.com',
      password: 'TestPassword123!'
    });

    if (error) {
      throw new Error(`Sign in failed: ${error.message}`);
    }

    this.currentUser = data.user;
    
    this.log('✅ Successfully signed in!', {
      userId: this.currentUser.id,
      email: this.currentUser.email,
      userRole: this.currentUser.user_metadata?.user_role
    });
  }

  async testDebugFunction() {
    this.log('🔧 Testing debug create-checkout function...');
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-debug', {
        body: {
          plan: 'practitioner',
          billing: 'monthly'
        }
      });

      if (error) {
        this.log('❌ Debug function failed', {
          error: error.message,
          details: error.details || 'No additional details'
        });
      } else {
        this.log('🎉 DEBUG FUNCTION WORKING!', {
          checkoutUrl: data.url,
          sessionId: data.sessionId,
          stripeMode: data.stripeMode,
          plan: 'practitioner',
          billing: 'monthly'
        });
      }
    } catch (error) {
      this.log('❌ Debug function error', {
        error: error.message,
        type: error.constructor.name
      });
    }
  }
}

// Run the test
const tester = new DebugFunctionTester();
tester.runTest().catch(console.error);
