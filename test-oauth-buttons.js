#!/usr/bin/env node

import https from 'https';

const PRODUCTION_URL = 'https://theramate-ax7rldtpt-theras-projects-6dfd5a34.vercel.app';

class OAuthButtonTester {
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

  async makeRequest(url) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const req = https.request({
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({
          statusCode: res.statusCode,
          body: data,
          url: url,
        }));
      });
      
      req.on('error', reject);
      req.setTimeout(10000, () => req.destroy());
      req.end();
    });
  }

  analyzeOAuthButtons(body, pageName) {
    const results = [];
    
    // Check for Client OAuth button
    if (body.includes('Continue with Google as Client')) {
      results.push({ 
        test: `${pageName} - Client OAuth Button`, 
        status: 'PASS', 
        message: 'Client OAuth button found.' 
      });
    } else {
      results.push({ 
        test: `${pageName} - Client OAuth Button`, 
        status: 'FAIL', 
        message: 'Client OAuth button NOT found.' 
      });
    }

    // Check for Practitioner OAuth button
    if (body.includes('Continue with Google as Practitioner')) {
      results.push({ 
        test: `${pageName} - Practitioner OAuth Button`, 
        status: 'PASS', 
        message: 'Practitioner OAuth button found.' 
      });
    } else {
      results.push({ 
        test: `${pageName} - Practitioner OAuth Button`, 
        status: 'FAIL', 
        message: 'Practitioner OAuth button NOT found.' 
      });
    }

    // Check for Google OAuth integration
    if (body.includes('google') || body.includes('Google')) {
      results.push({ 
        test: `${pageName} - Google OAuth Integration`, 
        status: 'PASS', 
        message: 'Google OAuth integration detected.' 
      });
    } else {
      results.push({ 
        test: `${pageName} - Google OAuth Integration`, 
        status: 'FAIL', 
        message: 'Google OAuth integration NOT detected.' 
      });
    }

    // Check for JavaScript bundle
    if (body.includes('<script type="module"')) {
      results.push({ 
        test: `${pageName} - JavaScript Bundle`, 
        status: 'PASS', 
        message: 'JavaScript bundle found.' 
      });
    } else {
      results.push({ 
        test: `${pageName} - JavaScript Bundle`, 
        status: 'FAIL', 
        message: 'JavaScript bundle NOT found.' 
      });
    }

    // Check for React app root
    if (body.includes('<div id="root">')) {
      results.push({ 
        test: `${pageName} - React App Root`, 
        status: 'PASS', 
        message: 'React app root element found.' 
      });
    } else {
      results.push({ 
        test: `${pageName} - React App Root`, 
        status: 'FAIL', 
        message: 'React app root element NOT found.' 
      });
    }

    return results;
  }

  async testPage(name, path) {
    const url = `${PRODUCTION_URL}${path}`;
    console.log(`\n🔍 Testing ${name} (${url})...`);
    
    try {
      const { statusCode, body } = await this.makeRequest(url);
      const status = statusCode >= 200 && statusCode < 300 ? 'PASS' : 'FAIL';
      const message = `Status: ${statusCode}, Body length: ${body.length} bytes`;
      
      const testResult = {
        page: name,
        url: url,
        statusCode: statusCode,
        status: status,
        message: message,
        buttonAnalysis: this.analyzeOAuthButtons(body, name),
      };

      this.results.tests.push(testResult);
      this.results.summary.total++;
      
      if (status === 'PASS') {
        this.results.summary.passed++;
        console.log(`✅ [${status}] ${name}: ${message}`);
      } else {
        this.results.summary.failed++;
        console.log(`❌ [${status}] ${name}: ${message}`);
      }

      // Log button analysis results
      testResult.buttonAnalysis.forEach(res => {
        const icon = res.status === 'PASS' ? '✅' : '❌';
        console.log(`  ${icon} ${res.test}: ${res.message}`);
      });

      return testResult;
    } catch (error) {
      const testResult = {
        page: name,
        url: url,
        statusCode: null,
        status: 'ERROR',
        message: `Request failed: ${error.message}`,
        buttonAnalysis: [],
      };

      this.results.tests.push(testResult);
      this.results.summary.total++;
      this.results.summary.errors++;
      
      console.error(`❌ [ERROR] ${name}: Request failed - ${error.message}`);
      return testResult;
    }
  }

  async testOAuthButtons() {
    console.log('🚀 Testing OAuth Buttons...');
    console.log(`🌐 Production URL: ${PRODUCTION_URL}`);

    const pages = [
      { name: 'Register Page', path: '/auth/register' },
      { name: 'Login Page', path: '/auth/login' },
      { name: 'Main Page', path: '/' },
    ];

    // Test all pages
    for (const page of pages) {
      await this.testPage(page.name, page.path);
    }

    // Generate summary
    this.generateSummary();
  }

  generateSummary() {
    const { total, passed, failed, errors } = this.results.summary;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log('\n📊 OAuth Button Test Summary:');
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} (${passRate}%)`);
    console.log(`Failed: ${failed}`);
    console.log(`Errors: ${errors}`);

    // Overall status
    if (failed === 0 && errors === 0) {
      console.log('\n🎉 All OAuth button tests passed!');
    } else if (failed > 0) {
      console.log('\n⚠️  Some OAuth button tests failed. Check the results above.');
    } else {
      console.log('\n❌ OAuth button test errors occurred. Check the results above.');
    }

    // Specific recommendations
    if (failed > 0) {
      console.log('\n🔧 Recommendations:');
      console.log('1. Check if the OAuth buttons are properly rendered in the React components');
      console.log('2. Verify that the button text matches exactly: "Continue with Google as Client" and "Continue with Google as Practitioner"');
      console.log('3. Ensure the JavaScript bundle is loading correctly');
      console.log('4. Check for any console errors in the browser');
    }
  }
}

// Run the tests
const tester = new OAuthButtonTester();
tester.testOAuthButtons().catch(console.error);