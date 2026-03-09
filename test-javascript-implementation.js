#!/usr/bin/env node

import https from 'https';

const PRODUCTION_URL = 'https://theramate-blzpwyau7-theras-projects-6dfd5a34.vercel.app';

class JavaScriptErrorTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      productionUrl: PRODUCTION_URL,
      tests: {
        jsBundle: [],
        supabaseClient: [],
        oauthImplementation: [],
        roleManager: [],
        errors: [],
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
          'Accept': 'application/javascript, text/javascript, */*',
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
      req.setTimeout(30000, () => req.destroy());
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

  async testJSBundle() {
    console.log('\n🔍 Testing JavaScript Bundle...');
    
    // First, get the main page to find the JS bundle
    this.startTime = Date.now();
    const mainPageResponse = await this.makeRequest(`${PRODUCTION_URL}/`);
    
    if (mainPageResponse.statusCode === 200) {
      // Extract JS bundle URLs from the HTML
      const jsBundleMatches = mainPageResponse.body.match(/src="([^"]*\.js[^"]*)"/g);
      
      if (jsBundleMatches && jsBundleMatches.length > 0) {
        this.log('jsBundle', 'JS Bundle Detection', 'pass', 
          `Found ${jsBundleMatches.length} JavaScript bundles`);
        
        // Test the main JS bundle
        for (let i = 0; i < Math.min(jsBundleMatches.length, 3); i++) {
          const bundleUrl = jsBundleMatches[i].match(/src="([^"]*)"/)[1];
          const fullBundleUrl = bundleUrl.startsWith('http') ? bundleUrl : `${PRODUCTION_URL}${bundleUrl}`;
          
          this.startTime = Date.now();
          try {
            const bundleResponse = await this.makeRequest(fullBundleUrl);
            
            if (bundleResponse.statusCode === 200) {
              this.log('jsBundle', `Bundle ${i + 1} Access`, 'pass', 
                `Bundle accessible: ${bundleUrl}`,
                `Size: ${bundleResponse.body.length} bytes, Response time: ${bundleResponse.responseTime}ms`);
              
              // Check for common errors in the bundle
              const hasSyntaxErrors = bundleResponse.body.includes('SyntaxError') || 
                                    bundleResponse.body.includes('ReferenceError') ||
                                    bundleResponse.body.includes('TypeError');
              
              if (hasSyntaxErrors) {
                this.log('jsBundle', `Bundle ${i + 1} Syntax`, 'fail', 
                  'Syntax errors detected in bundle');
              } else {
                this.log('jsBundle', `Bundle ${i + 1} Syntax`, 'pass', 
                  'No syntax errors detected');
              }
              
            } else {
              this.log('jsBundle', `Bundle ${i + 1} Access`, 'fail', 
                `Status: ${bundleResponse.statusCode}`);
            }
          } catch (error) {
            this.log('jsBundle', `Bundle ${i + 1} Access`, 'error', 
              error.message);
          }
        }
      } else {
        this.log('jsBundle', 'JS Bundle Detection', 'fail', 
          'No JavaScript bundles found in HTML');
      }
    } else {
      this.log('jsBundle', 'Main Page Access', 'fail', 
        `Status: ${mainPageResponse.statusCode}`);
    }
  }

  async testSupabaseClient() {
    console.log('\n🔍 Testing Supabase Client Integration...');
    
    // Test if Supabase client is properly configured
    this.startTime = Date.now();
    const registerResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/register`);
    
    if (registerResponse.statusCode === 200) {
      // Check for Supabase client initialization
      const hasSupabaseClient = registerResponse.body.includes('createClient') || 
                               registerResponse.body.includes('supabase') ||
                               registerResponse.body.includes('SUPABASE_URL');
      
      if (hasSupabaseClient) {
        this.log('supabaseClient', 'Supabase Client Detection', 'pass', 
          'Supabase client code detected');
      } else {
        this.log('supabaseClient', 'Supabase Client Detection', 'fail', 
          'No Supabase client code detected');
      }

      // Check for environment variable usage
      const hasEnvVars = registerResponse.body.includes('VITE_SUPABASE') || 
                        registerResponse.body.includes('import.meta.env');
      
      if (hasEnvVars) {
        this.log('supabaseClient', 'Environment Variables', 'pass', 
          'Environment variable usage detected');
      } else {
        this.log('supabaseClient', 'Environment Variables', 'fail', 
          'No environment variable usage detected');
      }
    } else {
      this.log('supabaseClient', 'Register Page Access', 'fail', 
        `Status: ${registerResponse.statusCode}`);
    }
  }

  async testOAuthImplementation() {
    console.log('\n🔍 Testing OAuth Implementation...');
    
    // Test OAuth callback page for implementation
    this.startTime = Date.now();
    const callbackResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/callback`);
    
    if (callbackResponse.statusCode === 200) {
      // Check for OAuth handling code
      const hasOAuthCode = callbackResponse.body.includes('signInWithOAuth') || 
                          callbackResponse.body.includes('auth/callback') ||
                          callbackResponse.body.includes('google');
      
      if (hasOAuthCode) {
        this.log('oauthImplementation', 'OAuth Code Detection', 'pass', 
          'OAuth handling code detected');
      } else {
        this.log('oauthImplementation', 'OAuth Code Detection', 'fail', 
          'No OAuth handling code detected');
      }

      // Check for error handling
      const hasErrorHandling = callbackResponse.body.includes('error') || 
                              callbackResponse.body.includes('catch') ||
                              callbackResponse.body.includes('try');
      
      if (hasErrorHandling) {
        this.log('oauthImplementation', 'Error Handling', 'pass', 
          'Error handling code detected');
      } else {
        this.log('oauthImplementation', 'Error Handling', 'fail', 
          'No error handling code detected');
      }
    } else {
      this.log('oauthImplementation', 'Callback Page Access', 'fail', 
        `Status: ${callbackResponse.statusCode}`);
    }
  }

  async testRoleManager() {
    console.log('\n🔍 Testing Role Manager Implementation...');
    
    // Test role selection page
    this.startTime = Date.now();
    const roleSelectionResponse = await this.makeRequest(`${PRODUCTION_URL}/role-selection`);
    
    if (roleSelectionResponse.statusCode === 200) {
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

      // Check for session storage usage
      const hasSessionStorage = roleSelectionResponse.body.includes('sessionStorage') || 
                               roleSelectionResponse.body.includes('localStorage');
      
      if (hasSessionStorage) {
        this.log('roleManager', 'Storage Usage', 'pass', 
          'Storage usage detected');
      } else {
        this.log('roleManager', 'Storage Usage', 'fail', 
          'No storage usage detected');
      }
    } else {
      this.log('roleManager', 'Role Selection Page Access', 'fail', 
        `Status: ${roleSelectionResponse.statusCode}`);
    }
  }

  async testErrors() {
    console.log('\n🔍 Testing for Common Errors...');
    
    // Test for common React errors
    const pages = ['/', '/auth/register', '/auth/login', '/auth/callback'];
    
    for (const page of pages) {
      this.startTime = Date.now();
      try {
        const response = await this.makeRequest(`${PRODUCTION_URL}${page}`);
        
        if (response.statusCode === 200) {
          // Check for common error patterns
          const hasReactErrors = response.body.includes('React') && 
                                (response.body.includes('error') || 
                                 response.body.includes('Error') ||
                                 response.body.includes('undefined'));
          
          if (hasReactErrors) {
            this.log('errors', `React Errors - ${page}`, 'fail', 
              'Potential React errors detected');
          } else {
            this.log('errors', `React Errors - ${page}`, 'pass', 
              'No React errors detected');
          }

          // Check for console errors
          const hasConsoleErrors = response.body.includes('console.error') || 
                                  response.body.includes('console.warn');
          
          if (hasConsoleErrors) {
            this.log('errors', `Console Errors - ${page}`, 'fail', 
              'Console error calls detected');
          } else {
            this.log('errors', `Console Errors - ${page}`, 'pass', 
              'No console error calls detected');
          }
        } else {
          this.log('errors', `Page Access - ${page}`, 'fail', 
            `Status: ${response.statusCode}`);
        }
      } catch (error) {
        this.log('errors', `Page Access - ${page}`, 'error', 
          error.message);
      }
    }
  }

  async runAllTests() {
    console.log('🚀 Testing JavaScript Implementation Issues...');
    console.log(`🌐 Production URL: ${PRODUCTION_URL}`);
    console.log('⚠️  Note: These tests check JavaScript bundle and implementation');

    await this.testJSBundle();
    await this.testSupabaseClient();
    await this.testOAuthImplementation();
    await this.testRoleManager();
    await this.testErrors();

    this.generateSummary();
  }

  generateSummary() {
    const { total, passed, failed, errors } = this.results.summary;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log('\n📊 JavaScript Implementation Test Summary:');
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
      console.log('\n🎉 All JavaScript implementation tests passed!');
      console.log('✅ The JavaScript implementation should be working correctly.');
    } else if (failed > 0) {
      console.log('\n⚠️  JavaScript implementation issues detected.');
      console.log('❌ These are the likely reasons why OAuth is not working:');
      
      // Provide specific recommendations
      console.log('\n🔧 Likely Root Causes:');
      if (this.results.tests.jsBundle.some(t => t.status === 'fail')) {
        console.log('1. JavaScript bundles not loading or have syntax errors');
      }
      if (this.results.tests.supabaseClient.some(t => t.status === 'fail')) {
        console.log('2. Supabase client not properly initialized');
      }
      if (this.results.tests.oauthImplementation.some(t => t.status === 'fail')) {
        console.log('3. OAuth implementation missing or broken');
      }
      if (this.results.tests.roleManager.some(t => t.status === 'fail')) {
        console.log('4. Role management code not properly implemented');
      }
    } else {
      console.log('\n❌ JavaScript implementation test errors occurred.');
      console.log('🚨 Critical issues detected. Immediate attention required.');
    }

    console.log('\n🔧 Next Steps:');
    console.log('1. Check browser console for JavaScript errors');
    console.log('2. Verify all environment variables are properly set');
    console.log('3. Check if JavaScript bundles are loading correctly');
    console.log('4. Test OAuth flow in browser developer tools');
    console.log('5. Check Vercel deployment logs for build errors');
  }
}

// Run the JavaScript implementation tests
const tester = new JavaScriptErrorTester();
tester.runAllTests().catch(console.error);


