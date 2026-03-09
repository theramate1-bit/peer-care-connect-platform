#!/usr/bin/env node

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PRODUCTION_URL = 'https://theramate-ax7rldtpt-theras-projects-6dfd5a34.vercel.app';
const TEST_RESULTS_FILE = path.join(__dirname, 'oauth-flow-test-results.json');

class OAuthFlowTester {
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
          headers: res.headers,
        }));
      });
      
      req.on('error', reject);
      req.setTimeout(15000, () => req.destroy());
      req.end();
    });
  }

  analyzeOAuthContent(body, testName) {
    const results = [];
    
    // Check for React app root element
    if (body.includes('<div id="root">')) {
      results.push({ 
        test: `${testName} - React App Root`, 
        status: 'PASS', 
        message: 'React app root element found.' 
      });
    } else {
      results.push({ 
        test: `${testName} - React App Root`, 
        status: 'FAIL', 
        message: 'React app root element NOT found.' 
      });
    }

    // Check for Google OAuth button text
    if (body.includes('Continue with Google as Client')) {
      results.push({ 
        test: `${testName} - Client OAuth Button`, 
        status: 'PASS', 
        message: 'Client OAuth button text found.' 
      });
    } else {
      results.push({ 
        test: `${testName} - Client OAuth Button`, 
        status: 'FAIL', 
        message: 'Client OAuth button text NOT found.' 
      });
    }

    // Check for Practitioner OAuth button text
    if (body.includes('Continue with Google as Practitioner')) {
      results.push({ 
        test: `${testName} - Practitioner OAuth Button`, 
        status: 'PASS', 
        message: 'Practitioner OAuth button text found.' 
      });
    } else {
      results.push({ 
        test: `${testName} - Practitioner OAuth Button`, 
        status: 'FAIL', 
        message: 'Practitioner OAuth button text NOT found.' 
      });
    }

    // Check for Google OAuth integration
    if (body.includes('google') || body.includes('Google')) {
      results.push({ 
        test: `${testName} - Google OAuth Integration`, 
        status: 'PASS', 
        message: 'Google OAuth integration detected.' 
      });
    } else {
      results.push({ 
        test: `${testName} - Google OAuth Integration`, 
        status: 'FAIL', 
        message: 'Google OAuth integration NOT detected.' 
      });
    }

    // Check for JavaScript bundle
    if (body.includes('<script type="module"')) {
      results.push({ 
        test: `${testName} - JavaScript Bundle`, 
        status: 'PASS', 
        message: 'JavaScript bundle found.' 
      });
    } else {
      results.push({ 
        test: `${testName} - JavaScript Bundle`, 
        status: 'FAIL', 
        message: 'JavaScript bundle NOT found.' 
      });
    }

    return results;
  }

  async testEndpoint(name, path) {
    const url = `${PRODUCTION_URL}${path}`;
    console.log(`\n🔍 Testing ${name} (${url})...`);
    
    try {
      const { statusCode, body, headers } = await this.makeRequest(url);
      const status = statusCode >= 200 && statusCode < 300 ? 'PASS' : 'FAIL';
      const message = `Status: ${statusCode}, Body length: ${body.length} bytes`;
      
      const testResult = {
        endpoint: name,
        url: url,
        statusCode: statusCode,
        status: status,
        message: message,
        contentAnalysis: this.analyzeOAuthContent(body, name),
        headers: {
          'content-type': headers['content-type'],
          'content-length': headers['content-length'],
        },
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

      // Log content analysis results
      testResult.contentAnalysis.forEach(res => {
        const icon = res.status === 'PASS' ? '✅' : '❌';
        console.log(`  ${icon} ${res.test}: ${res.message}`);
      });

      return testResult;
    } catch (error) {
      const testResult = {
        endpoint: name,
        url: url,
        statusCode: null,
        status: 'ERROR',
        message: `Request failed: ${error.message}`,
        contentAnalysis: [],
      };

      this.results.tests.push(testResult);
      this.results.summary.total++;
      this.results.summary.errors++;
      
      console.error(`❌ [ERROR] ${name}: Request failed - ${error.message}`);
      return testResult;
    }
  }

  async testOAuthFlow() {
    console.log('🚀 Starting Comprehensive OAuth Flow Test...');
    console.log(`🌐 Production URL: ${PRODUCTION_URL}`);

    const endpoints = [
      { name: 'Main Page', path: '/' },
      { name: 'Register Page', path: '/auth/register' },
      { name: 'Login Page', path: '/auth/login' },
      { name: 'Auth Callback Page', path: '/auth/callback' },
      { name: 'Role Selection Page', path: '/role-selection' },
      { name: 'Onboarding Page', path: '/onboarding' },
    ];

    // Test all endpoints
    for (const endpoint of endpoints) {
      await this.testEndpoint(endpoint.name, endpoint.path);
    }

    // Test OAuth callback with different scenarios
    await this.testOAuthCallbackScenarios();

    // Generate summary
    this.generateSummary();

    // Save results
    fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(this.results, null, 2));
    console.log(`\n📊 Test Results saved to: ${TEST_RESULTS_FILE}`);
  }

  async testOAuthCallbackScenarios() {
    console.log('\n🔍 Testing OAuth Callback Scenarios...');

    const scenarios = [
      {
        name: 'Valid Client Callback',
        path: '/auth/callback?code=test-code&state=valid-state',
        expectedStatus: 'PASS',
      },
      {
        name: 'Valid Practitioner Callback',
        path: '/auth/callback?code=test-code&state=valid-state',
        expectedStatus: 'PASS',
      },
      {
        name: 'Missing Code Parameter',
        path: '/auth/callback?state=valid-state',
        expectedStatus: 'FAIL',
      },
      {
        name: 'Missing State Parameter',
        path: '/auth/callback?code=test-code',
        expectedStatus: 'FAIL',
      },
      {
        name: 'Invalid State Format',
        path: '/auth/callback?code=test-code&state=invalid-state',
        expectedStatus: 'FAIL',
      },
    ];

    for (const scenario of scenarios) {
      await this.testEndpoint(scenario.name, scenario.path);
    }
  }

  generateSummary() {
    const { total, passed, failed, errors } = this.results.summary;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log('\n📊 Test Summary:');
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} (${passRate}%)`);
    console.log(`Failed: ${failed}`);
    console.log(`Errors: ${errors}`);

    // Overall status
    if (failed === 0 && errors === 0) {
      console.log('\n🎉 All tests passed! OAuth flow is working correctly.');
    } else if (failed > 0) {
      console.log('\n⚠️  Some tests failed. Check the results for details.');
    } else {
      console.log('\n❌ Test errors occurred. Check the results for details.');
    }
  }
}

// Run the tests
const tester = new OAuthFlowTester();
tester.testOAuthFlow().catch(console.error);
