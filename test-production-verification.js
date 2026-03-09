#!/usr/bin/env node

/**
 * Production OAuth Flow Verification Script
 * Tests the OAuth flow by making HTTP requests and checking responses
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PRODUCTION_URL = 'https://theramate-ax7rldtpt-theras-projects-6dfd5a34.vercel.app';
const TEST_RESULTS_FILE = 'production-oauth-verification.json';

class OAuthVerifier {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      productionUrl: PRODUCTION_URL,
      tests: []
    };
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'OAuth-Test-Script/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...options.headers
        }
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            url: url
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  async testPageAccessibility() {
    console.log('🔍 Testing page accessibility...');
    
    const testResult = {
      name: 'Page Accessibility Test',
      startTime: new Date().toISOString(),
      steps: [],
      success: false
    };

    try {
      // Test main page
      console.log('📍 Testing main page...');
      const mainPageResponse = await this.makeRequest(PRODUCTION_URL);
      
      testResult.steps.push({
        step: 'Main page access',
        success: mainPageResponse.statusCode === 200,
        statusCode: mainPageResponse.statusCode,
        contentLength: mainPageResponse.body.length,
        timestamp: new Date().toISOString()
      });

      // Test login page
      console.log('🔐 Testing login page...');
      const loginPageResponse = await this.makeRequest(`${PRODUCTION_URL}/login`);
      
      testResult.steps.push({
        step: 'Login page access',
        success: loginPageResponse.statusCode === 200,
        statusCode: loginPageResponse.statusCode,
        contentLength: loginPageResponse.body.length,
        timestamp: new Date().toISOString()
      });

      // Test register page
      console.log('📝 Testing register page...');
      const registerPageResponse = await this.makeRequest(`${PRODUCTION_URL}/register`);
      
      testResult.steps.push({
        step: 'Register page access',
        success: registerPageResponse.statusCode === 200,
        statusCode: registerPageResponse.statusCode,
        contentLength: registerPageResponse.body.length,
        timestamp: new Date().toISOString()
      });

      // Check for OAuth-related content
      const oauthContent = [
        mainPageResponse.body.includes('Google'),
        loginPageResponse.body.includes('Google'),
        registerPageResponse.body.includes('Google'),
        mainPageResponse.body.includes('OAuth'),
        loginPageResponse.body.includes('OAuth'),
        registerPageResponse.body.includes('OAuth')
      ].filter(Boolean).length;

      testResult.steps.push({
        step: 'OAuth content detection',
        success: oauthContent > 0,
        oauthContentFound: oauthContent,
        timestamp: new Date().toISOString()
      });

      // Check for role-related content
      const roleContent = [
        mainPageResponse.body.includes('client'),
        mainPageResponse.body.includes('practitioner'),
        loginPageResponse.body.includes('client'),
        loginPageResponse.body.includes('practitioner'),
        registerPageResponse.body.includes('client'),
        registerPageResponse.body.includes('practitioner')
      ].filter(Boolean).length;

      testResult.steps.push({
        step: 'Role content detection',
        success: roleContent > 0,
        roleContentFound: roleContent,
        timestamp: new Date().toISOString()
      });

      testResult.success = testResult.steps.every(step => step.success);
      testResult.endTime = new Date().toISOString();
      testResult.duration = new Date(testResult.endTime) - new Date(testResult.startTime);

    } catch (error) {
      testResult.error = error.message;
      testResult.endTime = new Date().toISOString();
    }

    this.results.tests.push(testResult);
    return testResult;
  }

  async testSupabaseConnection() {
    console.log('🔗 Testing Supabase connection...');
    
    const testResult = {
      name: 'Supabase Connection Test',
      startTime: new Date().toISOString(),
      steps: [],
      success: false
    };

    try {
      // Test Supabase API endpoint
      const supabaseUrl = 'https://aikqnvltuwwgifuocvto.supabase.co';
      console.log('🌐 Testing Supabase API...');
      
      const supabaseResponse = await this.makeRequest(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac'
        }
      });

      testResult.steps.push({
        step: 'Supabase API access',
        success: supabaseResponse.statusCode === 200 || supabaseResponse.statusCode === 404, // 404 is expected for root
        statusCode: supabaseResponse.statusCode,
        timestamp: new Date().toISOString()
      });

      // Test auth endpoint
      console.log('🔐 Testing Supabase Auth...');
      const authResponse = await this.makeRequest(`${supabaseUrl}/auth/v1/settings`);
      
      testResult.steps.push({
        step: 'Supabase Auth access',
        success: authResponse.statusCode === 200,
        statusCode: authResponse.statusCode,
        timestamp: new Date().toISOString()
      });

      testResult.success = testResult.steps.every(step => step.success);
      testResult.endTime = new Date().toISOString();
      testResult.duration = new Date(testResult.endTime) - new Date(testResult.startTime);

    } catch (error) {
      testResult.error = error.message;
      testResult.endTime = new Date().toISOString();
    }

    this.results.tests.push(testResult);
    return testResult;
  }

  async testOAuthEndpoints() {
    console.log('🔍 Testing OAuth endpoints...');
    
    const testResult = {
      name: 'OAuth Endpoints Test',
      startTime: new Date().toISOString(),
      steps: [],
      success: false
    };

    try {
      // Test auth callback endpoint
      console.log('🔄 Testing auth callback endpoint...');
      const callbackResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/callback`);
      
      testResult.steps.push({
        step: 'Auth callback endpoint',
        success: callbackResponse.statusCode === 200,
        statusCode: callbackResponse.statusCode,
        timestamp: new Date().toISOString()
      });

      // Test role selection endpoint
      console.log('🎯 Testing role selection endpoint...');
      const roleSelectionResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/role-selection`);
      
      testResult.steps.push({
        step: 'Role selection endpoint',
        success: roleSelectionResponse.statusCode === 200,
        statusCode: roleSelectionResponse.statusCode,
        timestamp: new Date().toISOString()
      });

      // Test onboarding endpoint
      console.log('🔄 Testing onboarding endpoint...');
      const onboardingResponse = await this.makeRequest(`${PRODUCTION_URL}/onboarding`);
      
      testResult.steps.push({
        step: 'Onboarding endpoint',
        success: onboardingResponse.statusCode === 200,
        statusCode: onboardingResponse.statusCode,
        timestamp: new Date().toISOString()
      });

      testResult.success = testResult.steps.every(step => step.success);
      testResult.endTime = new Date().toISOString();
      testResult.duration = new Date(testResult.endTime) - new Date(testResult.startTime);

    } catch (error) {
      testResult.error = error.message;
      testResult.endTime = new Date().toISOString();
    }

    this.results.tests.push(testResult);
    return testResult;
  }

  async runAllTests() {
    console.log('🚀 Starting Production OAuth Verification');
    console.log(`🌐 Production URL: ${PRODUCTION_URL}`);
    console.log(`📅 Test Date: ${new Date().toISOString()}`);
    console.log('=' .repeat(60));

    // Run all tests
    await this.testPageAccessibility();
    await this.testSupabaseConnection();
    await this.testOAuthEndpoints();

    await this.saveResults();
  }

  async saveResults() {
    const resultsPath = path.join(__dirname, TEST_RESULTS_FILE);
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
    
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(60));
    console.log(`📅 Test Date: ${this.results.timestamp}`);
    console.log(`🌐 Production URL: ${this.results.productionUrl}`);
    console.log(`🧪 Total Tests: ${this.results.tests.length}`);
    
    const successfulTests = this.results.tests.filter(t => t.success);
    const failedTests = this.results.tests.filter(t => !t.success);
    
    console.log(`✅ Successful: ${successfulTests.length}`);
    console.log(`❌ Failed: ${failedTests.length}`);
    
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`  - ${test.name}: ${test.error || 'Multiple step failures'}`);
      });
    }
    
    console.log(`\n📄 Detailed results saved to: ${resultsPath}`);
    
    // Generate recommendations
    this.generateRecommendations();
  }

  generateRecommendations() {
    console.log('\n💡 Recommendations:');
    console.log('=' .repeat(60));
    
    const failedTests = this.results.tests.filter(t => !t.success);
    
    if (failedTests.length === 0) {
      console.log('🎉 All tests passed! Your OAuth flow is ready for manual testing.');
      console.log('📝 Next steps:');
      console.log('  1. Visit the production URL manually');
      console.log('  2. Test Google OAuth registration as both client and practitioner');
      console.log('  3. Check browser console for role assignment logs');
      console.log('  4. Verify users get correct roles in the database');
    } else {
      console.log('⚠️ Some tests failed. Please address these issues:');
      failedTests.forEach(test => {
        console.log(`  - ${test.name}: ${test.error || 'Check individual steps'}`);
      });
    }
    
    console.log('\n🔧 Manual Testing Checklist:');
    console.log('  □ Test client registration with Google OAuth');
    console.log('  □ Test practitioner registration with Google OAuth');
    console.log('  □ Verify role assignment in browser console');
    console.log('  □ Check user profile creation in Supabase');
    console.log('  □ Test onboarding flow completion');
    console.log('  □ Verify access control based on user roles');
  }
}

// Run the tests
const verifier = new OAuthVerifier();
verifier.runAllTests().catch(console.error);

export default OAuthVerifier;
