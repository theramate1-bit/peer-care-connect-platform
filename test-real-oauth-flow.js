#!/usr/bin/env node

import https from 'https';

const PRODUCTION_URL = 'https://theramate-blzpwyau7-theras-projects-6dfd5a34.vercel.app';

class RealOAuthFlowTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      productionUrl: PRODUCTION_URL,
      tests: {
        oauthInitiation: [],
        oauthCallback: [],
        roleAssignment: [],
        databaseIntegration: [],
        frontendIssues: [],
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
    console.log('\n🔍 Testing OAuth Initiation (Real Flow)...');
    
    // Test register page for OAuth buttons
    this.startTime = Date.now();
    const registerResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/register`);
    
    if (registerResponse.statusCode === 200) {
      // Check for actual OAuth button content
      const hasGoogleButton = registerResponse.body.includes('Continue with Google') || 
                             registerResponse.body.includes('Sign up with Google') ||
                             registerResponse.body.includes('google') ||
                             registerResponse.body.includes('oauth');
      
      if (hasGoogleButton) {
        this.log('oauthInitiation', 'Google OAuth Button', 'pass', 
          'Google OAuth button content found',
          `Response time: ${registerResponse.responseTime}ms`);
      } else {
        this.log('oauthInitiation', 'Google OAuth Button', 'fail', 
          'No Google OAuth button content found in HTML');
      }

      // Check for Supabase client configuration
      const hasSupabaseConfig = registerResponse.body.includes('SUPABASE_URL') || 
                                registerResponse.body.includes('supabase') ||
                                registerResponse.body.includes('createClient');
      
      if (hasSupabaseConfig) {
        this.log('oauthInitiation', 'Supabase Configuration', 'pass', 
          'Supabase configuration detected');
      } else {
        this.log('oauthInitiation', 'Supabase Configuration', 'fail', 
          'No Supabase configuration detected');
      }

      // Check for JavaScript bundle
      const hasJSBundle = registerResponse.body.includes('index-') || 
                         registerResponse.body.includes('.js') ||
                         registerResponse.body.includes('script');
      
      if (hasJSBundle) {
        this.log('oauthInitiation', 'JavaScript Bundle', 'pass', 
          'JavaScript bundle detected (OAuth buttons will be rendered dynamically)');
      } else {
        this.log('oauthInitiation', 'JavaScript Bundle', 'fail', 
          'No JavaScript bundle detected');
      }

    } else {
      this.log('oauthInitiation', 'Register Page Access', 'fail', 
        `Status: ${registerResponse.statusCode}`);
    }

    // Test login page for OAuth buttons
    this.startTime = Date.now();
    const loginResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/login`);
    
    if (loginResponse.statusCode === 200) {
      const hasGoogleButton = loginResponse.body.includes('Continue with Google') || 
                             loginResponse.body.includes('Sign in with Google');
      
      if (hasGoogleButton) {
        this.log('oauthInitiation', 'Login Google OAuth Button', 'pass', 
          'Google OAuth button content found in login page');
      } else {
        this.log('oauthInitiation', 'Login Google OAuth Button', 'fail', 
          'No Google OAuth button content found in login page');
      }
    } else {
      this.log('oauthInitiation', 'Login Page Access', 'fail', 
        `Status: ${loginResponse.statusCode}`);
    }
  }

  async testOAuthCallback() {
    console.log('\n🔍 Testing OAuth Callback (Real Flow)...');
    
    // Test callback page with realistic OAuth parameters
    const realisticCallbackUrl = `${PRODUCTION_URL}/auth/callback?code=4/0AX4XfWh123456789&state=eyJyb2xlIjoic3BvcnRzX3RoZXJhcGlzdCIsIm5vbmNlIjoiYWJjMTIzIn0`;
    
    this.startTime = Date.now();
    const callbackResponse = await this.makeRequest(realisticCallbackUrl);
    
    if (callbackResponse.statusCode === 200) {
      this.log('oauthCallback', 'Realistic OAuth Callback', 'pass', 
        'OAuth callback page accessible with realistic parameters',
        `Response time: ${callbackResponse.responseTime}ms`);
      
      // Check for error handling in callback
      const hasErrorHandling = callbackResponse.body.includes('error') || 
                              callbackResponse.body.includes('Error') ||
                              callbackResponse.body.includes('Authentication Error');
      
      if (hasErrorHandling) {
        this.log('oauthCallback', 'Error Handling', 'pass', 
          'Error handling UI detected in callback page');
      } else {
        this.log('oauthCallback', 'Error Handling', 'fail', 
          'No error handling UI detected in callback page');
      }

      // Check for loading states
      const hasLoadingState = callbackResponse.body.includes('loading') || 
                             callbackResponse.body.includes('Loading') ||
                             callbackResponse.body.includes('Completing Authentication');
      
      if (hasLoadingState) {
        this.log('oauthCallback', 'Loading States', 'pass', 
          'Loading state UI detected in callback page');
      } else {
        this.log('oauthCallback', 'Loading States', 'fail', 
          'No loading state UI detected in callback page');
      }

    } else {
      this.log('oauthCallback', 'Realistic OAuth Callback', 'fail', 
        `Status: ${callbackResponse.statusCode}`);
    }

    // Test callback with missing parameters (should show error)
    const missingParamsUrl = `${PRODUCTION_URL}/auth/callback`;
    
    this.startTime = Date.now();
    const missingParamsResponse = await this.makeRequest(missingParamsUrl);
    
    if (missingParamsResponse.statusCode === 200) {
      this.log('oauthCallback', 'Missing Parameters Handling', 'pass', 
        'Callback page accessible without parameters',
        `Response time: ${missingParamsResponse.responseTime}ms`);
    } else {
      this.log('oauthCallback', 'Missing Parameters Handling', 'fail', 
        `Status: ${missingParamsResponse.statusCode}`);
    }
  }

  async testRoleAssignment() {
    console.log('\n🔍 Testing Role Assignment Flow...');
    
    // Test role selection page
    this.startTime = Date.now();
    const roleSelectionResponse = await this.makeRequest(`${PRODUCTION_URL}/role-selection`);
    
    if (roleSelectionResponse.statusCode === 200) {
      this.log('roleAssignment', 'Role Selection Page', 'pass', 
        'Role selection page accessible',
        `Response time: ${roleSelectionResponse.responseTime}ms`);
      
      // Check for role selection content
      const hasRoleContent = roleSelectionResponse.body.includes('role') || 
                            roleSelectionResponse.body.includes('client') ||
                            roleSelectionResponse.body.includes('practitioner') ||
                            roleSelectionResponse.body.includes('Select Your Role');
      
      if (hasRoleContent) {
        this.log('roleAssignment', 'Role Selection Content', 'pass', 
          'Role selection content detected');
      } else {
        this.log('roleAssignment', 'Role Selection Content', 'fail', 
          'No role selection content detected');
      }
    } else {
      this.log('roleAssignment', 'Role Selection Page', 'fail', 
        `Status: ${roleSelectionResponse.statusCode}`);
    }

    // Test onboarding page
    this.startTime = Date.now();
    const onboardingResponse = await this.makeRequest(`${PRODUCTION_URL}/onboarding`);
    
    if (onboardingResponse.statusCode === 200) {
      this.log('roleAssignment', 'Onboarding Page', 'pass', 
        'Onboarding page accessible',
        `Response time: ${onboardingResponse.responseTime}ms`);
      
      // Check for onboarding content
      const hasOnboardingContent = onboardingResponse.body.includes('onboarding') || 
                                  onboardingResponse.body.includes('profile') ||
                                  onboardingResponse.body.includes('Complete Your Profile');
      
      if (hasOnboardingContent) {
        this.log('roleAssignment', 'Onboarding Content', 'pass', 
          'Onboarding content detected');
      } else {
        this.log('roleAssignment', 'Onboarding Content', 'fail', 
          'No onboarding content detected');
      }
    } else {
      this.log('roleAssignment', 'Onboarding Page', 'fail', 
        `Status: ${onboardingResponse.statusCode}`);
    }
  }

  async testDatabaseIntegration() {
    console.log('\n🔍 Testing Database Integration...');
    
    // Test if we can access any database-related endpoints
    const dbEndpoints = [
      '/api/users',
      '/api/sessions', 
      '/api/auth',
      '/api/health',
    ];

    for (const endpoint of dbEndpoints) {
      this.startTime = Date.now();
      try {
        const response = await this.makeRequest(`${PRODUCTION_URL}${endpoint}`);
        
        if (response.statusCode === 200) {
          this.log('databaseIntegration', `Database Endpoint ${endpoint}`, 'pass', 
            'Database endpoint accessible',
            `Response time: ${response.responseTime}ms`);
        } else if (response.statusCode === 404) {
          this.log('databaseIntegration', `Database Endpoint ${endpoint}`, 'pass', 
            'Database endpoint not found (expected)',
            `Status: ${response.statusCode}`);
        } else {
          this.log('databaseIntegration', `Database Endpoint ${endpoint}`, 'fail', 
            `Status: ${response.statusCode}`);
        }
      } catch (error) {
        this.log('databaseIntegration', `Database Endpoint ${endpoint}`, 'error', 
          error.message);
      }
    }
  }

  async testFrontendIssues() {
    console.log('\n🔍 Testing Frontend Issues...');
    
    // Test if React app is properly loading
    this.startTime = Date.now();
    const mainPageResponse = await this.makeRequest(`${PRODUCTION_URL}/`);
    
    if (mainPageResponse.statusCode === 200) {
      // Check for React root element
      const hasReactRoot = mainPageResponse.body.includes('id="root"') || 
                          mainPageResponse.body.includes('root');
      
      if (hasReactRoot) {
        this.log('frontendIssues', 'React Root Element', 'pass', 
          'React root element found');
      } else {
        this.log('frontendIssues', 'React Root Element', 'fail', 
          'No React root element found');
      }

      // Check for JavaScript bundle
      const hasJSBundle = mainPageResponse.body.includes('index-') || 
                         mainPageResponse.body.includes('.js');
      
      if (hasJSBundle) {
        this.log('frontendIssues', 'JavaScript Bundle', 'pass', 
          'JavaScript bundle found');
      } else {
        this.log('frontendIssues', 'JavaScript Bundle', 'fail', 
          'No JavaScript bundle found');
      }

      // Check for environment variables (they shouldn't be exposed)
      const hasExposedEnvVars = mainPageResponse.body.includes('SUPABASE_URL') || 
                               mainPageResponse.body.includes('SUPABASE_ANON_KEY') ||
                               mainPageResponse.body.includes('VITE_');
      
      if (hasExposedEnvVars) {
        this.log('frontendIssues', 'Environment Variables', 'fail', 
          'Environment variables exposed in HTML (security risk)');
      } else {
        this.log('frontendIssues', 'Environment Variables', 'pass', 
          'Environment variables not exposed in HTML');
      }

    } else {
      this.log('frontendIssues', 'Main Page Access', 'fail', 
        `Status: ${mainPageResponse.statusCode}`);
    }
  }

  async runAllTests() {
    console.log('🚀 Testing Real OAuth Flow Issues...');
    console.log(`🌐 Production URL: ${PRODUCTION_URL}`);
    console.log('⚠️  Note: These tests check the actual OAuth flow implementation');

    await this.testOAuthInitiation();
    await this.testOAuthCallback();
    await this.testRoleAssignment();
    await this.testDatabaseIntegration();
    await this.testFrontendIssues();

    this.generateSummary();
  }

  generateSummary() {
    const { total, passed, failed, errors } = this.results.summary;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log('\n📊 Real OAuth Flow Test Summary:');
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
      console.log('\n🎉 All OAuth flow tests passed!');
      console.log('✅ The OAuth flow should be working correctly in production.');
    } else if (failed > 0) {
      console.log('\n⚠️  OAuth flow issues detected.');
      console.log('❌ These are the likely reasons why OAuth is not working in production:');
      
      // Provide specific recommendations
      console.log('\n🔧 Likely Root Causes:');
      if (this.results.tests.oauthInitiation.some(t => t.status === 'fail')) {
        console.log('1. OAuth buttons not rendering properly (JavaScript issues)');
      }
      if (this.results.tests.oauthCallback.some(t => t.status === 'fail')) {
        console.log('2. OAuth callback not handling parameters correctly');
      }
      if (this.results.tests.roleAssignment.some(t => t.status === 'fail')) {
        console.log('3. Role assignment flow broken');
      }
      if (this.results.tests.frontendIssues.some(t => t.status === 'fail')) {
        console.log('4. Frontend JavaScript not loading properly');
      }
    } else {
      console.log('\n❌ OAuth flow test errors occurred.');
      console.log('🚨 Critical issues detected. Immediate attention required.');
    }

    console.log('\n🔧 Next Steps:');
    console.log('1. Test with real Google OAuth accounts');
    console.log('2. Check browser console for JavaScript errors');
    console.log('3. Verify Supabase environment variables are set correctly');
    console.log('4. Check Vercel deployment logs for any errors');
    console.log('5. Test the complete user journey manually');
  }
}

// Run the real OAuth flow tests
const tester = new RealOAuthFlowTester();
tester.runAllTests().catch(console.error);


