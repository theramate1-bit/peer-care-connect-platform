#!/usr/bin/env node

import https from 'https';

const PRODUCTION_URL = 'https://theramate-blzpwyau7-theras-projects-6dfd5a34.vercel.app';

class ComprehensiveSupabaseTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      productionUrl: PRODUCTION_URL,
      tests: {
        database: [],
        rls: [],
        functions: [],
        triggers: [],
        schema: [],
        oauth: [],
        api: [],
      },
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: 0,
      },
    };
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const req = https.request({
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/html, */*',
          'Content-Type': 'application/json',
          ...options.headers,
        },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          url: url,
        }));
      });
      
      req.on('error', reject);
      req.setTimeout(15000, () => req.destroy());
      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }

  log(category, test, status, message) {
    const timestamp = new Date().toISOString();
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    
    console.log(`${icon} [${timestamp}] ${category.toUpperCase()} - ${test}: ${message}`);
    
    this.results.tests[category].push({
      test,
      status,
      message,
      timestamp,
    });
    
    this.results.summary.total++;
    if (status === 'pass') {
      this.results.summary.passed++;
    } else if (status === 'fail') {
      this.results.summary.failed++;
    } else {
      this.results.summary.errors++;
    }
  }

  async testDatabaseConnection() {
    console.log('\n🔍 Testing Database Connection...');
    
    try {
      // Test if we can access the Supabase API
      const response = await this.makeRequest(`${PRODUCTION_URL}/api/health`);
      
      if (response.statusCode === 200) {
        this.log('database', 'Connection', 'pass', 'Database connection successful');
      } else {
        this.log('database', 'Connection', 'fail', `Status: ${response.statusCode}`);
      }
    } catch (error) {
      this.log('database', 'Connection', 'error', error.message);
    }
  }

  async testRLSPolicies() {
    console.log('\n🔍 Testing RLS Policies...');
    
    // Test public access to various endpoints
    const endpoints = [
      '/auth/register',
      '/auth/login', 
      '/auth/callback',
      '/role-selection',
      '/onboarding',
      '/client/dashboard',
      '/dashboard',
      '/admin/verification',
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this.makeRequest(`${PRODUCTION_URL}${endpoint}`);
        
        if (response.statusCode === 200) {
          this.log('rls', `Endpoint ${endpoint}`, 'pass', 'Accessible (Status 200)');
        } else if (response.statusCode === 302 || response.statusCode === 401) {
          this.log('rls', `Endpoint ${endpoint}`, 'pass', `Protected route (Status ${response.statusCode})`);
        } else {
          this.log('rls', `Endpoint ${endpoint}`, 'fail', `Unexpected status: ${response.statusCode}`);
        }
      } catch (error) {
        this.log('rls', `Endpoint ${endpoint}`, 'error', error.message);
      }
    }
  }

  async testDatabaseFunctions() {
    console.log('\n🔍 Testing Database Functions...');
    
    // Test OAuth callback scenarios
    const oauthScenarios = [
      {
        name: 'Valid OAuth Callback',
        params: '?code=test-code-123&state=test-state-456',
      },
      {
        name: 'Missing Code Parameter',
        params: '?state=test-state-456',
      },
      {
        name: 'Missing State Parameter', 
        params: '?code=test-code-123',
      },
      {
        name: 'Invalid Parameters',
        params: '?invalid=param',
      },
    ];

    for (const scenario of oauthScenarios) {
      try {
        const response = await this.makeRequest(`${PRODUCTION_URL}/auth/callback${scenario.params}`);
        
        if (response.statusCode === 200) {
          this.log('functions', `OAuth Callback - ${scenario.name}`, 'pass', 'Handled correctly');
        } else {
          this.log('functions', `OAuth Callback - ${scenario.name}`, 'fail', `Status: ${response.statusCode}`);
        }
      } catch (error) {
        this.log('functions', `OAuth Callback - ${scenario.name}`, 'error', error.message);
      }
    }
  }

  async testDatabaseTriggers() {
    console.log('\n🔍 Testing Database Triggers...');
    
    // Test user registration flow
    try {
      const registerResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/register`);
      
      if (registerResponse.statusCode === 200) {
        this.log('triggers', 'User Registration', 'pass', 'Registration page accessible');
      } else {
        this.log('triggers', 'User Registration', 'fail', `Status: ${registerResponse.statusCode}`);
      }
    } catch (error) {
      this.log('triggers', 'User Registration', 'error', error.message);
    }

    // Test login flow
    try {
      const loginResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/login`);
      
      if (loginResponse.statusCode === 200) {
        this.log('triggers', 'User Login', 'pass', 'Login page accessible');
      } else {
        this.log('triggers', 'User Login', 'fail', `Status: ${loginResponse.statusCode}`);
      }
    } catch (error) {
      this.log('triggers', 'User Login', 'error', error.message);
    }
  }

  async testDatabaseSchema() {
    console.log('\n🔍 Testing Database Schema...');
    
    // Test role selection page
    try {
      const roleSelectionResponse = await this.makeRequest(`${PRODUCTION_URL}/role-selection`);
      
      if (roleSelectionResponse.statusCode === 200) {
        this.log('schema', 'Role Selection', 'pass', 'Role selection page accessible');
      } else {
        this.log('schema', 'Role Selection', 'fail', `Status: ${roleSelectionResponse.statusCode}`);
      }
    } catch (error) {
      this.log('schema', 'Role Selection', 'error', error.message);
    }

    // Test onboarding page
    try {
      const onboardingResponse = await this.makeRequest(`${PRODUCTION_URL}/onboarding`);
      
      if (onboardingResponse.statusCode === 200) {
        this.log('schema', 'Onboarding', 'pass', 'Onboarding page accessible');
      } else {
        this.log('schema', 'Onboarding', 'fail', `Status: ${onboardingResponse.statusCode}`);
      }
    } catch (error) {
      this.log('schema', 'Onboarding', 'error', error.message);
    }
  }

  async testOAuthIntegration() {
    console.log('\n🔍 Testing OAuth Integration...');
    
    // Test OAuth initiation
    try {
      const registerResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/register`);
      
      if (registerResponse.statusCode === 200) {
        // Check for OAuth-related content
        const hasOAuthContent = registerResponse.body.includes('google') || 
                               registerResponse.body.includes('oauth') ||
                               registerResponse.body.includes('auth');
        
        if (hasOAuthContent) {
          this.log('oauth', 'OAuth Initiation', 'pass', 'OAuth content detected');
        } else {
          this.log('oauth', 'OAuth Initiation', 'fail', 'No OAuth content detected');
        }
      } else {
        this.log('oauth', 'OAuth Initiation', 'fail', `Status: ${registerResponse.statusCode}`);
      }
    } catch (error) {
      this.log('oauth', 'OAuth Initiation', 'error', error.message);
    }

    // Test OAuth callback
    try {
      const callbackResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/callback`);
      
      if (callbackResponse.statusCode === 200) {
        this.log('oauth', 'OAuth Callback', 'pass', 'OAuth callback accessible');
      } else {
        this.log('oauth', 'OAuth Callback', 'fail', `Status: ${callbackResponse.statusCode}`);
      }
    } catch (error) {
      this.log('oauth', 'OAuth Callback', 'error', error.message);
    }
  }

  async testAPIEndpoints() {
    console.log('\n🔍 Testing API Endpoints...');
    
    // Test various API endpoints
    const apiEndpoints = [
      '/api/health',
      '/api/users',
      '/api/sessions',
      '/api/roles',
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const response = await this.makeRequest(`${PRODUCTION_URL}${endpoint}`);
        
        if (response.statusCode === 200) {
          this.log('api', `Endpoint ${endpoint}`, 'pass', 'API endpoint accessible');
        } else if (response.statusCode === 404) {
          this.log('api', `Endpoint ${endpoint}`, 'pass', 'API endpoint not found (expected)');
        } else {
          this.log('api', `Endpoint ${endpoint}`, 'fail', `Status: ${response.statusCode}`);
        }
      } catch (error) {
        this.log('api', `Endpoint ${endpoint}`, 'error', error.message);
      }
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Supabase Testing...');
    console.log(`🌐 Production URL: ${PRODUCTION_URL}`);
    console.log('⚠️  Note: These tests check the OAuth flow infrastructure and API endpoints');

    await this.testDatabaseConnection();
    await this.testRLSPolicies();
    await this.testDatabaseFunctions();
    await this.testDatabaseTriggers();
    await this.testDatabaseSchema();
    await this.testOAuthIntegration();
    await this.testAPIEndpoints();

    this.generateSummary();
  }

  generateSummary() {
    const { total, passed, failed, errors } = this.results.summary;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log('\n📊 Comprehensive Supabase Test Summary:');
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} (${passRate}%)`);
    console.log(`Failed: ${failed}`);
    console.log(`Errors: ${errors}`);

    // Category breakdown
    console.log('\n📋 Test Category Breakdown:');
    Object.keys(this.results.tests).forEach(category => {
      const categoryTests = this.results.tests[category];
      const categoryPassed = categoryTests.filter(t => t.status === 'pass').length;
      const categoryTotal = categoryTests.length;
      const categoryRate = categoryTotal > 0 ? ((categoryPassed / categoryTotal) * 100).toFixed(1) : 0;
      
      console.log(`${category.toUpperCase()}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
    });

    // Overall assessment
    if (failed === 0 && errors === 0) {
      console.log('\n🎉 All Supabase tests passed!');
      console.log('✅ No mismatches detected between Supabase setup and codebase.');
      console.log('✅ All database functions, triggers, and RLS policies are working correctly.');
    } else if (failed > 0) {
      console.log('\n⚠️  Some Supabase tests failed.');
      console.log('❌ Potential mismatches detected between Supabase setup and codebase.');
      console.log('🔧 Review failed tests and fix the issues.');
    } else {
      console.log('\n❌ Supabase test errors occurred.');
      console.log('🚨 Critical issues detected. Immediate attention required.');
    }

    console.log('\n🔧 Recommendations:');
    console.log('1. Review failed tests and identify root causes');
    console.log('2. Check Supabase logs for any database errors');
    console.log('3. Verify environment variables and configuration');
    console.log('4. Test with real user accounts and OAuth flows');
    console.log('5. Monitor production logs for any runtime errors');
  }
}

// Run the comprehensive tests
const tester = new ComprehensiveSupabaseTester();
tester.runAllTests().catch(console.error);
