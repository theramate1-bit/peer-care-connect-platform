#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

class TestRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      testSuite: 'OAuth Flow Comprehensive Testing',
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: 0,
      },
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const icon = type === 'pass' ? '✅' : type === 'fail' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`${icon} [${timestamp}] ${message}`);
  }

  async runCommand(command, testName) {
    this.log(`Running ${testName}...`, 'info');
    
    try {
      const { stdout, stderr } = await execAsync(command, { 
        cwd: __dirname,
        timeout: 60000, // 60 seconds timeout
      });
      
      if (stderr && !stderr.includes('warning')) {
        this.log(`${testName} completed with warnings: ${stderr}`, 'warn');
      } else {
        this.log(`${testName} completed successfully`, 'pass');
      }
      
      return {
        name: testName,
        status: 'PASS',
        output: stdout,
        error: stderr,
      };
    } catch (error) {
      this.log(`${testName} failed: ${error.message}`, 'fail');
      return {
        name: testName,
        status: 'FAIL',
        output: error.stdout || '',
        error: error.stderr || error.message,
      };
    }
  }

  async runUnitTests() {
    this.log('🧪 Running Unit Tests...', 'info');
    
    try {
      const result = await this.runCommand('npm test', 'Unit Tests');
      this.results.tests.push(result);
      this.results.summary.total++;
      
      if (result.status === 'PASS') {
        this.results.summary.passed++;
      } else {
        this.results.summary.failed++;
      }
    } catch (error) {
      this.log(`Unit tests failed: ${error.message}`, 'fail');
      this.results.tests.push({
        name: 'Unit Tests',
        status: 'ERROR',
        output: '',
        error: error.message,
      });
      this.results.summary.total++;
      this.results.summary.errors++;
    }
  }

  async runIntegrationTests() {
    this.log('🔗 Running Integration Tests...', 'info');
    
    try {
      const result = await this.runCommand('npm test -- tests/integration', 'Integration Tests');
      this.results.tests.push(result);
      this.results.summary.total++;
      
      if (result.status === 'PASS') {
        this.results.summary.passed++;
      } else {
        this.results.summary.failed++;
      }
    } catch (error) {
      this.log(`Integration tests failed: ${error.message}`, 'fail');
      this.results.tests.push({
        name: 'Integration Tests',
        status: 'ERROR',
        output: '',
        error: error.message,
      });
      this.results.summary.total++;
      this.results.summary.errors++;
    }
  }

  async runE2ETests() {
    this.log('🌐 Running E2E Tests...', 'info');
    
    try {
      const result = await this.runCommand('npm run test:e2e', 'E2E Tests');
      this.results.tests.push(result);
      this.results.summary.total++;
      
      if (result.status === 'PASS') {
        this.results.summary.passed++;
      } else {
        this.results.summary.failed++;
      }
    } catch (error) {
      this.log(`E2E tests failed: ${error.message}`, 'fail');
      this.results.tests.push({
        name: 'E2E Tests',
        status: 'ERROR',
        output: '',
        error: error.message,
      });
      this.results.summary.total++;
      this.results.summary.errors++;
    }
  }

  async runOAuthButtonTests() {
    this.log('🔘 Running OAuth Button Tests...', 'info');
    
    try {
      const result = await this.runCommand('node test-oauth-buttons.js', 'OAuth Button Tests');
      this.results.tests.push(result);
      this.results.summary.total++;
      
      if (result.status === 'PASS') {
        this.results.summary.passed++;
      } else {
        this.results.summary.failed++;
      }
    } catch (error) {
      this.log(`OAuth button tests failed: ${error.message}`, 'fail');
      this.results.tests.push({
        name: 'OAuth Button Tests',
        status: 'ERROR',
        output: '',
        error: error.message,
      });
      this.results.summary.total++;
      this.results.summary.errors++;
    }
  }

  async runRoleManagerTests() {
    this.log('👤 Running RoleManager Tests...', 'info');
    
    try {
      const result = await this.runCommand('node test-role-manager.js', 'RoleManager Tests');
      this.results.tests.push(result);
      this.results.summary.total++;
      
      if (result.status === 'PASS') {
        this.results.summary.passed++;
      } else {
        this.results.summary.failed++;
      }
    } catch (error) {
      this.log(`RoleManager tests failed: ${error.message}`, 'fail');
      this.results.tests.push({
        name: 'RoleManager Tests',
        status: 'ERROR',
        output: '',
        error: error.message,
      });
      this.results.summary.total++;
      this.results.summary.errors++;
    }
  }

  async runComprehensiveOAuthTests() {
    this.log('🔍 Running Comprehensive OAuth Tests...', 'info');
    
    try {
      const result = await this.runCommand('node test-oauth-flow-comprehensive.js', 'Comprehensive OAuth Tests');
      this.results.tests.push(result);
      this.results.summary.total++;
      
      if (result.status === 'PASS') {
        this.results.summary.passed++;
      } else {
        this.results.summary.failed++;
      }
    } catch (error) {
      this.log(`Comprehensive OAuth tests failed: ${error.message}`, 'fail');
      this.results.tests.push({
        name: 'Comprehensive OAuth Tests',
        status: 'ERROR',
        output: '',
        error: error.message,
      });
      this.results.summary.total++;
      this.results.summary.errors++;
    }
  }

  async runLinting() {
    this.log('🔍 Running Linting...', 'info');
    
    try {
      const result = await this.runCommand('npm run lint', 'Linting');
      this.results.tests.push(result);
      this.results.summary.total++;
      
      if (result.status === 'PASS') {
        this.results.summary.passed++;
      } else {
        this.results.summary.failed++;
      }
    } catch (error) {
      this.log(`Linting failed: ${error.message}`, 'fail');
      this.results.tests.push({
        name: 'Linting',
        status: 'ERROR',
        output: '',
        error: error.message,
      });
      this.results.summary.total++;
      this.results.summary.errors++;
    }
  }

  generateSummary() {
    const { total, passed, failed, errors } = this.results.summary;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    this.log('\n📊 Test Suite Summary:', 'info');
    this.log(`Total Tests: ${total}`, 'info');
    this.log(`Passed: ${passed} (${passRate}%)`, 'pass');
    this.log(`Failed: ${failed}`, failed > 0 ? 'fail' : 'pass');
    this.log(`Errors: ${errors}`, errors > 0 ? 'fail' : 'pass');

    if (failed === 0 && errors === 0) {
      this.log('\n🎉 All tests passed! OAuth flow is working correctly.', 'pass');
    } else if (failed > 0) {
      this.log('\n⚠️  Some tests failed. Check the results above.', 'warn');
    } else {
      this.log('\n❌ Test errors occurred. Check the results above.', 'fail');
    }

    // Generate recommendations
    this.generateRecommendations();
  }

  generateRecommendations() {
    this.log('\n🔧 Recommendations:', 'info');
    
    const failedTests = this.results.tests.filter(test => test.status === 'FAIL');
    const errorTests = this.results.tests.filter(test => test.status === 'ERROR');
    
    if (failedTests.length > 0) {
      this.log('Failed Tests:', 'warn');
      failedTests.forEach(test => {
        this.log(`  - ${test.name}: ${test.error}`, 'warn');
      });
    }
    
    if (errorTests.length > 0) {
      this.log('Error Tests:', 'fail');
      errorTests.forEach(test => {
        this.log(`  - ${test.name}: ${test.error}`, 'fail');
      });
    }
    
    this.log('\nNext Steps:', 'info');
    this.log('1. Review failed tests and fix the issues', 'info');
    this.log('2. Check the OAuth button rendering in production', 'info');
    this.log('3. Verify RoleManager functionality', 'info');
    this.log('4. Test the OAuth flow manually in the browser', 'info');
    this.log('5. Check Supabase logs for any errors', 'info');
  }

  async saveResults() {
    const resultsFile = path.join(__dirname, 'test-suite-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
    this.log(`📄 Test results saved to: ${resultsFile}`, 'info');
  }

  async runAllTests() {
    this.log('🚀 Starting Comprehensive OAuth Test Suite...', 'info');
    this.log('This will run all OAuth-related tests to verify the flow is working correctly.', 'info');
    
    // Run tests in sequence
    await this.runLinting();
    await this.runUnitTests();
    await this.runIntegrationTests();
    await this.runRoleManagerTests();
    await this.runOAuthButtonTests();
    await this.runComprehensiveOAuthTests();
    await this.runE2ETests();
    
    this.generateSummary();
    await this.saveResults();
    
    return this.results;
  }
}

// Run all tests
const runner = new TestRunner();
runner.runAllTests().catch(console.error);
