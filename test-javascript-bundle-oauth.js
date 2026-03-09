#!/usr/bin/env node

import https from 'https';

const PRODUCTION_URL = 'https://theramate-7p3ufmvh6-theras-projects-6dfd5a34.vercel.app';

class JavaScriptOAuthTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      productionUrl: PRODUCTION_URL,
      tests: {
        bundleAnalysis: [],
        oauthCode: [],
        roleManagement: [],
        supabaseClient: [],
        errorHandling: [],
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

  async testBundleAnalysis() {
    console.log('\n🔍 Analyzing JavaScript Bundle for OAuth Code...');
    
    // Get main page to find bundle URLs
    this.startTime = Date.now();
    const mainResponse = await this.makeRequest(`${PRODUCTION_URL}/`);
    
    if (mainResponse.statusCode === 200) {
      // Extract JS bundle URLs
      const jsBundleMatches = mainResponse.body.match(/src="([^"]*\.js[^"]*)"/g);
      
      if (jsBundleMatches && jsBundleMatches.length > 0) {
        this.log('bundleAnalysis', 'Bundle Detection', 'pass', 
          `Found ${jsBundleMatches.length} JavaScript bundles`);
        
        // Analyze the main bundle
        const mainBundleMatch = jsBundleMatches.find(match => match.includes('index-'));
        if (mainBundleMatch) {
          const bundleUrl = mainBundleMatch.match(/src="([^"]*)"/)[1];
          const fullBundleUrl = bundleUrl.startsWith('http') ? bundleUrl : `${PRODUCTION_URL}${bundleUrl}`;
          
          this.startTime = Date.now();
          try {
            const bundleResponse = await this.makeRequest(fullBundleUrl);
            if (bundleResponse.statusCode === 200) {
              const bundleSizeMB = (bundleResponse.body.length / 1024 / 1024).toFixed(2);
              this.log('bundleAnalysis', 'Main Bundle Access', 'pass', 
                `Main bundle accessible`,
                `Size: ${bundleSizeMB}MB, Response time: ${bundleResponse.responseTime}ms`);
              
              // Store bundle content for analysis
              this.bundleContent = bundleResponse.body;
            } else {
              this.log('bundleAnalysis', 'Main Bundle Access', 'fail', 
                `Status: ${bundleResponse.statusCode}`);
            }
          } catch (error) {
            this.log('bundleAnalysis', 'Main Bundle Access', 'error', 
              error.message);
          }
        }
      } else {
        this.log('bundleAnalysis', 'Bundle Detection', 'fail', 
          'No JavaScript bundles found');
      }
    } else {
      this.log('bundleAnalysis', 'Main Page Access', 'fail', 
        `Status: ${mainResponse.statusCode}`);
    }
  }

  async testOAuthCode() {
    console.log('\n🔍 Testing OAuth Implementation in Bundle...');
    
    if (!this.bundleContent) {
      this.log('oauthCode', 'Bundle Content', 'fail', 
        'No bundle content available for analysis');
      return;
    }

    // Check for OAuth-related code in the bundle
    const oauthPatterns = [
      { pattern: 'signInWithOAuth', name: 'Supabase OAuth Method' },
      { pattern: 'google', name: 'Google OAuth References' },
      { pattern: 'oauth', name: 'OAuth References' },
      { pattern: 'auth/callback', name: 'OAuth Callback Route' },
      { pattern: 'handleGoogleOAuth', name: 'Google OAuth Handler' },
    ];

    for (const { pattern, name } of oauthPatterns) {
      const hasPattern = this.bundleContent.includes(pattern);
      if (hasPattern) {
        this.log('oauthCode', name, 'pass', 
          `OAuth pattern '${pattern}' found in bundle`);
      } else {
        this.log('oauthCode', name, 'fail', 
          `OAuth pattern '${pattern}' not found in bundle`);
      }
    }
  }

  async testRoleManagement() {
    console.log('\n🔍 Testing Role Management in Bundle...');
    
    if (!this.bundleContent) {
      this.log('roleManagement', 'Bundle Content', 'fail', 
        'No bundle content available for analysis');
      return;
    }

    // Check for role management code in the bundle
    const rolePatterns = [
      { pattern: 'RoleManager', name: 'RoleManager Class' },
      { pattern: 'user_role', name: 'User Role Field' },
      { pattern: 'role-selection', name: 'Role Selection Route' },
      { pattern: 'onboarding', name: 'Onboarding Route' },
      { pattern: 'sessionStorage', name: 'Session Storage Usage' },
      { pattern: 'setPendingRole', name: 'Set Pending Role Method' },
      { pattern: 'consumePendingRole', name: 'Consume Pending Role Method' },
    ];

    for (const { pattern, name } of rolePatterns) {
      const hasPattern = this.bundleContent.includes(pattern);
      if (hasPattern) {
        this.log('roleManagement', name, 'pass', 
          `Role management pattern '${pattern}' found in bundle`);
      } else {
        this.log('roleManagement', name, 'fail', 
          `Role management pattern '${pattern}' not found in bundle`);
      }
    }
  }

  async testSupabaseClient() {
    console.log('\n🔍 Testing Supabase Client in Bundle...');
    
    if (!this.bundleContent) {
      this.log('supabaseClient', 'Bundle Content', 'fail', 
        'No bundle content available for analysis');
      return;
    }

    // Check for Supabase client code in the bundle
    const supabasePatterns = [
      { pattern: 'createClient', name: 'Supabase Create Client' },
      { pattern: 'supabase', name: 'Supabase References' },
      { pattern: 'SUPABASE_URL', name: 'Supabase URL Environment Variable' },
      { pattern: 'SUPABASE_ANON_KEY', name: 'Supabase Anon Key Environment Variable' },
      { pattern: 'auth.getUser', name: 'Supabase Auth Get User' },
      { pattern: 'from(\'users\')', name: 'Supabase Users Table Query' },
    ];

    for (const { pattern, name } of supabasePatterns) {
      const hasPattern = this.bundleContent.includes(pattern);
      if (hasPattern) {
        this.log('supabaseClient', name, 'pass', 
          `Supabase pattern '${pattern}' found in bundle`);
      } else {
        this.log('supabaseClient', name, 'fail', 
          `Supabase pattern '${pattern}' not found in bundle`);
      }
    }
  }

  async testErrorHandling() {
    console.log('\n🔍 Testing Error Handling in Bundle...');
    
    if (!this.bundleContent) {
      this.log('errorHandling', 'Bundle Content', 'fail', 
        'No bundle content available for analysis');
      return;
    }

    // Check for error handling code in the bundle
    const errorPatterns = [
      { pattern: 'try {', name: 'Try-Catch Blocks' },
      { pattern: 'catch', name: 'Catch Blocks' },
      { pattern: 'error', name: 'Error Handling' },
      { pattern: 'toast', name: 'Toast Notifications' },
      { pattern: 'console.error', name: 'Console Error Logging' },
    ];

    for (const { pattern, name } of errorPatterns) {
      const hasPattern = this.bundleContent.includes(pattern);
      if (hasPattern) {
        this.log('errorHandling', name, 'pass', 
          `Error handling pattern '${pattern}' found in bundle`);
      } else {
        this.log('errorHandling', name, 'fail', 
          `Error handling pattern '${pattern}' not found in bundle`);
      }
    }
  }

  async runAllTests() {
    console.log('🚀 Testing JavaScript Bundle for OAuth Implementation...');
    console.log(`🌐 Production URL: ${PRODUCTION_URL}`);
    console.log('⚠️  Note: Analyzing JavaScript bundle content for OAuth and role management code');

    await this.testBundleAnalysis();
    await this.testOAuthCode();
    await this.testRoleManagement();
    await this.testSupabaseClient();
    await this.testErrorHandling();

    this.generateSummary();
  }

  generateSummary() {
    const { total, passed, failed, errors } = this.results.summary;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log('\n📊 JavaScript Bundle OAuth Analysis Summary:');
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
      console.log('\n🎉 All JavaScript bundle OAuth tests passed!');
      console.log('✅ OAuth implementation is present in the JavaScript bundle.');
      console.log('✅ Role management code is included.');
      console.log('✅ Supabase client is properly configured.');
      console.log('✅ Error handling is implemented.');
    } else if (failed > 0) {
      console.log('\n⚠️  Some JavaScript bundle OAuth tests failed.');
      console.log('❌ There may be missing OAuth or role management code in the bundle.');
      
      // Provide specific recommendations
      console.log('\n🔧 Missing Components:');
      if (this.results.tests.oauthCode.some(t => t.status === 'fail')) {
        console.log('1. OAuth implementation code missing from bundle');
      }
      if (this.results.tests.roleManagement.some(t => t.status === 'fail')) {
        console.log('2. Role management code missing from bundle');
      }
      if (this.results.tests.supabaseClient.some(t => t.status === 'fail')) {
        console.log('3. Supabase client code missing from bundle');
      }
      if (this.results.tests.errorHandling.some(t => t.status === 'fail')) {
        console.log('4. Error handling code missing from bundle');
      }
    } else {
      console.log('\n❌ JavaScript bundle OAuth test errors occurred.');
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

// Run the JavaScript bundle OAuth tests
const tester = new JavaScriptOAuthTester();
tester.runAllTests().catch(console.error);



































