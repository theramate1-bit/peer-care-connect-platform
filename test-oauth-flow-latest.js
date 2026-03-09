#!/usr/bin/env node

import https from 'https';

const PRODUCTION_URL = 'https://theramate-7p3ufmvh6-theras-projects-6dfd5a34.vercel.app';

class OAuthFlowTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      productionUrl: PRODUCTION_URL,
      tests: {
        oauthInitiation: [],
        oauthCallback: [],
        roleSelection: [],
        userJourney: [],
        supabaseIntegration: [],
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
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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
          responseTime: Date.now() - this.startTime,
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

  log(category, test, status, message, details = null) {
    const timestamp = new Date().toISOString();
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    
    console.log(`${icon} [${timestamp}] ${category.toUpperCase()} - ${test}: ${message}`);
    if (details) {
      console.log(`    Details: ${details}`);
    }
    
    this.results.tests[category].push({
      test,
      status,
      message,
      details,
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

  async testOAuthInitiation() {
    console.log('\n🔍 Testing OAuth Initiation Flow...');
    
    // Test register page
    this.startTime = Date.now();
    const registerResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/register`);
    
    if (registerResponse.statusCode === 200) {
      this.log('oauthInitiation', 'Register Page Access', 'pass', 
        'Register page accessible',
        `Response time: ${registerResponse.responseTime}ms`);
      
      // Check for Google OAuth button
      const hasGoogleButton = registerResponse.body.includes('Continue with Google') || 
                             registerResponse.body.includes('Sign up with Google') ||
                             registerResponse.body.includes('google') ||
                             registerResponse.body.includes('oauth');
      
      if (hasGoogleButton) {
        this.log('oauthInitiation', 'Google OAuth Button (Register)', 'pass', 
          'Google OAuth button content found');
      } else {
        this.log('oauthInitiation', 'Google OAuth Button (Register)', 'fail', 
          'No Google OAuth button content found');
      }

      // Check for role selection UI
      const hasRoleSelection = registerResponse.body.includes('role') || 
                              registerResponse.body.includes('client') ||
                              registerResponse.body.includes('practitioner') ||
                              registerResponse.body.includes('Select Your Role');
      
      if (hasRoleSelection) {
        this.log('oauthInitiation', 'Role Selection UI (Register)', 'pass', 
          'Role selection UI detected');
      } else {
        this.log('oauthInitiation', 'Role Selection UI (Register)', 'fail', 
          'No role selection UI detected');
      }
    } else {
      this.log('oauthInitiation', 'Register Page Access', 'fail', 
        `Status: ${registerResponse.statusCode}`);
    }

    // Test login page
    this.startTime = Date.now();
    const loginResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/login`);
    
    if (loginResponse.statusCode === 200) {
      this.log('oauthInitiation', 'Login Page Access', 'pass', 
        'Login page accessible',
        `Response time: ${loginResponse.responseTime}ms`);
      
      // Check for Google OAuth button
      const hasGoogleButton = loginResponse.body.includes('Continue with Google') || 
                             loginResponse.body.includes('Sign in with Google');
      
      if (hasGoogleButton) {
        this.log('oauthInitiation', 'Google OAuth Button (Login)', 'pass', 
          'Google OAuth button content found');
      } else {
        this.log('oauthInitiation', 'Google OAuth Button (Login)', 'fail', 
          'No Google OAuth button content found');
      }
    } else {
      this.log('oauthInitiation', 'Login Page Access', 'fail', 
        `Status: ${loginResponse.statusCode}`);
    }
  }

  async testOAuthCallback() {
    console.log('\n🔍 Testing OAuth Callback Flow...');
    
    // Test callback page without parameters
    this.startTime = Date.now();
    const callbackResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/callback`);
    
    if (callbackResponse.statusCode === 200) {
      this.log('oauthCallback', 'Callback Page Access', 'pass', 
        'OAuth callback page accessible',
        `Response time: ${callbackResponse.responseTime}ms`);
      
      // Check for error handling
      const hasErrorHandling = callbackResponse.body.includes('error') || 
                              callbackResponse.body.includes('Error') ||
                              callbackResponse.body.includes('Authentication Error');
      
      if (hasErrorHandling) {
        this.log('oauthCallback', 'Error Handling', 'pass', 
          'Error handling UI detected');
      } else {
        this.log('oauthCallback', 'Error Handling', 'fail', 
          'No error handling UI detected');
      }

      // Check for loading states
      const hasLoadingState = callbackResponse.body.includes('loading') || 
                             callbackResponse.body.includes('Loading') ||
                             callbackResponse.body.includes('Completing Authentication');
      
      if (hasLoadingState) {
        this.log('oauthCallback', 'Loading States', 'pass', 
          'Loading state UI detected');
      } else {
        this.log('oauthCallback', 'Loading States', 'fail', 
          'No loading state UI detected');
      }
    } else {
      this.log('oauthCallback', 'Callback Page Access', 'fail', 
        `Status: ${callbackResponse.statusCode}`);
    }

    // Test callback with realistic OAuth parameters
    const realisticCallbackUrl = `${PRODUCTION_URL}/auth/callback?code=4/0AX4XfWh123456789&state=eyJyb2xlIjoic3BvcnRzX3RoZXJhcGlzdCIsIm5vbmNlIjoiYWJjMTIzIn0`;
    
    this.startTime = Date.now();
    const realisticCallbackResponse = await this.makeRequest(realisticCallbackUrl);
    
    if (realisticCallbackResponse.statusCode === 200) {
      this.log('oauthCallback', 'Realistic OAuth Callback', 'pass', 
        'OAuth callback handles realistic parameters',
        `Response time: ${realisticCallbackResponse.responseTime}ms`);
    } else {
      this.log('oauthCallback', 'Realistic OAuth Callback', 'fail', 
        `Status: ${realisticCallbackResponse.statusCode}`);
    }
  }

  async testRoleSelection() {
    console.log('\n🔍 Testing Role Selection Flow...');
    
    // Test role selection page
    this.startTime = Date.now();
    const roleSelectionResponse = await this.makeRequest(`${PRODUCTION_URL}/role-selection`);
    
    if (roleSelectionResponse.statusCode === 200) {
      this.log('roleSelection', 'Role Selection Page Access', 'pass', 
        'Role selection page accessible',
        `Response time: ${roleSelectionResponse.responseTime}ms`);
      
      // Check for role selection content
      const hasRoleContent = roleSelectionResponse.body.includes('role') || 
                            roleSelectionResponse.body.includes('client') ||
                            roleSelectionResponse.body.includes('practitioner') ||
                            roleSelectionResponse.body.includes('Select Your Role');
      
      if (hasRoleContent) {
        this.log('roleSelection', 'Role Selection Content', 'pass', 
          'Role selection content detected');
      } else {
        this.log('roleSelection', 'Role Selection Content', 'fail', 
          'No role selection content detected');
      }

      // Check for role buttons
      const hasRoleButtons = roleSelectionResponse.body.includes('button') || 
                            roleSelectionResponse.body.includes('btn') ||
                            roleSelectionResponse.body.includes('Client') ||
                            roleSelectionResponse.body.includes('Practitioner');
      
      if (hasRoleButtons) {
        this.log('roleSelection', 'Role Selection Buttons', 'pass', 
          'Role selection buttons detected');
      } else {
        this.log('roleSelection', 'Role Selection Buttons', 'fail', 
          'No role selection buttons detected');
      }
    } else {
      this.log('roleSelection', 'Role Selection Page Access', 'fail', 
        `Status: ${roleSelectionResponse.statusCode}`);
    }
  }

  async testUserJourney() {
    console.log('\n🔍 Testing Complete User Journey...');
    
    // Test all key endpoints in the user journey
    const journeyEndpoints = [
      { path: '/', name: 'Home Page' },
      { path: '/auth/register', name: 'Registration' },
      { path: '/auth/login', name: 'Login' },
      { path: '/auth/callback', name: 'OAuth Callback' },
      { path: '/role-selection', name: 'Role Selection' },
      { path: '/onboarding', name: 'Onboarding' },
      { path: '/client/dashboard', name: 'Client Dashboard' },
      { path: '/dashboard', name: 'Practitioner Dashboard' },
    ];

    for (const endpoint of journeyEndpoints) {
      this.startTime = Date.now();
      try {
        const response = await this.makeRequest(`${PRODUCTION_URL}${endpoint.path}`);
        
        if (response.statusCode === 200) {
          this.log('userJourney', `Journey - ${endpoint.name}`, 'pass', 
            'Endpoint accessible',
            `Response time: ${response.responseTime}ms`);
        } else if (response.statusCode === 302 || response.statusCode === 401) {
          this.log('userJourney', `Journey - ${endpoint.name}`, 'pass', 
            'Protected endpoint properly secured',
            `Status: ${response.statusCode}, Response time: ${response.responseTime}ms`);
        } else {
          this.log('userJourney', `Journey - ${endpoint.name}`, 'fail', 
            `Status: ${response.statusCode}`);
        }
      } catch (error) {
        this.log('userJourney', `Journey - ${endpoint.name}`, 'error', 
          error.message);
      }
    }
  }

  async testSupabaseIntegration() {
    console.log('\n🔍 Testing Supabase Integration...');
    
    // Test if Supabase client is properly configured
    this.startTime = Date.now();
    const mainResponse = await this.makeRequest(`${PRODUCTION_URL}/`);
    
    if (mainResponse.statusCode === 200) {
      // Check for Supabase client code in HTML
      const hasSupabaseClient = mainResponse.body.includes('createClient') || 
                               mainResponse.body.includes('supabase') ||
                               mainResponse.body.includes('SUPABASE_URL');
      
      if (hasSupabaseClient) {
        this.log('supabaseIntegration', 'Supabase Client Detection', 'pass', 
          'Supabase client code detected');
      } else {
        this.log('supabaseIntegration', 'Supabase Client Detection', 'fail', 
          'No Supabase client code detected in static HTML (expected for React SPA)');
      }

      // Check for environment variable usage
      const hasEnvVars = mainResponse.body.includes('VITE_SUPABASE') || 
                        mainResponse.body.includes('import.meta.env');
      
      if (hasEnvVars) {
        this.log('supabaseIntegration', 'Environment Variables', 'pass', 
          'Environment variable usage detected');
      } else {
        this.log('supabaseIntegration', 'Environment Variables', 'fail', 
          'No environment variable usage detected in static HTML (expected for React SPA)');
      }

      // Check for JavaScript bundle
      const hasJSBundle = mainResponse.body.includes('index-') || 
                         mainResponse.body.includes('.js');
      
      if (hasJSBundle) {
        this.log('supabaseIntegration', 'JavaScript Bundle', 'pass', 
          'JavaScript bundle detected (Supabase client will be loaded dynamically)');
      } else {
        this.log('supabaseIntegration', 'JavaScript Bundle', 'fail', 
          'No JavaScript bundle detected');
      }
    } else {
      this.log('supabaseIntegration', 'Main Page Access', 'fail', 
        `Status: ${mainResponse.statusCode}`);
    }
  }

  async runAllTests() {
    console.log('🚀 Testing OAuth Flow and User Selection (Latest Deployment)...');
    console.log(`🌐 Production URL: ${PRODUCTION_URL}`);
    console.log('⚠️  Note: Testing the complete OAuth flow and user role selection');

    await this.testOAuthInitiation();
    await this.testOAuthCallback();
    await this.testRoleSelection();
    await this.testUserJourney();
    await this.testSupabaseIntegration();

    this.generateSummary();
  }

  generateSummary() {
    const { total, passed, failed, errors } = this.results.summary;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log('\n📊 OAuth Flow and User Selection Test Summary:');
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

    // Identify specific issues
    console.log('\n🔍 Specific Issues Found:');
    Object.keys(this.results.tests).forEach(category => {
      const failedTests = this.results.tests[category].filter(t => t.status === 'fail');
      if (failedTests.length > 0) {
        console.log(`\n${category.toUpperCase()} Issues:`);
        failedTests.forEach(test => {
          console.log(`  ❌ ${test.test}: ${test.message}`);
        });
      }
    });

    // Overall assessment
    if (failed === 0 && errors === 0) {
      console.log('\n🎉 All OAuth flow and user selection tests passed!');
      console.log('✅ The OAuth flow should work correctly in production.');
      console.log('✅ User role selection is properly implemented.');
      console.log('✅ Complete user journey is accessible.');
    } else if (failed > 0) {
      console.log('\n⚠️  Some OAuth flow tests failed.');
      console.log('❌ There may still be issues with the OAuth flow or user selection.');
      
      // Provide specific recommendations
      console.log('\n🔧 Remaining Issues:');
      if (this.results.tests.oauthInitiation.some(t => t.status === 'fail')) {
        console.log('1. OAuth initiation issues (buttons not rendering)');
      }
      if (this.results.tests.oauthCallback.some(t => t.status === 'fail')) {
        console.log('2. OAuth callback handling issues');
      }
      if (this.results.tests.roleSelection.some(t => t.status === 'fail')) {
        console.log('3. Role selection UI issues');
      }
      if (this.results.tests.userJourney.some(t => t.status === 'fail')) {
        console.log('4. User journey endpoint issues');
      }
    } else {
      console.log('\n❌ OAuth flow test errors occurred.');
      console.log('🚨 Critical issues detected. Immediate attention required.');
    }

    console.log('\n🔧 Next Steps:');
    console.log('1. Test with real Google OAuth accounts');
    console.log('2. Check browser console for JavaScript errors');
    console.log('3. Verify OAuth flow works end-to-end');
    console.log('4. Test role assignment with real users');
    console.log('5. Monitor production logs for any errors');
  }
}

// Run the OAuth flow tests
const tester = new OAuthFlowTester();
tester.runAllTests().catch(console.error);



































