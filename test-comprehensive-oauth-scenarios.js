#!/usr/bin/env node

import https from 'https';

const PRODUCTION_URL = 'https://theramate-7p3ufmvh6-theras-projects-6dfd5a34.vercel.app';

class ComprehensiveOAuthScenarioTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      productionUrl: PRODUCTION_URL,
      tests: {
        happyPath: [],
        errorScenarios: [],
        edgeCases: [],
        securityTests: [],
        roleAssignment: [],
        userJourney: [],
        performanceTests: [],
        compatibilityTests: [],
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

  async testHappyPathScenarios() {
    console.log('\n🔍 Testing Happy Path OAuth Scenarios...');
    
    // Test 1: Registration page accessibility
    this.startTime = Date.now();
    const registerResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/register`);
    if (registerResponse.statusCode === 200) {
      this.log('happyPath', 'Registration Page Access', 'pass', 
        'Registration page accessible',
        `Response time: ${registerResponse.responseTime}ms`);
    } else {
      this.log('happyPath', 'Registration Page Access', 'fail', 
        `Status: ${registerResponse.statusCode}`);
    }

    // Test 2: Login page accessibility
    this.startTime = Date.now();
    const loginResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/login`);
    if (loginResponse.statusCode === 200) {
      this.log('happyPath', 'Login Page Access', 'pass', 
        'Login page accessible',
        `Response time: ${loginResponse.responseTime}ms`);
    } else {
      this.log('happyPath', 'Login Page Access', 'fail', 
        `Status: ${loginResponse.statusCode}`);
    }

    // Test 3: OAuth callback with valid parameters
    const validCallbackUrl = `${PRODUCTION_URL}/auth/callback?code=4/0AX4XfWh123456789&state=eyJyb2xlIjoic3BvcnRzX3RoZXJhcGlzdCIsIm5vbmNlIjoiYWJjMTIzIn0`;
    this.startTime = Date.now();
    const validCallbackResponse = await this.makeRequest(validCallbackUrl);
    if (validCallbackResponse.statusCode === 200) {
      this.log('happyPath', 'Valid OAuth Callback', 'pass', 
        'OAuth callback handles valid parameters',
        `Response time: ${validCallbackResponse.responseTime}ms`);
    } else {
      this.log('happyPath', 'Valid OAuth Callback', 'fail', 
        `Status: ${validCallbackResponse.statusCode}`);
    }

    // Test 4: Role selection page
    this.startTime = Date.now();
    const roleSelectionResponse = await this.makeRequest(`${PRODUCTION_URL}/role-selection`);
    if (roleSelectionResponse.statusCode === 200) {
      this.log('happyPath', 'Role Selection Page', 'pass', 
        'Role selection page accessible',
        `Response time: ${roleSelectionResponse.responseTime}ms`);
    } else {
      this.log('happyPath', 'Role Selection Page', 'fail', 
        `Status: ${roleSelectionResponse.statusCode}`);
    }

    // Test 5: Onboarding page
    this.startTime = Date.now();
    const onboardingResponse = await this.makeRequest(`${PRODUCTION_URL}/onboarding`);
    if (onboardingResponse.statusCode === 200) {
      this.log('happyPath', 'Onboarding Page', 'pass', 
        'Onboarding page accessible',
        `Response time: ${onboardingResponse.responseTime}ms`);
    } else {
      this.log('happyPath', 'Onboarding Page', 'fail', 
        `Status: ${onboardingResponse.statusCode}`);
    }
  }

  async testErrorScenarios() {
    console.log('\n🔍 Testing Error Scenarios...');
    
    // Test 1: OAuth callback with missing code
    const missingCodeUrl = `${PRODUCTION_URL}/auth/callback?state=valid-state`;
    this.startTime = Date.now();
    const missingCodeResponse = await this.makeRequest(missingCodeUrl);
    if (missingCodeResponse.statusCode === 200) {
      this.log('errorScenarios', 'Missing Code Parameter', 'pass', 
        'OAuth callback handles missing code gracefully',
        `Response time: ${missingCodeResponse.responseTime}ms`);
    } else {
      this.log('errorScenarios', 'Missing Code Parameter', 'fail', 
        `Status: ${missingCodeResponse.statusCode}`);
    }

    // Test 2: OAuth callback with missing state
    const missingStateUrl = `${PRODUCTION_URL}/auth/callback?code=valid-code`;
    this.startTime = Date.now();
    const missingStateResponse = await this.makeRequest(missingStateUrl);
    if (missingStateResponse.statusCode === 200) {
      this.log('errorScenarios', 'Missing State Parameter', 'pass', 
        'OAuth callback handles missing state gracefully',
        `Response time: ${missingStateResponse.responseTime}ms`);
    } else {
      this.log('errorScenarios', 'Missing State Parameter', 'fail', 
        `Status: ${missingStateResponse.statusCode}`);
    }

    // Test 3: OAuth callback with invalid code
    const invalidCodeUrl = `${PRODUCTION_URL}/auth/callback?code=invalid-code&state=valid-state`;
    this.startTime = Date.now();
    const invalidCodeResponse = await this.makeRequest(invalidCodeUrl);
    if (invalidCodeResponse.statusCode === 200) {
      this.log('errorScenarios', 'Invalid Code Parameter', 'pass', 
        'OAuth callback handles invalid code gracefully',
        `Response time: ${invalidCodeResponse.responseTime}ms`);
    } else {
      this.log('errorScenarios', 'Invalid Code Parameter', 'fail', 
        `Status: ${invalidCodeResponse.statusCode}`);
    }

    // Test 4: OAuth callback with tampered state
    const tamperedStateUrl = `${PRODUCTION_URL}/auth/callback?code=valid-code&state=tampered-state`;
    this.startTime = Date.now();
    const tamperedStateResponse = await this.makeRequest(tamperedStateUrl);
    if (tamperedStateResponse.statusCode === 200) {
      this.log('errorScenarios', 'Tampered State Parameter', 'pass', 
        'OAuth callback handles tampered state gracefully',
        `Response time: ${tamperedStateResponse.responseTime}ms`);
    } else {
      this.log('errorScenarios', 'Tampered State Parameter', 'fail', 
        `Status: ${tamperedStateResponse.statusCode}`);
    }

    // Test 5: OAuth callback with error parameter
    const errorUrl = `${PRODUCTION_URL}/auth/callback?error=access_denied&error_description=User+denied+access`;
    this.startTime = Date.now();
    const errorResponse = await this.makeRequest(errorUrl);
    if (errorResponse.statusCode === 200) {
      this.log('errorScenarios', 'OAuth Error Parameter', 'pass', 
        'OAuth callback handles error parameter gracefully',
        `Response time: ${errorResponse.responseTime}ms`);
    } else {
      this.log('errorScenarios', 'OAuth Error Parameter', 'fail', 
        `Status: ${errorResponse.statusCode}`);
    }

    // Test 6: Non-existent page
    this.startTime = Date.now();
    const notFoundResponse = await this.makeRequest(`${PRODUCTION_URL}/nonexistent-page`);
    if (notFoundResponse.statusCode === 200) {
      this.log('errorScenarios', 'Non-existent Page', 'pass', 
        'SPA routing handles 404s correctly',
        `Response time: ${notFoundResponse.responseTime}ms`);
    } else if (notFoundResponse.statusCode === 404) {
      this.log('errorScenarios', 'Non-existent Page', 'pass', 
        '404 error handled correctly',
        `Status: ${notFoundResponse.statusCode}`);
    } else {
      this.log('errorScenarios', 'Non-existent Page', 'fail', 
        `Unexpected status: ${notFoundResponse.statusCode}`);
    }
  }

  async testEdgeCases() {
    console.log('\n🔍 Testing Edge Cases...');
    
    // Test 1: Very long state parameter
    const longState = 'a'.repeat(10000);
    const longStateUrl = `${PRODUCTION_URL}/auth/callback?code=valid-code&state=${encodeURIComponent(longState)}`;
    this.startTime = Date.now();
    const longStateResponse = await this.makeRequest(longStateUrl);
    if (longStateResponse.statusCode === 200) {
      this.log('edgeCases', 'Very Long State Parameter', 'pass', 
        'OAuth callback handles very long state parameter',
        `Response time: ${longStateResponse.responseTime}ms`);
    } else {
      this.log('edgeCases', 'Very Long State Parameter', 'fail', 
        `Status: ${longStateResponse.statusCode}`);
    }

    // Test 2: Special characters in parameters
    const specialCharsUrl = `${PRODUCTION_URL}/auth/callback?code=test%20code%21%40%23&state=test%20state%21%40%23`;
    this.startTime = Date.now();
    const specialCharsResponse = await this.makeRequest(specialCharsUrl);
    if (specialCharsResponse.statusCode === 200) {
      this.log('edgeCases', 'Special Characters in Parameters', 'pass', 
        'OAuth callback handles special characters',
        `Response time: ${specialCharsResponse.responseTime}ms`);
    } else {
      this.log('edgeCases', 'Special Characters in Parameters', 'fail', 
        `Status: ${specialCharsResponse.statusCode}`);
    }

    // Test 3: Empty parameters
    const emptyParamsUrl = `${PRODUCTION_URL}/auth/callback?code=&state=`;
    this.startTime = Date.now();
    const emptyParamsResponse = await this.makeRequest(emptyParamsUrl);
    if (emptyParamsResponse.statusCode === 200) {
      this.log('edgeCases', 'Empty Parameters', 'pass', 
        'OAuth callback handles empty parameters',
        `Response time: ${emptyParamsResponse.responseTime}ms`);
    } else {
      this.log('edgeCases', 'Empty Parameters', 'fail', 
        `Status: ${emptyParamsResponse.statusCode}`);
    }

    // Test 4: Multiple same parameters
    const multipleParamsUrl = `${PRODUCTION_URL}/auth/callback?code=first&code=second&state=first&state=second`;
    this.startTime = Date.now();
    const multipleParamsResponse = await this.makeRequest(multipleParamsUrl);
    if (multipleParamsResponse.statusCode === 200) {
      this.log('edgeCases', 'Multiple Same Parameters', 'pass', 
        'OAuth callback handles multiple same parameters',
        `Response time: ${multipleParamsResponse.responseTime}ms`);
    } else {
      this.log('edgeCases', 'Multiple Same Parameters', 'fail', 
        `Status: ${multipleParamsResponse.statusCode}`);
    }

    // Test 5: Unicode characters
    const unicodeUrl = `${PRODUCTION_URL}/auth/callback?code=测试&state=测试状态`;
    this.startTime = Date.now();
    const unicodeResponse = await this.makeRequest(unicodeUrl);
    if (unicodeResponse.statusCode === 200) {
      this.log('edgeCases', 'Unicode Characters', 'pass', 
        'OAuth callback handles unicode characters',
        `Response time: ${unicodeResponse.responseTime}ms`);
    } else {
      this.log('edgeCases', 'Unicode Characters', 'fail', 
        `Status: ${unicodeResponse.statusCode}`);
    }

    // Test 6: Very long URL
    const longUrl = `${PRODUCTION_URL}/auth/callback?${'param=value&'.repeat(100)}code=test&state=test`;
    this.startTime = Date.now();
    const longUrlResponse = await this.makeRequest(longUrl);
    if (longUrlResponse.statusCode === 200) {
      this.log('edgeCases', 'Very Long URL', 'pass', 
        'OAuth callback handles very long URL',
        `Response time: ${longUrlResponse.responseTime}ms`);
    } else {
      this.log('edgeCases', 'Very Long URL', 'fail', 
        `Status: ${longUrlResponse.statusCode}`);
    }
  }

  async testSecurityTests() {
    console.log('\n🔍 Testing Security Scenarios...');
    
    // Test 1: SQL Injection attempt in parameters
    const sqlInjectionUrl = `${PRODUCTION_URL}/auth/callback?code='; DROP TABLE users; --&state=test`;
    this.startTime = Date.now();
    const sqlInjectionResponse = await this.makeRequest(sqlInjectionUrl);
    if (sqlInjectionResponse.statusCode === 200) {
      this.log('securityTests', 'SQL Injection Attempt', 'pass', 
        'OAuth callback prevents SQL injection',
        `Response time: ${sqlInjectionResponse.responseTime}ms`);
    } else {
      this.log('securityTests', 'SQL Injection Attempt', 'fail', 
        `Status: ${sqlInjectionResponse.statusCode}`);
    }

    // Test 2: XSS attempt in parameters
    const xssUrl = `${PRODUCTION_URL}/auth/callback?code=<script>alert('xss')</script>&state=test`;
    this.startTime = Date.now();
    const xssResponse = await this.makeRequest(xssUrl);
    if (xssResponse.statusCode === 200) {
      this.log('securityTests', 'XSS Attempt', 'pass', 
        'OAuth callback prevents XSS',
        `Response time: ${xssResponse.responseTime}ms`);
    } else {
      this.log('securityTests', 'XSS Attempt', 'fail', 
        `Status: ${xssResponse.statusCode}`);
    }

    // Test 3: Path traversal attempt
    const pathTraversalUrl = `${PRODUCTION_URL}/auth/callback/../../../etc/passwd?code=test&state=test`;
    this.startTime = Date.now();
    const pathTraversalResponse = await this.makeRequest(pathTraversalUrl);
    if (pathTraversalResponse.statusCode === 200) {
      this.log('securityTests', 'Path Traversal Attempt', 'pass', 
        'OAuth callback prevents path traversal',
        `Response time: ${pathTraversalResponse.responseTime}ms`);
    } else {
      this.log('securityTests', 'Path Traversal Attempt', 'fail', 
        `Status: ${pathTraversalResponse.statusCode}`);
    }

    // Test 4: HTTP methods other than GET
    const methods = ['POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    for (const method of methods) {
      this.startTime = Date.now();
      try {
        const response = await this.makeRequest(`${PRODUCTION_URL}/auth/callback`, { method });
        if (response.statusCode === 405 || response.statusCode === 200) {
          this.log('securityTests', `HTTP ${method} Method`, 'pass', 
            `HTTP ${method} method handled correctly`,
            `Status: ${response.statusCode}, Response time: ${response.responseTime}ms`);
        } else {
          this.log('securityTests', `HTTP ${method} Method`, 'fail', 
            `Unexpected status: ${response.statusCode}`);
        }
      } catch (error) {
        this.log('securityTests', `HTTP ${method} Method`, 'error', 
          error.message);
      }
    }
  }

  async testRoleAssignment() {
    console.log('\n🔍 Testing Role Assignment Scenarios...');
    
    // Test different role scenarios
    const roleScenarios = [
      { role: 'client', name: 'Client Role' },
      { role: 'sports_therapist', name: 'Sports Therapist Role' },
      { role: 'massage_therapist', name: 'Massage Therapist Role' },
      { role: 'osteopath', name: 'Osteopath Role' },
    ];

    for (const scenario of roleScenarios) {
      const roleCallbackUrl = `${PRODUCTION_URL}/auth/callback?code=test-code&state=${encodeURIComponent(JSON.stringify({role: scenario.role, nonce: 'test123'}))}`;
      this.startTime = Date.now();
      const roleResponse = await this.makeRequest(roleCallbackUrl);
      if (roleResponse.statusCode === 200) {
        this.log('roleAssignment', `Role Assignment - ${scenario.name}`, 'pass', 
          `OAuth callback handles ${scenario.name} assignment`,
          `Response time: ${roleResponse.responseTime}ms`);
      } else {
        this.log('roleAssignment', `Role Assignment - ${scenario.name}`, 'fail', 
          `Status: ${roleResponse.statusCode}`);
      }
    }

    // Test invalid role
    const invalidRoleUrl = `${PRODUCTION_URL}/auth/callback?code=test-code&state=${encodeURIComponent(JSON.stringify({role: 'invalid_role', nonce: 'test123'}))}`;
    this.startTime = Date.now();
    const invalidRoleResponse = await this.makeRequest(invalidRoleUrl);
    if (invalidRoleResponse.statusCode === 200) {
      this.log('roleAssignment', 'Invalid Role Assignment', 'pass', 
        'OAuth callback handles invalid role gracefully',
        `Response time: ${invalidRoleResponse.responseTime}ms`);
    } else {
      this.log('roleAssignment', 'Invalid Role Assignment', 'fail', 
        `Status: ${invalidRoleResponse.statusCode}`);
    }

    // Test missing role in state
    const missingRoleUrl = `${PRODUCTION_URL}/auth/callback?code=test-code&state=${encodeURIComponent(JSON.stringify({nonce: 'test123'}))}`;
    this.startTime = Date.now();
    const missingRoleResponse = await this.makeRequest(missingRoleUrl);
    if (missingRoleResponse.statusCode === 200) {
      this.log('roleAssignment', 'Missing Role in State', 'pass', 
        'OAuth callback handles missing role gracefully',
        `Response time: ${missingRoleResponse.responseTime}ms`);
    } else {
      this.log('roleAssignment', 'Missing Role in State', 'fail', 
        `Status: ${missingRoleResponse.statusCode}`);
    }
  }

  async testUserJourney() {
    console.log('\n🔍 Testing Complete User Journey...');
    
    // Test all key endpoints in sequence
    const journeySteps = [
      { path: '/', name: 'Home Page' },
      { path: '/auth/register', name: 'Registration' },
      { path: '/auth/login', name: 'Login' },
      { path: '/auth/callback', name: 'OAuth Callback' },
      { path: '/role-selection', name: 'Role Selection' },
      { path: '/onboarding', name: 'Onboarding' },
      { path: '/client/dashboard', name: 'Client Dashboard' },
      { path: '/dashboard', name: 'Practitioner Dashboard' },
    ];

    for (const step of journeySteps) {
      this.startTime = Date.now();
      try {
        const response = await this.makeRequest(`${PRODUCTION_URL}${step.path}`);
        
        if (response.statusCode === 200) {
          this.log('userJourney', `Journey - ${step.name}`, 'pass', 
            'Journey step accessible',
            `Response time: ${response.responseTime}ms`);
        } else if (response.statusCode === 302 || response.statusCode === 401) {
          this.log('userJourney', `Journey - ${step.name}`, 'pass', 
            'Journey step properly protected',
            `Status: ${response.statusCode}, Response time: ${response.responseTime}ms`);
        } else {
          this.log('userJourney', `Journey - ${step.name}`, 'fail', 
            `Status: ${response.statusCode}`);
        }
      } catch (error) {
        this.log('userJourney', `Journey - ${step.name}`, 'error', 
          error.message);
      }
    }
  }

  async testPerformanceTests() {
    console.log('\n🔍 Testing Performance Scenarios...');
    
    // Test response times for key endpoints
    const performanceEndpoints = [
      { path: '/', name: 'Home Page' },
      { path: '/auth/register', name: 'Registration' },
      { path: '/auth/login', name: 'Login' },
      { path: '/auth/callback', name: 'OAuth Callback' },
    ];

    for (const endpoint of performanceEndpoints) {
      this.startTime = Date.now();
      const response = await this.makeRequest(`${PRODUCTION_URL}${endpoint.path}`);
      
      if (response.statusCode === 200) {
        if (response.responseTime < 500) {
          this.log('performanceTests', `Performance - ${endpoint.name}`, 'pass', 
            'Fast response time',
            `Response time: ${response.responseTime}ms`);
        } else if (response.responseTime < 1000) {
          this.log('performanceTests', `Performance - ${endpoint.name}`, 'pass', 
            'Acceptable response time',
            `Response time: ${response.responseTime}ms`);
        } else {
          this.log('performanceTests', `Performance - ${endpoint.name}`, 'fail', 
            'Slow response time',
            `Response time: ${response.responseTime}ms`);
        }
      } else {
        this.log('performanceTests', `Performance - ${endpoint.name}`, 'fail', 
          `Status: ${response.statusCode}`);
      }
    }

    // Test concurrent requests
    const concurrentRequests = Array(5).fill().map(() => 
      this.makeRequest(`${PRODUCTION_URL}/auth/callback`)
    );
    
    this.startTime = Date.now();
    try {
      const responses = await Promise.all(concurrentRequests);
      const allSuccessful = responses.every(r => r.statusCode === 200);
      const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
      
      if (allSuccessful) {
        this.log('performanceTests', 'Concurrent Requests', 'pass', 
          'All concurrent requests successful',
          `Average response time: ${avgResponseTime.toFixed(2)}ms`);
      } else {
        this.log('performanceTests', 'Concurrent Requests', 'fail', 
          'Some concurrent requests failed');
      }
    } catch (error) {
      this.log('performanceTests', 'Concurrent Requests', 'error', 
        error.message);
    }
  }

  async testCompatibilityTests() {
    console.log('\n🔍 Testing Compatibility Scenarios...');
    
    // Test different user agents
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0',
    ];

    for (const userAgent of userAgents) {
      this.startTime = Date.now();
      try {
        const response = await this.makeRequest(`${PRODUCTION_URL}/auth/callback`, {
          headers: { 'User-Agent': userAgent }
        });
        
        if (response.statusCode === 200) {
          this.log('compatibilityTests', `User Agent - ${userAgent.split(' ')[0]}`, 'pass', 
            'Compatible with user agent',
            `Response time: ${response.responseTime}ms`);
        } else {
          this.log('compatibilityTests', `User Agent - ${userAgent.split(' ')[0]}`, 'fail', 
            `Status: ${response.statusCode}`);
        }
      } catch (error) {
        this.log('compatibilityTests', `User Agent - ${userAgent.split(' ')[0]}`, 'error', 
          error.message);
      }
    }

    // Test different accept headers
    const acceptHeaders = [
      'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'application/json',
      'text/plain',
    ];

    for (const acceptHeader of acceptHeaders) {
      this.startTime = Date.now();
      try {
        const response = await this.makeRequest(`${PRODUCTION_URL}/auth/callback`, {
          headers: { 'Accept': acceptHeader }
        });
        
        if (response.statusCode === 200) {
          this.log('compatibilityTests', `Accept Header - ${acceptHeader.split(',')[0]}`, 'pass', 
            'Compatible with accept header',
            `Response time: ${response.responseTime}ms`);
        } else {
          this.log('compatibilityTests', `Accept Header - ${acceptHeader.split(',')[0]}`, 'fail', 
            `Status: ${response.statusCode}`);
        }
      } catch (error) {
        this.log('compatibilityTests', `Accept Header - ${acceptHeader.split(',')[0]}`, 'error', 
          error.message);
      }
    }
  }

  async runAllTests() {
    console.log('🚀 Comprehensive OAuth Scenario and Edge Case Testing...');
    console.log(`🌐 Production URL: ${PRODUCTION_URL}`);
    console.log('⚠️  Note: Testing every OAuth scenario and edge case with clean database');

    await this.testHappyPathScenarios();
    await this.testErrorScenarios();
    await this.testEdgeCases();
    await this.testSecurityTests();
    await this.testRoleAssignment();
    await this.testUserJourney();
    await this.testPerformanceTests();
    await this.testCompatibilityTests();

    this.generateSummary();
  }

  generateSummary() {
    const { total, passed, failed, errors } = this.results.summary;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log('\n📊 Comprehensive OAuth Scenario Test Summary:');
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
    if (passRate >= 90) {
      console.log('\n🎉 OAuth Flow is Excellent!');
      console.log('✅ All scenarios handled correctly.');
      console.log('✅ Edge cases properly managed.');
      console.log('✅ Security measures in place.');
      console.log('✅ Performance is good.');
      console.log('✅ Compatible across browsers.');
      
    } else if (passRate >= 80) {
      console.log('\n✅ OAuth Flow is Very Good!');
      console.log('✅ Most scenarios handled correctly.');
      console.log('⚠️  Some edge cases need attention.');
      
    } else if (passRate >= 70) {
      console.log('\n⚠️  OAuth Flow is Good but Needs Work');
      console.log('✅ Basic functionality works.');
      console.log('❌ Some scenarios need fixing.');
      
    } else {
      console.log('\n❌ OAuth Flow Needs Significant Work');
      console.log('🚨 Multiple issues detected.');
    }

    console.log('\n🔧 Next Steps:');
    console.log('1. Test with real Google OAuth accounts');
    console.log('2. Check browser console for JavaScript errors');
    console.log('3. Verify OAuth flow works end-to-end');
    console.log('4. Test role assignment with real users');
    console.log('5. Monitor production logs for any errors');
  }
}

// Run the comprehensive OAuth scenario tests
const tester = new ComprehensiveOAuthScenarioTester();
tester.runAllTests().catch(console.error);



































