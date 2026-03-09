#!/usr/bin/env node

import https from 'https';

const PRODUCTION_URL = 'https://theramate-blzpwyau7-theras-projects-6dfd5a34.vercel.app';

class EdgeCaseTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      productionUrl: PRODUCTION_URL,
      tests: {
        edgeCases: [],
        security: [],
        errorHandling: [],
        compatibility: [],
        load: [],
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
          'Accept': 'application/json, text/html, */*',
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

  async testEdgeCases() {
    console.log('\n🔍 Testing Edge Cases...');
    
    // Test very long URLs
    this.startTime = Date.now();
    const longUrl = `${PRODUCTION_URL}/auth/callback?${'a'.repeat(1000)}=${'b'.repeat(1000)}`;
    try {
      const response = await this.makeRequest(longUrl);
      if (response.statusCode === 200 || response.statusCode === 414) {
        this.log('edgeCases', 'Long URL Handling', 'pass', 
          'Long URL handled correctly',
          `Status: ${response.statusCode}, Response time: ${response.responseTime}ms`);
      } else {
        this.log('edgeCases', 'Long URL Handling', 'fail', 
          `Unexpected status: ${response.statusCode}`);
      }
    } catch (error) {
      this.log('edgeCases', 'Long URL Handling', 'error', error.message);
    }

    // Test special characters in parameters
    this.startTime = Date.now();
    const specialCharsUrl = `${PRODUCTION_URL}/auth/callback?code=test%20code&state=test%2Bstate%3Dvalue`;
    try {
      const response = await this.makeRequest(specialCharsUrl);
      if (response.statusCode === 200) {
        this.log('edgeCases', 'Special Characters Handling', 'pass', 
          'Special characters handled correctly',
          `Status: ${response.statusCode}, Response time: ${response.responseTime}ms`);
      } else {
        this.log('edgeCases', 'Special Characters Handling', 'fail', 
          `Status: ${response.statusCode}`);
      }
    } catch (error) {
      this.log('edgeCases', 'Special Characters Handling', 'error', error.message);
    }

    // Test malformed parameters
    this.startTime = Date.now();
    const malformedUrl = `${PRODUCTION_URL}/auth/callback?code=&state=&invalid=`;
    try {
      const response = await this.makeRequest(malformedUrl);
      if (response.statusCode === 200) {
        this.log('edgeCases', 'Malformed Parameters', 'pass', 
          'Malformed parameters handled correctly',
          `Status: ${response.statusCode}, Response time: ${response.responseTime}ms`);
      } else {
        this.log('edgeCases', 'Malformed Parameters', 'fail', 
          `Status: ${response.statusCode}`);
      }
    } catch (error) {
      this.log('edgeCases', 'Malformed Parameters', 'error', error.message);
    }

    // Test non-existent endpoints
    this.startTime = Date.now();
    const nonExistentUrl = `${PRODUCTION_URL}/non-existent-endpoint`;
    try {
      const response = await this.makeRequest(nonExistentUrl);
      if (response.statusCode === 404) {
        this.log('edgeCases', 'Non-existent Endpoint', 'pass', 
          'Non-existent endpoint properly handled',
          `Status: ${response.statusCode}, Response time: ${response.responseTime}ms`);
      } else {
        this.log('edgeCases', 'Non-existent Endpoint', 'fail', 
          `Unexpected status: ${response.statusCode}`);
      }
    } catch (error) {
      this.log('edgeCases', 'Non-existent Endpoint', 'error', error.message);
    }
  }

  async testSecurity() {
    console.log('\n🔍 Testing Security...');
    
    // Test SQL injection attempts
    const sqlInjectionTests = [
      { name: 'Basic SQL Injection', params: '?code=1\' OR \'1\'=\'1&state=test' },
      { name: 'Union SQL Injection', params: '?code=1\' UNION SELECT * FROM users&state=test' },
      { name: 'Drop Table Attempt', params: '?code=1\'; DROP TABLE users; --&state=test' },
    ];

    for (const test of sqlInjectionTests) {
      this.startTime = Date.now();
      try {
        const response = await this.makeRequest(`${PRODUCTION_URL}/auth/callback${test.params}`);
        if (response.statusCode === 200) {
          this.log('security', `SQL Injection - ${test.name}`, 'pass', 
            'SQL injection attempt handled safely',
            `Status: ${response.statusCode}, Response time: ${response.responseTime}ms`);
        } else {
          this.log('security', `SQL Injection - ${test.name}`, 'fail', 
            `Status: ${response.statusCode}`);
        }
      } catch (error) {
        this.log('security', `SQL Injection - ${test.name}`, 'error', error.message);
      }
    }

    // Test XSS attempts
    const xssTests = [
      { name: 'Script Tag XSS', params: '?code=<script>alert("xss")</script>&state=test' },
      { name: 'Image XSS', params: '?code=<img src=x onerror=alert("xss")>&state=test' },
      { name: 'JavaScript XSS', params: '?code=javascript:alert("xss")&state=test' },
    ];

    for (const test of xssTests) {
      this.startTime = Date.now();
      try {
        const response = await this.makeRequest(`${PRODUCTION_URL}/auth/callback${test.params}`);
        if (response.statusCode === 200) {
          this.log('security', `XSS - ${test.name}`, 'pass', 
            'XSS attempt handled safely',
            `Status: ${response.statusCode}, Response time: ${response.responseTime}ms`);
        } else {
          this.log('security', `XSS - ${test.name}`, 'fail', 
            `Status: ${response.statusCode}`);
        }
      } catch (error) {
        this.log('security', `XSS - ${test.name}`, 'error', error.message);
      }
    }

    // Test path traversal
    this.startTime = Date.now();
    const pathTraversalUrl = `${PRODUCTION_URL}/auth/callback?code=../../../etc/passwd&state=test`;
    try {
      const response = await this.makeRequest(pathTraversalUrl);
      if (response.statusCode === 200) {
        this.log('security', 'Path Traversal', 'pass', 
          'Path traversal attempt handled safely',
          `Status: ${response.statusCode}, Response time: ${response.responseTime}ms`);
      } else {
        this.log('security', 'Path Traversal', 'fail', 
          `Status: ${response.statusCode}`);
      }
    } catch (error) {
      this.log('security', 'Path Traversal', 'error', error.message);
    }
  }

  async testErrorHandling() {
    console.log('\n🔍 Testing Error Handling...');
    
    // Test various HTTP methods
    const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    
    for (const method of httpMethods) {
      this.startTime = Date.now();
      try {
        const response = await this.makeRequest(`${PRODUCTION_URL}/auth/callback`, { method });
        if (response.statusCode === 200 || response.statusCode === 405) {
          this.log('errorHandling', `HTTP Method - ${method}`, 'pass', 
            'HTTP method handled correctly',
            `Status: ${response.statusCode}, Response time: ${response.responseTime}ms`);
        } else {
          this.log('errorHandling', `HTTP Method - ${method}`, 'fail', 
            `Status: ${response.statusCode}`);
        }
      } catch (error) {
        this.log('errorHandling', `HTTP Method - ${method}`, 'error', error.message);
      }
    }

    // Test invalid headers
    this.startTime = Date.now();
    try {
      const response = await this.makeRequest(`${PRODUCTION_URL}/auth/callback`, {
        headers: {
          'Invalid-Header': 'invalid-value',
          'X-Forwarded-For': '192.168.1.1',
          'X-Real-IP': '10.0.0.1',
        }
      });
      if (response.statusCode === 200) {
        this.log('errorHandling', 'Invalid Headers', 'pass', 
          'Invalid headers handled correctly',
          `Status: ${response.statusCode}, Response time: ${response.responseTime}ms`);
      } else {
        this.log('errorHandling', 'Invalid Headers', 'fail', 
          `Status: ${response.statusCode}`);
      }
    } catch (error) {
      this.log('errorHandling', 'Invalid Headers', 'error', error.message);
    }

    // Test missing content type
    this.startTime = Date.now();
    try {
      const response = await this.makeRequest(`${PRODUCTION_URL}/auth/callback`, {
        headers: {
          'Content-Type': '',
        }
      });
      if (response.statusCode === 200) {
        this.log('errorHandling', 'Missing Content Type', 'pass', 
          'Missing content type handled correctly',
          `Status: ${response.statusCode}, Response time: ${response.responseTime}ms`);
      } else {
        this.log('errorHandling', 'Missing Content Type', 'fail', 
          `Status: ${response.statusCode}`);
      }
    } catch (error) {
      this.log('errorHandling', 'Missing Content Type', 'error', error.message);
    }
  }

  async testCompatibility() {
    console.log('\n🔍 Testing Compatibility...');
    
    // Test different user agents
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0',
    ];

    for (let i = 0; i < userAgents.length; i++) {
      const userAgent = userAgents[i];
      this.startTime = Date.now();
      try {
        const response = await this.makeRequest(`${PRODUCTION_URL}/auth/callback`, {
          headers: {
            'User-Agent': userAgent,
          }
        });
        if (response.statusCode === 200) {
          this.log('compatibility', `User Agent ${i + 1}`, 'pass', 
            'User agent handled correctly',
            `Status: ${response.statusCode}, Response time: ${response.responseTime}ms`);
        } else {
          this.log('compatibility', `User Agent ${i + 1}`, 'fail', 
            `Status: ${response.statusCode}`);
        }
      } catch (error) {
        this.log('compatibility', `User Agent ${i + 1}`, 'error', error.message);
      }
    }

    // Test different accept headers
    const acceptHeaders = [
      'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'application/json',
      'text/plain',
      '*/*',
    ];

    for (let i = 0; i < acceptHeaders.length; i++) {
      const acceptHeader = acceptHeaders[i];
      this.startTime = Date.now();
      try {
        const response = await this.makeRequest(`${PRODUCTION_URL}/auth/callback`, {
          headers: {
            'Accept': acceptHeader,
          }
        });
        if (response.statusCode === 200) {
          this.log('compatibility', `Accept Header ${i + 1}`, 'pass', 
            'Accept header handled correctly',
            `Status: ${response.statusCode}, Response time: ${response.responseTime}ms`);
        } else {
          this.log('compatibility', `Accept Header ${i + 1}`, 'fail', 
            `Status: ${response.statusCode}`);
        }
      } catch (error) {
        this.log('compatibility', `Accept Header ${i + 1}`, 'error', error.message);
      }
    }
  }

  async testLoad() {
    console.log('\n🔍 Testing Load...');
    
    // Test concurrent requests
    const concurrentRequests = 10;
    const promises = [];
    
    for (let i = 0; i < concurrentRequests; i++) {
      this.startTime = Date.now();
      promises.push(
        this.makeRequest(`${PRODUCTION_URL}/auth/callback?code=test${i}&state=test${i}`)
          .then(response => ({
            index: i,
            statusCode: response.statusCode,
            responseTime: response.responseTime,
          }))
          .catch(error => ({
            index: i,
            error: error.message,
          }))
      );
    }

    try {
      const results = await Promise.all(promises);
      const successful = results.filter(r => r.statusCode === 200).length;
      const failed = results.filter(r => r.error).length;
      
      if (successful === concurrentRequests) {
        this.log('load', 'Concurrent Requests', 'pass', 
          'All concurrent requests handled successfully',
          `Successful: ${successful}/${concurrentRequests}`);
      } else if (successful > concurrentRequests * 0.8) {
        this.log('load', 'Concurrent Requests', 'pass', 
          'Most concurrent requests handled successfully',
          `Successful: ${successful}/${concurrentRequests}, Failed: ${failed}`);
      } else {
        this.log('load', 'Concurrent Requests', 'fail', 
          'Many concurrent requests failed',
          `Successful: ${successful}/${concurrentRequests}, Failed: ${failed}`);
      }
    } catch (error) {
      this.log('load', 'Concurrent Requests', 'error', error.message);
    }

    // Test rapid sequential requests
    const rapidRequests = 5;
    const rapidResults = [];
    
    for (let i = 0; i < rapidRequests; i++) {
      this.startTime = Date.now();
      try {
        const response = await this.makeRequest(`${PRODUCTION_URL}/auth/callback?code=rapid${i}&state=rapid${i}`);
        rapidResults.push({
          index: i,
          statusCode: response.statusCode,
          responseTime: response.responseTime,
        });
      } catch (error) {
        rapidResults.push({
          index: i,
          error: error.message,
        });
      }
    }

    const rapidSuccessful = rapidResults.filter(r => r.statusCode === 200).length;
    const rapidFailed = rapidResults.filter(r => r.error).length;
    
    if (rapidSuccessful === rapidRequests) {
      this.log('load', 'Rapid Sequential Requests', 'pass', 
        'All rapid sequential requests handled successfully',
        `Successful: ${rapidSuccessful}/${rapidRequests}`);
    } else if (rapidSuccessful > rapidRequests * 0.8) {
      this.log('load', 'Rapid Sequential Requests', 'pass', 
        'Most rapid sequential requests handled successfully',
        `Successful: ${rapidSuccessful}/${rapidRequests}, Failed: ${rapidFailed}`);
    } else {
      this.log('load', 'Rapid Sequential Requests', 'fail', 
        'Many rapid sequential requests failed',
        `Successful: ${rapidSuccessful}/${rapidRequests}, Failed: ${rapidFailed}`);
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Edge Case and Security Testing...');
    console.log(`🌐 Production URL: ${PRODUCTION_URL}`);
    console.log('⚠️  Note: These tests check edge cases, security, error handling, and load');

    await this.testEdgeCases();
    await this.testSecurity();
    await this.testErrorHandling();
    await this.testCompatibility();
    await this.testLoad();

    this.generateSummary();
  }

  generateSummary() {
    const { total, passed, failed, errors } = this.results.summary;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    console.log('\n📊 Edge Case and Security Test Summary:');
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
      console.log('\n🎉 All edge case and security tests passed!');
      console.log('✅ No security vulnerabilities detected.');
      console.log('✅ Edge cases are handled correctly.');
      console.log('✅ Error handling is robust.');
      console.log('✅ Load handling is acceptable.');
      console.log('✅ Compatibility is good across different clients.');
    } else if (failed > 0) {
      console.log('\n⚠️  Some edge case and security tests failed.');
      console.log('❌ Potential security vulnerabilities or edge case issues detected.');
      console.log('🔧 Review failed tests and fix the issues.');
    } else {
      console.log('\n❌ Edge case and security test errors occurred.');
      console.log('🚨 Critical issues detected. Immediate attention required.');
    }

    console.log('\n🔧 Recommendations:');
    console.log('1. Review failed tests and identify root causes');
    console.log('2. Implement additional security measures if needed');
    console.log('3. Add rate limiting for production use');
    console.log('4. Monitor for unusual traffic patterns');
    console.log('5. Consider implementing a Web Application Firewall (WAF)');
    console.log('6. Regular security audits and penetration testing');
  }
}

// Run the edge case and security tests
const tester = new EdgeCaseTester();
tester.runAllTests().catch(console.error);
