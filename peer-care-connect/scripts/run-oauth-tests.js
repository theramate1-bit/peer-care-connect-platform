/**
 * Test Runner for Google OAuth Sign-up Tests
 * 
 * This script runs all OAuth-related tests and provides detailed reporting
 * for each user type and scenario.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface TestResult {
  testFile: string;
  passed: boolean;
  duration: number;
  error?: string;
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}

interface UserTypeTestResults {
  userType: string;
  tests: {
    oauthInitiation: boolean;
    oauthCallback: boolean;
    oauthCompletion: boolean;
    errorHandling: boolean;
    edgeCases: boolean;
  };
  overallPassed: boolean;
}

class OAuthTestRunner {
  private testResults: TestResult[] = [];
  private userTypeResults: UserTypeTestResults[] = [];

  constructor() {
    this.userTypeResults = [
      { userType: 'client', tests: { oauthInitiation: false, oauthCallback: false, oauthCompletion: false, errorHandling: false, edgeCases: false }, overallPassed: false },
      { userType: 'sports_therapist', tests: { oauthInitiation: false, oauthCallback: false, oauthCompletion: false, errorHandling: false, edgeCases: false }, overallPassed: false },
      { userType: 'massage_therapist', tests: { oauthInitiation: false, oauthCallback: false, oauthCompletion: false, errorHandling: false, edgeCases: false }, overallPassed: false },
      { userType: 'osteopath', tests: { oauthInitiation: false, oauthCallback: false, oauthCompletion: false, errorHandling: false, edgeCases: false }, overallPassed: false },
    ];
  }

  /**
   * Run all OAuth tests
   */
  public async runAllTests(): Promise<void> {
    console.log('🚀 Starting Google OAuth Sign-up Tests...\n');

    const testFiles = [
      'src/components/__tests__/GoogleOAuthSignup.test.tsx',
      'src/components/__tests__/GoogleOAuthIntegration.test.tsx',
    ];

    for (const testFile of testFiles) {
      await this.runTestFile(testFile);
    }

    this.generateReport();
  }

  /**
   * Run a specific test file
   */
  private async runTestFile(testFile: string): Promise<void> {
    console.log(`📋 Running tests in ${testFile}...`);

    try {
      const startTime = Date.now();
      
      // Run Jest with coverage
      const command = `npx jest ${testFile} --coverage --verbose --testTimeout=30000`;
      const output = execSync(command, { 
        encoding: 'utf8',
        cwd: process.cwd(),
        stdio: 'pipe'
      });

      const duration = Date.now() - startTime;
      
      // Parse test results
      const passed = !output.includes('FAIL');
      const error = passed ? undefined : this.extractError(output);
      
      // Extract coverage information
      const coverage = this.extractCoverage(output);

      this.testResults.push({
        testFile,
        passed,
        duration,
        error,
        coverage,
      });

      console.log(`✅ ${testFile} - ${passed ? 'PASSED' : 'FAILED'} (${duration}ms)`);
      
      if (!passed && error) {
        console.log(`❌ Error: ${error}`);
      }

      // Update user type results based on test output
      this.updateUserTypeResults(testFile, output);

    } catch (error) {
      console.log(`❌ ${testFile} - FAILED`);
      console.log(`Error: ${error}`);
      
      this.testResults.push({
        testFile,
        passed: false,
        duration: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    console.log('');
  }

  /**
   * Extract error message from Jest output
   */
  private extractError(output: string): string {
    const errorMatch = output.match(/Error: (.+?)(?:\n|$)/);
    return errorMatch ? errorMatch[1] : 'Unknown error';
  }

  /**
   * Extract coverage information from Jest output
   */
  private extractCoverage(output: string): TestResult['coverage'] | undefined {
    const coverageMatch = output.match(/All files\s+\|\s+(\d+(?:\.\d+)?)\s+\|\s+(\d+(?:\.\d+)?)\s+\|\s+(\d+(?:\.\d+)?)\s+\|\s+(\d+(?:\.\d+)?)/);
    
    if (coverageMatch) {
      return {
        statements: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        lines: parseFloat(coverageMatch[4]),
      };
    }

    return undefined;
  }

  /**
   * Update user type test results based on test output
   */
  private updateUserTypeResults(testFile: string, output: string): void {
    const userTypes = ['client', 'sports_therapist', 'massage_therapist', 'osteopath'];
    
    userTypes.forEach(userType => {
      const userTypeResult = this.userTypeResults.find(r => r.userType === userType);
      if (!userTypeResult) return;

      // Check for specific test patterns in output
      const tests = {
        oauthInitiation: output.includes(`should initiate Google OAuth for ${userType}`) && !output.includes('FAIL'),
        oauthCallback: output.includes(`should handle OAuth callback for ${userType}`) && !output.includes('FAIL'),
        oauthCompletion: output.includes(`should complete OAuth registration for ${userType}`) && !output.includes('FAIL'),
        errorHandling: output.includes(`should handle OAuth errors gracefully for ${userType}`) && !output.includes('FAIL'),
        edgeCases: output.includes(`should handle missing user metadata for ${userType}`) && !output.includes('FAIL'),
      };

      userTypeResult.tests = tests;
      userTypeResult.overallPassed = Object.values(tests).every(test => test);
    });
  }

  /**
   * Generate comprehensive test report
   */
  private generateReport(): void {
    console.log('📊 Test Report');
    console.log('='.repeat(50));

    // Overall results
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`   Total Duration: ${totalDuration}ms`);

    // User type specific results
    console.log(`\n👥 User Type Test Results:`);
    this.userTypeResults.forEach(result => {
      const status = result.overallPassed ? '✅' : '❌';
      console.log(`   ${status} ${result.userType}:`);
      console.log(`      OAuth Initiation: ${result.tests.oauthInitiation ? '✅' : '❌'}`);
      console.log(`      OAuth Callback: ${result.tests.oauthCallback ? '✅' : '❌'}`);
      console.log(`      OAuth Completion: ${result.tests.oauthCompletion ? '✅' : '❌'}`);
      console.log(`      Error Handling: ${result.tests.errorHandling ? '✅' : '❌'}`);
      console.log(`      Edge Cases: ${result.tests.edgeCases ? '✅' : '❌'}`);
    });

    // Individual test results
    console.log(`\n📋 Individual Test Results:`);
    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`   ${status} ${result.testFile} (${result.duration}ms)`);
      
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
      
      if (result.coverage) {
        console.log(`      Coverage: ${result.coverage.lines}% lines`);
      }
    });

    // Coverage summary
    const coverageResults = this.testResults.filter(r => r.coverage);
    if (coverageResults.length > 0) {
      const avgCoverage = coverageResults.reduce((sum, r) => sum + (r.coverage?.lines || 0), 0) / coverageResults.length;
      console.log(`\n📊 Average Coverage: ${avgCoverage.toFixed(1)}%`);
    }

    // Recommendations
    console.log(`\n💡 Recommendations:`);
    if (failedTests > 0) {
      console.log(`   - Fix ${failedTests} failing test(s)`);
    }
    
    const incompleteUserTypes = this.userTypeResults.filter(r => !r.overallPassed);
    if (incompleteUserTypes.length > 0) {
      console.log(`   - Complete OAuth flow for: ${incompleteUserTypes.map(r => r.userType).join(', ')}`);
    }

    const lowCoverageTests = this.testResults.filter(r => r.coverage && r.coverage.lines < 80);
    if (lowCoverageTests.length > 0) {
      console.log(`   - Improve test coverage for: ${lowCoverageTests.map(r => r.testFile).join(', ')}`);
    }

    if (failedTests === 0 && incompleteUserTypes.length === 0) {
      console.log(`   🎉 All OAuth tests are passing! Your Google OAuth sign-up is ready for production.`);
    }

    // Save report to file
    this.saveReportToFile();
  }

  /**
   * Save test report to file
   */
  private saveReportToFile(): void {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.testResults.length,
        passedTests: this.testResults.filter(r => r.passed).length,
        failedTests: this.testResults.filter(r => !r.passed).length,
        successRate: (this.testResults.filter(r => r.passed).length / this.testResults.length) * 100,
        totalDuration: this.testResults.reduce((sum, r) => sum + r.duration, 0),
      },
      userTypeResults: this.userTypeResults,
      testResults: this.testResults,
    };

    const reportPath = path.join(process.cwd(), 'oauth-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new OAuthTestRunner();
  runner.runAllTests().catch(console.error);
}

export default OAuthTestRunner;
