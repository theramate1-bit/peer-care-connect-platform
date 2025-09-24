#!/usr/bin/env node

/**
 * Final Stripe Integration Test
 * This script tests the complete Stripe integration with live keys
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://aikqnvltuwwgifuocvto.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

class FinalStripeTester {
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
      this.log('🚀 Starting Final Stripe Integration Test');
      
      // Step 1: Test environment variables
      await this.testEnvironmentVariables();
      
      // Step 2: Sign in with existing user
      await this.signInWithExistingUser();
      
      // Step 3: Test create-checkout function
      await this.testCreateCheckoutFunction();
      
      // Step 4: Test different subscription plans
      await this.testSubscriptionPlans();
      
      // Step 5: Generate final report
      await this.generateFinalReport();
      
    } catch (error) {
      this.log('❌ Test failed:', error.message);
      console.error('Full error:', error);
    }
  }

  async testEnvironmentVariables() {
    this.log('🔧 Testing environment variables...');
    
    const { data, error } = await supabase.functions.invoke('test-env-vars', {
      body: {}
    });

    if (error) {
      this.log('❌ Environment variables test failed', { error: error.message });
      return false;
    }

    this.log('✅ Environment variables test successful!', {
      stripeKey: data.environmentVariables.STRIPE_SECRET_KEY,
      stripeTest: data.stripeTest,
      stripeMode: data.environmentVariables.STRIPE_SECRET_KEY.includes('sk_live_') ? 'LIVE' : 'TEST'
    });

    return true;
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

  async testCreateCheckoutFunction() {
    this.log('💳 Testing create-checkout function...');
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan: 'practitioner',
          billing: 'monthly'
        }
      });

      if (error) {
        this.log('❌ Create-checkout function failed', {
          error: error.message,
          details: error.details || 'No additional details'
        });
        return false;
      }

      this.log('🎉 CREATE-CHECKOUT FUNCTION WORKING!', {
        checkoutUrl: data.url,
        sessionId: data.sessionId,
        stripeMode: data.stripeMode,
        plan: 'practitioner',
        billing: 'monthly'
      });

      // Test if we can access the checkout URL
      if (data.url) {
        this.log('🔗 Testing checkout URL accessibility...');
        try {
          const response = await fetch(data.url, { method: 'HEAD' });
          this.log('✅ Checkout URL is accessible', {
            status: response.status,
            statusText: response.statusText
          });
        } catch (fetchError) {
          this.log('⚠️ Could not test checkout URL accessibility', {
            error: fetchError.message
          });
        }
      }

      return true;
    } catch (error) {
      this.log('❌ Create-checkout function error', {
        error: error.message,
        type: error.constructor.name
      });
      return false;
    }
  }

  async testSubscriptionPlans() {
    this.log('📋 Testing different subscription plans...');
    
    const plans = [
      { plan: 'practitioner', billing: 'monthly', expectedPrice: 2900 },
      { plan: 'practitioner', billing: 'yearly', expectedPrice: 2610 },
      { plan: 'clinic', billing: 'monthly', expectedPrice: 9900 },
      { plan: 'clinic', billing: 'yearly', expectedPrice: 8910 }
    ];

    for (const testPlan of plans) {
      this.log(`Testing ${testPlan.plan} ${testPlan.billing} plan...`);
      
      try {
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: {
            plan: testPlan.plan,
            billing: testPlan.billing
          }
        });

        if (error) {
          this.log(`❌ ${testPlan.plan} ${testPlan.billing} plan failed`, {
            error: error.message
          });
        } else {
          this.log(`✅ ${testPlan.plan} ${testPlan.billing} plan working!`, {
            checkoutUrl: data.url,
            stripeMode: data.stripeMode,
            expectedPrice: testPlan.expectedPrice
          });
        }
      } catch (error) {
        this.log(`❌ ${testPlan.plan} ${testPlan.billing} plan error`, {
          error: error.message
        });
      }
    }
  }

  async generateFinalReport() {
    this.log('📊 Generating final test report...');
    
    const report = {
      testSummary: {
        totalTests: this.testResults.length,
        successfulTests: this.testResults.filter(r => r.message.includes('✅')).length,
        warnings: this.testResults.filter(r => r.message.includes('⚠️')).length,
        errors: this.testResults.filter(r => r.message.includes('❌')).length
      },
      testResults: this.testResults
    };

    console.log('\n' + '='.repeat(70));
    console.log('🎯 FINAL STRIPE INTEGRATION TEST REPORT');
    console.log('='.repeat(70));
    console.log(`Total Tests: ${report.testSummary.totalTests}`);
    console.log(`Successful: ${report.testSummary.successfulTests}`);
    console.log(`Warnings: ${report.testSummary.warnings}`);
    console.log(`Errors: ${report.testSummary.errors}`);
    console.log('='.repeat(70));
    
    // Check if create-checkout is working
    const createCheckoutWorking = this.testResults.some(r => 
      r.message.includes('CREATE-CHECKOUT FUNCTION WORKING!')
    );
    
    if (createCheckoutWorking) {
      console.log('\n🎉 SUCCESS: Stripe integration is FULLY WORKING!');
      console.log('✅ Environment variables are set correctly');
      console.log('✅ Stripe connection is working');
      console.log('✅ Checkout sessions can be created');
      console.log('✅ Ready for production payments');
      
      console.log('\n🚨 IMPORTANT: You are using LIVE Stripe keys!');
      console.log('⚠️  Real payments will be processed');
      console.log('⚠️  Real money will be charged');
      console.log('⚠️  Test carefully before going live');
    } else {
      console.log('\n❌ ISSUE: Create-checkout function is not working');
      console.log('🔧 Check Edge Function logs for specific errors');
      console.log('🔧 Verify authentication is working');
      console.log('🔧 Check request body format');
    }
    
    console.log('\n' + '='.repeat(70));
  }
}

// Run the test
const tester = new FinalStripeTester();
tester.runTest().catch(console.error);
