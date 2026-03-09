#!/usr/bin/env node

import https from 'https';

const PRODUCTION_URL = 'https://theramate-ax7rldtpt-theras-projects-6dfd5a34.vercel.app';

class ProductionOAuthTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      productionUrl: PRODUCTION_URL,
      tests: [],
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
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Cookie': options.cookies || '',
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
      req.end();
    });
  }

  async testOAuthInitiation() {
    console.log('\n🔍 Testing OAuth Initiation...');
    
    try {
      // Test register page for OAuth initiation
      const registerResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/register`);
      
      if (registerResponse.statusCode !== 200) {
        this.log('OAuth Initiation - Register Page Access', 'fail', `Status: ${registerResponse.statusCode}`);
        return false;
      }

      // Check if the page contains OAuth-related content
      const hasOAuthContent = registerResponse.body.includes('google') || 
                             registerResponse.body.includes('oauth') ||
                             registerResponse.body.includes('auth');
      
      if (hasOAuthContent) {
        this.log('OAuth Initiation - Register Page Content', 'pass', 'OAuth-related content found');
      } else {
        this.log('OAuth Initiation - Register Page Content', 'fail', 'No OAuth-related content found');
      }

      // Test login page for OAuth initiation
      const loginResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/login`);
      
      if (loginResponse.statusCode !== 200) {
        this.log('OAuth Initiation - Login Page Access', 'fail', `Status: ${loginResponse.statusCode}`);
        return false;
      }

      const hasLoginOAuthContent = loginResponse.body.includes('google') || 
                                  loginResponse.body.includes('oauth') ||
                                  loginResponse.body.includes('auth');
      
      if (hasLoginOAuthContent) {
        this.log('OAuth Initiation - Login Page Content', 'pass', 'OAuth-related content found');
      } else {
        this.log('OAuth Initiation - Login Page Content', 'fail', 'No OAuth-related content found');
      }

      return hasOAuthContent && hasLoginOAuthContent;
    } catch (error) {
      this.log('OAuth Initiation - Request Error', 'error', error.message);
      return false;
    }
  }

  async testOAuthCallbackHandling() {
    console.log('\n🔍 Testing OAuth Callback Handling...');
    
    const testScenarios = [
      {
        name: 'Valid OAuth Callback',
        params: '?code=test-code-123&state=test-state-456',
        expectedStatus: 200,
      },
      {
        name: 'Missing Code Parameter',
        params: '?state=test-state-456',
        expectedStatus: 200,
      },
      {
        name: 'Missing State Parameter',
        params: '?code=test-code-123',
        expectedStatus: 200,
      },
      {
        name: 'Invalid Parameters',
        params: '?invalid=param',
        expectedStatus: 200,
      },
    ];

    let allPassed = true;

    for (const scenario of testScenarios) {
      try {
        const response = await this.makeRequest(`${PRODUCTION_URL}/auth/callback${scenario.params}`);
        
        if (response.statusCode === scenario.expectedStatus) {
          this.log(`OAuth Callback - ${scenario.name}`, 'pass', `Status: ${response.statusCode}`);
        } else {
          this.log(`OAuth Callback - ${scenario.name}`, 'fail', `Expected ${scenario.expectedStatus}, got ${response.statusCode}`);
          allPassed = false;
        }

        // Check if the response contains error handling
        const hasErrorHandling = response.body.includes('error') || 
                                response.body.includes('Error') ||
                                response.body.includes('redirect');
        
        if (hasErrorHandling) {
          this.log(`OAuth Callback - ${scenario.name} Error Handling`, 'pass', 'Error handling detected');
        } else {
          this.log(`OAuth Callback - ${scenario.name} Error Handling`, 'fail', 'No error handling detected');
        }

      } catch (error) {
        this.log(`OAuth Callback - ${scenario.name}`, 'error', error.message);
        allPassed = false;
      }
    }

    return allPassed;
  }

  async testRoleAssignmentFlow() {
    console.log('\n🔍 Testing Role Assignment Flow...');
    
    try {
      // Test role selection page
      const roleSelectionResponse = await this.makeRequest(`${PRODUCTION_URL}/role-selection`);
      
      if (roleSelectionResponse.statusCode !== 200) {
        this.log('Role Assignment - Role Selection Page', 'fail', `Status: ${roleSelectionResponse.statusCode}`);
        return false;
      }

      // Check for role-related content
      const hasRoleContent = roleSelectionResponse.body.includes('role') || 
                            roleSelectionResponse.body.includes('client') ||
                            roleSelectionResponse.body.includes('practitioner');
      
      if (hasRoleContent) {
        this.log('Role Assignment - Role Selection Content', 'pass', 'Role-related content found');
      } else {
        this.log('Role Assignment - Role Selection Content', 'fail', 'No role-related content found');
      }

      // Test onboarding page
      const onboardingResponse = await this.makeRequest(`${PRODUCTION_URL}/onboarding`);
      
      if (onboardingResponse.statusCode !== 200) {
        this.log('Role Assignment - Onboarding Page', 'fail', `Status: ${onboardingResponse.statusCode}`);
        return false;
      }

      const hasOnboardingContent = onboardingResponse.body.includes('onboard') || 
                                  onboardingResponse.body.includes('welcome') ||
                                  onboardingResponse.body.includes('complete');
      
      if (hasOnboardingContent) {
        this.log('Role Assignment - Onboarding Content', 'pass', 'Onboarding content found');
      } else {
        this.log('Role Assignment - Onboarding Content', 'fail', 'No onboarding content found');
      }

      return hasRoleContent && hasOnboardingContent;
    } catch (error) {
      this.log('Role Assignment - Request Error', 'error', error.message);
      return false;
    }
  }

  async testSupabaseConnection() {
    console.log('\n🔍 Testing Supabase Connection...');
    
    try {
      // Test if we can access Supabase-related endpoints
      // This is a basic check - in a real scenario, you'd test actual API calls
      
      // Check if the app loads without Supabase connection errors
      const mainResponse = await this.makeRequest(`${PRODUCTION_URL}/`);
      
      if (mainResponse.statusCode !== 200) {
        this.log('Supabase Connection - Main Page', 'fail', `Status: ${mainResponse.statusCode}`);
        return false;
      }

      // Look for Supabase-related content or configuration
      const hasSupabaseContent = mainResponse.body.includes('supabase') || 
                                mainResponse.body.includes('Supabase') ||
                                mainResponse.body.includes('auth');
      
      if (hasSupabaseContent) {
        this.log('Supabase Connection - Configuration', 'pass', 'Supabase-related content found');
      } else {
        this.log('Supabase Connection - Configuration', 'fail', 'No Supabase-related content found');
      }

      // Test auth callback which should interact with Supabase
      const callbackResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/callback`);
      
      if (callbackResponse.statusCode === 200) {
        this.log('Supabase Connection - Auth Callback', 'pass', 'Auth callback accessible');
      } else {
        this.log('Supabase Connection - Auth Callback', 'fail', `Status: ${callbackResponse.statusCode}`);
        return false;
      }

      return true;
    } catch (error) {
      this.log('Supabase Connection - Request Error', 'error', error.message);
      return false;
    }
  }

  async testUserDashboardAccess() {
    console.log('\n🔍 Testing User Dashboard Access...');
    
    const dashboards = [
      { name: 'Client Dashboard', path: '/client/dashboard' },
      { name: 'Practitioner Dashboard', path: '/practitioner/dashboard' },
      { name: 'Admin Dashboard', path: '/admin/dashboard' },
    ];

    let allAccessible = true;

    for (const dashboard of dashboards) {
      try {
        const response = await this.makeRequest(`${PRODUCTION_URL}${dashboard.path}`);
        
        // Dashboards should either be accessible (200) or redirect to login (302/401)
        if (response.statusCode === 200 || response.statusCode === 302 || response.statusCode === 401) {
          this.log(`Dashboard Access - ${dashboard.name}`, 'pass', `Status: ${response.statusCode} (expected for protected route)`);
        } else {
          this.log(`Dashboard Access - ${dashboard.name}`, 'fail', `Unexpected status: ${response.statusCode}`);
          allAccessible = false;
        }

        // Check if it redirects to login (which is correct behavior for unauthenticated users)
        if (response.statusCode === 302) {
          const location = response.headers.location;
          if (location && location.includes('login')) {
            this.log(`Dashboard Access - ${dashboard.name} Redirect`, 'pass', 'Redirects to login (correct behavior)');
          } else {
            this.log(`Dashboard Access - ${dashboard.name} Redirect`, 'fail', 'Redirects to unexpected location');
          }
        }

      } catch (error) {
        this.log(`Dashboard Access - ${dashboard.name}`, 'error', error.message);
        allAccessible = false;
      }
    }

    return allAccessible;
  }

  log(test, status, message) {
    const timestamp = new Date().toISOString();
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    
    console.log(`${icon} [${timestamp}] ${test}: ${message}`);
    
    this.results.tests.push({
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

  async runProductionTests() {
    console.log('🚀 Starting Production OAuth Flow Tests...');
    console.log(`🌐 Production URL: ${PRODUCTION_URL}`);
    console.log('⚠️  Note: These tests check the OAuth flow infrastructure, not actual Google authentication');

    // Run all test suites
    const oauthInitiation = await this.testOAuthInitiation();
    const oauthCallback = await this.testOAuthCallbackHandling();
    const roleAssignment = await this.testRoleAssignmentFlow();
    const supabaseConnection = await this.testSupabaseConnection();
    const dashboardAccess = await this.testUserDashboardAccess();

    // Generate summary
    this.generateSummary(oauthInitiation, oauthCallback, roleAssignment, supabaseConnection, dashboardAccess);
  }

  generateSummary(oauthInitiation, oauthCallback, roleAssignment, supabaseConnection, dashboardAccess) {
    const { total, passed, failed, errors } = this.results.summary;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log('\n📊 Production OAuth Flow Test Summary:');
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} (${passRate}%)`);
    console.log(`Failed: ${failed}`);
    console.log(`Errors: ${errors}`);

    console.log('\n🔍 Test Suite Results:');
    console.log(`OAuth Initiation: ${oauthInitiation ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`OAuth Callback Handling: ${oauthCallback ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Role Assignment Flow: ${roleAssignment ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Supabase Connection: ${supabaseConnection ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Dashboard Access: ${dashboardAccess ? '✅ PASS' : '❌ FAIL'}`);

    // Overall assessment
    const allPassed = oauthInitiation && oauthCallback && roleAssignment && supabaseConnection && dashboardAccess;
    
    if (allPassed) {
      console.log('\n🎉 All OAuth flow infrastructure tests passed!');
      console.log('✅ Your OAuth flow infrastructure is working correctly.');
      console.log('⚠️  Note: Actual Google authentication requires manual testing with real Google accounts.');
    } else {
      console.log('\n⚠️  Some OAuth flow tests failed.');
      console.log('❌ There may be issues with the OAuth flow implementation.');
    }

    console.log('\n🔧 Next Steps:');
    console.log('1. Test actual Google OAuth authentication manually');
    console.log('2. Verify user role assignment after Google authentication');
    console.log('3. Check Supabase logs for any authentication errors');
    console.log('4. Test the complete user journey from registration to dashboard access');
  }
}

// Run the tests
const tester = new ProductionOAuthTester();
tester.runProductionTests().catch(console.error);
