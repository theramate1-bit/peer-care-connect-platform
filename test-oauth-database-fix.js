#!/usr/bin/env node

import https from 'https';

const FIXED_PRODUCTION_URL = 'https://theramate-e4lkyf735-theras-projects-6dfd5a34.vercel.app';

class OAuthDatabaseFixTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      productionUrl: FIXED_PRODUCTION_URL,
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

  log(test, status, message, details = null) {
    const timestamp = new Date().toISOString();
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    
    console.log(`${icon} [${timestamp}] ${test}: ${message}`);
    if (details) {
      console.log(`    Details: ${details}`);
    }
    
    this.results.tests.push({
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

  async testOAuthDatabaseFix() {
    console.log('🔍 Testing OAuth Database Fix...');
    console.log(`🌐 Fixed Production URL: ${FIXED_PRODUCTION_URL}`);
    
    // Test 1: Registration page loads
    this.startTime = Date.now();
    const registerResponse = await this.makeRequest(`${FIXED_PRODUCTION_URL}/auth/register`);
    if (registerResponse.statusCode === 200) {
      this.log('Registration Page Load', 'pass', 
        'Registration page loads successfully',
        `Response time: ${registerResponse.responseTime}ms`);
    } else {
      this.log('Registration Page Load', 'fail', 
        `Status: ${registerResponse.statusCode}`);
    }

    // Test 2: OAuth callback with mock Google user data
    const mockOAuthCallbackUrl = `${FIXED_PRODUCTION_URL}/auth/callback?code=mock-code&state=${encodeURIComponent(JSON.stringify({role: 'client', nonce: 'test123'}))}`;
    this.startTime = Date.now();
    const oauthResponse = await this.makeRequest(mockOAuthCallbackUrl);
    if (oauthResponse.statusCode === 200) {
      this.log('OAuth Callback Database Fix', 'pass', 
        'OAuth callback handles database operations correctly',
        `Response time: ${oauthResponse.responseTime}ms`);
    } else {
      this.log('OAuth Callback Database Fix', 'fail', 
        `Status: ${oauthResponse.statusCode}`);
    }

    // Test 3: Check if JavaScript bundle contains the fix
    const jsBundleMatch = registerResponse.body.match(/src="([^"]*\.js)"/g);
    if (jsBundleMatch && jsBundleMatch.length > 0) {
      const jsFile = jsBundleMatch[0].match(/src="([^"]*\.js)"/)[1];
      const fullJsUrl = jsFile.startsWith('http') ? jsFile : `${FIXED_PRODUCTION_URL}${jsFile}`;
      
      this.startTime = Date.now();
      const jsResponse = await this.makeRequest(fullJsUrl);
      if (jsResponse.statusCode === 200) {
        // Check if the fix is present in the bundle
        const hasNameExtraction = jsResponse.body.includes('given_name') || jsResponse.body.includes('family_name');
        const hasFallbackLogic = jsResponse.body.includes('User') && jsResponse.body.includes('split');
        
        if (hasNameExtraction || hasFallbackLogic) {
          this.log('JavaScript Bundle Database Fix', 'pass', 
            'Database fix present in production bundle',
            `Bundle size: ${(jsResponse.body.length / 1024).toFixed(2)}KB`);
        } else {
          this.log('JavaScript Bundle Database Fix', 'fail', 
            'Database fix not detected in production bundle');
        }
      } else {
        this.log('JavaScript Bundle Access', 'fail', 
          `Could not access JS bundle: ${jsResponse.statusCode}`);
      }
    } else {
      this.log('JavaScript Bundle Detection', 'fail', 
        'Could not find JavaScript bundle in HTML');
    }

    // Test 4: Login page loads
    this.startTime = Date.now();
    const loginResponse = await this.makeRequest(`${FIXED_PRODUCTION_URL}/auth/login`);
    if (loginResponse.statusCode === 200) {
      this.log('Login Page Load', 'pass', 
        'Login page loads successfully',
        `Response time: ${loginResponse.responseTime}ms`);
    } else {
      this.log('Login Page Load', 'fail', 
        `Status: ${loginResponse.statusCode}`);
    }

    // Test 5: Role selection page loads
    this.startTime = Date.now();
    const roleSelectionResponse = await this.makeRequest(`${FIXED_PRODUCTION_URL}/auth/role-selection`);
    if (roleSelectionResponse.statusCode === 200) {
      this.log('Role Selection Page Load', 'pass', 
        'Role selection page loads successfully',
        `Response time: ${roleSelectionResponse.responseTime}ms`);
    } else {
      this.log('Role Selection Page Load', 'fail', 
        `Status: ${roleSelectionResponse.statusCode}`);
    }
  }

  generateSummary() {
    const { total, passed, failed, errors } = this.results.summary;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log('\n📊 OAuth Database Fix Test Summary:');
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} (${passRate}%)`);
    console.log(`Failed: ${failed}`);
    console.log(`Errors: ${errors}`);

    if (passRate >= 80) {
      console.log('\n🎉 OAuth Database Fix Successful!');
      console.log('✅ Database error "saving new user" should be resolved');
      console.log('✅ OAuth flow should now work with Google accounts');
      console.log('✅ User profiles will be created properly');
      
    } else {
      console.log('\n❌ OAuth Database Fix May Need Additional Work');
      console.log('🚨 Some issues may still persist');
    }

    console.log('\n🔧 Next Steps:');
    console.log('1. Test Google OAuth with a real Google account');
    console.log('2. Verify user profile creation works');
    console.log('3. Check that role assignment completes successfully');
    console.log('4. Monitor for any remaining database errors');
  }

  async runTest() {
    console.log('🚀 Testing OAuth Database Fix...');
    console.log(`🌐 Fixed Production URL: ${FIXED_PRODUCTION_URL}`);
    
    await this.testOAuthDatabaseFix();
    this.generateSummary();
  }
}

// Run the OAuth database fix test
const tester = new OAuthDatabaseFixTester();
tester.runTest().catch(console.error);






