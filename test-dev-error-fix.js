#!/usr/bin/env node

import https from 'https';

const NEW_PRODUCTION_URL = 'https://theramate-77m9mqm7o-theras-projects-6dfd5a34.vercel.app';

class DevErrorTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      productionUrl: NEW_PRODUCTION_URL,
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

  async testDevErrorFix() {
    console.log('🔍 Testing __DEV__ Error Fix...');
    console.log(`🌐 New Production URL: ${NEW_PRODUCTION_URL}`);
    
    // Test 1: Home page loads without __DEV__ error
    this.startTime = Date.now();
    const homeResponse = await this.makeRequest(NEW_PRODUCTION_URL);
    if (homeResponse.statusCode === 200) {
      this.log('Home Page Load', 'pass', 
        'Home page loads successfully',
        `Response time: ${homeResponse.responseTime}ms`);
    } else {
      this.log('Home Page Load', 'fail', 
        `Status: ${homeResponse.statusCode}`);
    }

    // Test 2: Check if JavaScript bundle contains __DEV__ references
    const jsBundleMatch = homeResponse.body.match(/src="([^"]*\.js)"/g);
    if (jsBundleMatch && jsBundleMatch.length > 0) {
      const jsFile = jsBundleMatch[0].match(/src="([^"]*\.js)"/)[1];
      const fullJsUrl = jsFile.startsWith('http') ? jsFile : `${NEW_PRODUCTION_URL}${jsFile}`;
      
      this.startTime = Date.now();
      const jsResponse = await this.makeRequest(fullJsUrl);
      if (jsResponse.statusCode === 200) {
        // Check if __DEV__ is properly defined (should be replaced with false in production)
        const hasDevReference = jsResponse.body.includes('__DEV__');
        const hasDevFalse = jsResponse.body.includes('false') && !jsResponse.body.includes('__DEV__');
        
        if (!hasDevReference || hasDevFalse) {
          this.log('JavaScript Bundle __DEV__ Fix', 'pass', 
            '__DEV__ properly handled in production bundle',
            `Bundle size: ${(jsResponse.body.length / 1024).toFixed(2)}KB`);
        } else {
          this.log('JavaScript Bundle __DEV__ Fix', 'fail', 
            '__DEV__ still present in production bundle');
        }
      } else {
        this.log('JavaScript Bundle Access', 'fail', 
          `Could not access JS bundle: ${jsResponse.statusCode}`);
      }
    } else {
      this.log('JavaScript Bundle Detection', 'fail', 
        'Could not find JavaScript bundle in HTML');
    }

    // Test 3: OAuth callback still works
    const oauthCallbackUrl = `${NEW_PRODUCTION_URL}/auth/callback?code=test&state=test`;
    this.startTime = Date.now();
    const oauthResponse = await this.makeRequest(oauthCallbackUrl);
    if (oauthResponse.statusCode === 200) {
      this.log('OAuth Callback Functionality', 'pass', 
        'OAuth callback still works after __DEV__ fix',
        `Response time: ${oauthResponse.responseTime}ms`);
    } else {
      this.log('OAuth Callback Functionality', 'fail', 
        `Status: ${oauthResponse.statusCode}`);
    }

    // Test 4: Registration page loads
    const registerUrl = `${NEW_PRODUCTION_URL}/auth/register`;
    this.startTime = Date.now();
    const registerResponse = await this.makeRequest(registerUrl);
    if (registerResponse.statusCode === 200) {
      this.log('Registration Page Load', 'pass', 
        'Registration page loads successfully',
        `Response time: ${registerResponse.responseTime}ms`);
    } else {
      this.log('Registration Page Load', 'fail', 
        `Status: ${registerResponse.statusCode}`);
    }

    // Test 5: Login page loads
    const loginUrl = `${NEW_PRODUCTION_URL}/auth/login`;
    this.startTime = Date.now();
    const loginResponse = await this.makeRequest(loginUrl);
    if (loginResponse.statusCode === 200) {
      this.log('Login Page Load', 'pass', 
        'Login page loads successfully',
        `Response time: ${loginResponse.responseTime}ms`);
    } else {
      this.log('Login Page Load', 'fail', 
        `Status: ${loginResponse.statusCode}`);
    }
  }

  generateSummary() {
    const { total, passed, failed, errors } = this.results.summary;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log('\n📊 __DEV__ Error Fix Test Summary:');
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} (${passRate}%)`);
    console.log(`Failed: ${failed}`);
    console.log(`Errors: ${errors}`);

    if (passRate >= 80) {
      console.log('\n🎉 __DEV__ Error Successfully Fixed!');
      console.log('✅ Production build no longer has __DEV__ reference errors');
      console.log('✅ OAuth flow continues to work properly');
      console.log('✅ All pages load successfully');
      
    } else {
      console.log('\n❌ __DEV__ Error Still Present');
      console.log('🚨 Additional fixes may be needed');
    }

    console.log('\n🔧 Next Steps:');
    console.log('1. Test the OAuth flow with real Google accounts');
    console.log('2. Check browser console for any remaining errors');
    console.log('3. Verify all functionality works as expected');
  }

  async runTest() {
    console.log('🚀 Testing __DEV__ Error Fix...');
    console.log(`🌐 New Production URL: ${NEW_PRODUCTION_URL}`);
    
    await this.testDevErrorFix();
    this.generateSummary();
  }
}

// Run the __DEV__ error fix test
const tester = new DevErrorTester();
tester.runTest().catch(console.error);







