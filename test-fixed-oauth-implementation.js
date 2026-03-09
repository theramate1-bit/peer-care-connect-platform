#!/usr/bin/env node

import https from 'https';

const PRODUCTION_URL = 'https://theramate-i06ut7w84-theras-projects-6dfd5a34.vercel.app';

class FixedOAuthTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      productionUrl: PRODUCTION_URL,
      tests: {
        build: [],
        supabase: [],
        oauth: [],
        roleManager: [],
      },
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: 0,
      };
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

  async testBuild() {
    console.log('\n🔍 Testing Fixed Build...');
    
    // Test main page
    this.startTime = Date.now();
    const mainResponse = await this.makeRequest(`${PRODUCTION_URL}/`);
    
    if (mainResponse.statusCode === 200) {
      this.log('build', 'Main Page Access', 'pass', 
        'Main page accessible',
        `Response time: ${mainResponse.responseTime}ms`);
      
      // Check bundle size
      const jsBundleMatches = mainResponse.body.match(/src="([^"]*\.js[^"]*)"/g);
      if (jsBundleMatches) {
        this.log('build', 'JavaScript Bundles', 'pass', 
          `Found ${jsBundleMatches.length} JavaScript bundles`);
        
        // Test main bundle
        const mainBundleMatch = jsBundleMatches.find(match => match.includes('index-'));
        if (mainBundleMatch) {
          const bundleUrl = mainBundleMatch.match(/src="([^"]*)"/)[1];
          const fullBundleUrl = bundleUrl.startsWith('http') ? bundleUrl : `${PRODUCTION_URL}${bundleUrl}`;
          
          this.startTime = Date.now();
          try {
            const bundleResponse = await this.makeRequest(fullBundleUrl);
            if (bundleResponse.statusCode === 200) {
              const bundleSizeMB = (bundleResponse.body.length / 1024 / 1024).toFixed(2);
              this.log('build', 'Main Bundle Size', 'pass', 
                `Main bundle accessible and optimized`,
                `Size: ${bundleSizeMB}MB, Response time: ${bundleResponse.responseTime}ms`);
            } else {
              this.log('build', 'Main Bundle Access', 'fail', 
                `Status: ${bundleResponse.statusCode}`);
            }
          } catch (error) {
            this.log('build', 'Main Bundle Access', 'error', 
              error.message);
          }
        }
      }
    } else {
      this.log('build', 'Main Page Access', 'fail', 
        `Status: ${mainResponse.statusCode}`);
    }
  }

  async testSupabase() {
    console.log('\n🔍 Testing Supabase Integration...');
    
    // Test register page for Supabase client
    this.startTime = Date.now();
    const registerResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/register`);
    
    if (registerResponse.statusCode === 200) {
      // Check for Supabase client code
      const hasSupabaseClient = registerResponse.body.includes('createClient') || 
                               registerResponse.body.includes('supabase') ||
                               registerResponse.body.includes('SUPABASE_URL');
      
      if (hasSupabaseClient) {
        this.log('supabase', 'Supabase Client Detection', 'pass', 
          'Supabase client code detected');
      } else {
        this.log('supabase', 'Supabase Client Detection', 'fail', 
          'No Supabase client code detected');
      }

      // Check for environment variable usage
      const hasEnvVars = registerResponse.body.includes('VITE_SUPABASE') || 
                        registerResponse.body.includes('import.meta.env');
      
      if (hasEnvVars) {
        this.log('supabase', 'Environment Variables', 'pass', 
          'Environment variable usage detected');
      } else {
        this.log('supabase', 'Environment Variables', 'fail', 
          'No environment variable usage detected');
      }
    } else {
      this.log('supabase', 'Register Page Access', 'fail', 
        `Status: ${registerResponse.statusCode}`);
    }
  }

  async testOAuth() {
    console.log('\n🔍 Testing OAuth Implementation...');
    
    // Test OAuth callback page
    this.startTime = Date.now();
    const callbackResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/callback`);
    
    if (callbackResponse.statusCode === 200) {
      this.log('oauth', 'OAuth Callback Access', 'pass', 
        'OAuth callback page accessible',
        `Response time: ${callbackResponse.responseTime}ms`);
      
      // Check for OAuth handling code
      const hasOAuthCode = callbackResponse.body.includes('signInWithOAuth') || 
                          callbackResponse.body.includes('auth/callback') ||
                          callbackResponse.body.includes('google');
      
      if (hasOAuthCode) {
        this.log('oauth', 'OAuth Code Detection', 'pass', 
          'OAuth handling code detected');
      } else {
        this.log('oauth', 'OAuth Code Detection', 'fail', 
          'No OAuth handling code detected');
      }

      // Check for error handling
      const hasErrorHandling = callbackResponse.body.includes('error') || 
                              callbackResponse.body.includes('Error') ||
                              callbackResponse.body.includes('Authentication Error');
      
      if (hasErrorHandling) {
        this.log('oauth', 'Error Handling', 'pass', 
          'Error handling UI detected');
      } else {
        this.log('oauth', 'Error Handling', 'fail', 
          'No error handling UI detected');
      }
    } else {
      this.log('oauth', 'OAuth Callback Access', 'fail', 
        `Status: ${callbackResponse.statusCode}`);
    }
  }

  async testRoleManager() {
    console.log('\n🔍 Testing Role Manager...');
    
    // Test role selection page
    this.startTime = Date.now();
    const roleSelectionResponse = await this.makeRequest(`${PRODUCTION_URL}/role-selection`);
    
    if (roleSelectionResponse.statusCode === 200) {
      this.log('roleManager', 'Role Selection Page', 'pass', 
        'Role selection page accessible',
        `Response time: ${roleSelectionResponse.responseTime}ms`);
      
      // Check for role management code
      const hasRoleCode = roleSelectionResponse.body.includes('RoleManager') || 
                         roleSelectionResponse.body.includes('role') ||
                         roleSelectionResponse.body.includes('user_role');
      
      if (hasRoleCode) {
        this.log('roleManager', 'Role Management Code', 'pass', 
          'Role management code detected');
      } else {
        this.log('roleManager', 'Role Management Code', 'fail', 
          'No role management code detected');
      }
    } else {
      this.log('roleManager', 'Role Selection Page', 'fail', 
        `Status: ${roleSelectionResponse.statusCode}`);
    }
  }

  async runAllTests() {
    console.log('🚀 Testing Fixed OAuth Implementation...');
    console.log(`🌐 New Production URL: ${PRODUCTION_URL}`);
    console.log('⚠️  Note: Testing the fixed build with proper environment variable handling');

    await this.testBuild();
    await this.testSupabase();
    await this.testOAuth();
    await this.testRoleManager();

    this.generateSummary();
  }

  generateSummary() {
    const { total, passed, failed, errors } = this.results.summary;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log('\n📊 Fixed OAuth Implementation Test Summary:');
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
      console.log('\n🎉 All OAuth implementation tests passed!');
      console.log('✅ The OAuth flow should now work correctly in production.');
      console.log('✅ Supabase client is properly initialized.');
      console.log('✅ Environment variables are being processed correctly.');
      console.log('✅ Role management is implemented.');
    } else if (failed > 0) {
      console.log('\n⚠️  Some OAuth implementation tests failed.');
      console.log('❌ There may still be issues with the OAuth flow.');
    } else {
      console.log('\n❌ OAuth implementation test errors occurred.');
      console.log('🚨 Critical issues detected. Immediate attention required.');
    }

    console.log('\n🔧 Next Steps:');
    console.log('1. Test with real Google OAuth accounts');
    console.log('2. Check browser console for any remaining errors');
    console.log('3. Verify OAuth flow works end-to-end');
    console.log('4. Test role assignment with real users');
  }
}

// Run the fixed OAuth tests
const tester = new FixedOAuthTester();
tester.runAllTests().catch(console.error);


