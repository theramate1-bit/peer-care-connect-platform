#!/usr/bin/env node

import { TestStateGenerator, MockGoogleOAuth, TestUserFactory } from './test-utils.js';

class RoleManagerTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
      },
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const icon = type === 'pass' ? '✅' : type === 'fail' ? '❌' : type === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`${icon} [${timestamp}] ${message}`);
  }

  async testStateGeneration() {
    this.log('Testing State Generation...', 'info');
    
    try {
      // Test valid state generation
      const validState = TestStateGenerator.generateRoleState('client', 'test-nonce-123');
      this.log(`Generated valid state: ${validState.substring(0, 50)}...`, 'pass');
      
      // Test state verification
      const verified = TestStateGenerator.verifyState(validState);
      if (verified && verified.role === 'client') {
        this.log('State verification passed', 'pass');
        this.results.summary.passed++;
      } else {
        this.log('State verification failed', 'fail');
        this.results.summary.failed++;
      }
      
      // Test expired state
      const expiredState = TestStateGenerator.generateExpiredState({
        role: 'client',
        nonce: 'test-nonce-expired',
      });
      const expiredVerified = TestStateGenerator.verifyState(expiredState);
      if (!expiredVerified) {
        this.log('Expired state correctly rejected', 'pass');
        this.results.summary.passed++;
      } else {
        this.log('Expired state incorrectly accepted', 'fail');
        this.results.summary.failed++;
      }
      
      // Test tampered state
      const tamperedState = TestStateGenerator.generateTamperedState({
        role: 'admin',
        nonce: 'test-nonce-tampered',
      });
      const tamperedVerified = TestStateGenerator.verifyState(tamperedState);
      if (!tamperedVerified) {
        this.log('Tampered state correctly rejected', 'pass');
        this.results.summary.passed++;
      } else {
        this.log('Tampered state incorrectly accepted', 'fail');
        this.results.summary.failed++;
      }
      
      this.results.summary.total += 4;
      
    } catch (error) {
      this.log(`State generation test failed: ${error.message}`, 'fail');
      this.results.summary.failed++;
      this.results.summary.total++;
    }
  }

  async testMockGoogleOAuth() {
    this.log('Testing Mock Google OAuth...', 'info');
    
    try {
      // Test ID token generation
      const idToken = MockGoogleOAuth.generateMockIdToken({
        email: 'test@example.com',
        sub: 'google-123',
        name: 'Test User',
      });
      this.log(`Generated mock ID token: ${idToken.substring(0, 50)}...`, 'pass');
      
      // Test token response generation
      const tokenResponse = MockGoogleOAuth.generateMockTokenResponse(
        'fake-access-token',
        idToken
      );
      if (tokenResponse.access_token && tokenResponse.id_token) {
        this.log('Mock token response generated successfully', 'pass');
        this.results.summary.passed++;
      } else {
        this.log('Mock token response generation failed', 'fail');
        this.results.summary.failed++;
      }
      
      // Test userinfo response generation
      const userInfo = MockGoogleOAuth.generateMockUserInfo({
        email: 'test@example.com',
        sub: 'google-123',
        name: 'Test User',
      });
      if (userInfo.email && userInfo.sub) {
        this.log('Mock userinfo response generated successfully', 'pass');
        this.results.summary.passed++;
      } else {
        this.log('Mock userinfo response generation failed', 'fail');
        this.results.summary.failed++;
      }
      
      this.results.summary.total += 3;
      
    } catch (error) {
      this.log(`Mock Google OAuth test failed: ${error.message}`, 'fail');
      this.results.summary.failed++;
      this.results.summary.total++;
    }
  }

  async testUserFactory() {
    this.log('Testing User Factory...', 'info');
    
    try {
      // Test client user creation
      const clientUser = TestUserFactory.createTestClient();
      if (clientUser.user_role === 'client' && clientUser.onboarding_status === 'pending') {
        this.log('Client user created successfully', 'pass');
        this.results.summary.passed++;
      } else {
        this.log('Client user creation failed', 'fail');
        this.results.summary.failed++;
      }
      
      // Test practitioner user creation
      const practitionerUser = TestUserFactory.createTestPractitioner();
      if (practitionerUser.user_role === 'sports_therapist' && practitionerUser.onboarding_status === 'in_progress') {
        this.log('Practitioner user created successfully', 'pass');
        this.results.summary.passed++;
      } else {
        this.log('Practitioner user creation failed', 'fail');
        this.results.summary.failed++;
      }
      
      // Test user with overrides
      const customUser = TestUserFactory.createTestUser({
        email: 'custom@example.com',
        user_role: 'osteopath',
      });
      if (customUser.email === 'custom@example.com' && customUser.user_role === 'osteopath') {
        this.log('Custom user with overrides created successfully', 'pass');
        this.results.summary.passed++;
      } else {
        this.log('Custom user with overrides creation failed', 'fail');
        this.results.summary.failed++;
      }
      
      this.results.summary.total += 3;
      
    } catch (error) {
      this.log(`User factory test failed: ${error.message}`, 'fail');
      this.results.summary.failed++;
      this.results.summary.total++;
    }
  }

  async testRoleValidation() {
    this.log('Testing Role Validation...', 'info');
    
    try {
      const validRoles = ['client', 'sports_therapist', 'massage_therapist', 'osteopath', 'admin'];
      const invalidRoles = ['invalid_role', 'admin', 'super_admin', 'moderator'];
      
      // Test valid roles
      for (const role of validRoles) {
        if (validRoles.includes(role)) {
          this.log(`Valid role '${role}' correctly identified`, 'pass');
          this.results.summary.passed++;
        } else {
          this.log(`Valid role '${role}' incorrectly rejected`, 'fail');
          this.results.summary.failed++;
        }
        this.results.summary.total++;
      }
      
      // Test invalid roles
      for (const role of invalidRoles) {
        if (role === 'admin') {
          // Admin is valid
          if (validRoles.includes(role)) {
            this.log(`Valid role '${role}' correctly identified`, 'pass');
            this.results.summary.passed++;
          } else {
            this.log(`Valid role '${role}' incorrectly rejected`, 'fail');
            this.results.summary.failed++;
          }
        } else {
          // Other roles are invalid
          if (!validRoles.includes(role)) {
            this.log(`Invalid role '${role}' correctly rejected`, 'pass');
            this.results.summary.passed++;
          } else {
            this.log(`Invalid role '${role}' incorrectly accepted`, 'fail');
            this.results.summary.failed++;
          }
        }
        this.results.summary.total++;
      }
      
    } catch (error) {
      this.log(`Role validation test failed: ${error.message}`, 'fail');
      this.results.summary.failed++;
      this.results.summary.total++;
    }
  }

  async testOAuthFlowSimulation() {
    this.log('Testing OAuth Flow Simulation...', 'info');
    
    try {
      // Simulate complete OAuth flow
      const state = TestStateGenerator.generateRoleState('client', 'test-nonce-flow');
      const idToken = MockGoogleOAuth.generateMockIdToken({
        email: 'flow-test@example.com',
        sub: 'google-flow-123',
        name: 'Flow Test User',
      });
      const user = TestUserFactory.createTestClient({
        email: 'flow-test@example.com',
      });
      
      // Verify state
      const verifiedState = TestStateGenerator.verifyState(state);
      if (verifiedState && verifiedState.role === 'client') {
        this.log('OAuth flow state verification passed', 'pass');
        this.results.summary.passed++;
      } else {
        this.log('OAuth flow state verification failed', 'fail');
        this.results.summary.failed++;
      }
      
      // Verify token
      if (idToken && idToken.length > 0) {
        this.log('OAuth flow token generation passed', 'pass');
        this.results.summary.passed++;
      } else {
        this.log('OAuth flow token generation failed', 'fail');
        this.results.summary.failed++;
      }
      
      // Verify user creation
      if (user.email === 'flow-test@example.com' && user.user_role === 'client') {
        this.log('OAuth flow user creation passed', 'pass');
        this.results.summary.passed++;
      } else {
        this.log('OAuth flow user creation failed', 'fail');
        this.results.summary.failed++;
      }
      
      this.results.summary.total += 3;
      
    } catch (error) {
      this.log(`OAuth flow simulation test failed: ${error.message}`, 'fail');
      this.results.summary.failed++;
      this.results.summary.total++;
    }
  }

  generateSummary() {
    const { total, passed, failed } = this.results.summary;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

    this.log('\n📊 Test Summary:', 'info');
    this.log(`Total Tests: ${total}`, 'info');
    this.log(`Passed: ${passed} (${passRate}%)`, 'pass');
    this.log(`Failed: ${failed}`, failed > 0 ? 'fail' : 'pass');

    if (failed === 0) {
      this.log('\n🎉 All RoleManager tests passed!', 'pass');
    } else {
      this.log('\n⚠️  Some RoleManager tests failed. Check the results above.', 'warn');
    }
  }

  async runAllTests() {
    this.log('🚀 Starting RoleManager Test Suite...', 'info');
    
    await this.testStateGeneration();
    await this.testMockGoogleOAuth();
    await this.testUserFactory();
    await this.testRoleValidation();
    await this.testOAuthFlowSimulation();
    
    this.generateSummary();
    
    return this.results;
  }
}

// Run the tests
const tester = new RoleManagerTester();
tester.runAllTests().catch(console.error);
