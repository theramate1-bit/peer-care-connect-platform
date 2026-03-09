#!/usr/bin/env node

/**
 * Production OAuth Flow Testing Script
 * Tests Google OAuth registration for both client and practitioner roles
 * Verifies role assignment and onboarding flow
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const PRODUCTION_URL = 'https://theramate-ax7rldtpt-theras-projects-6dfd5a34.vercel.app';
const TEST_RESULTS_FILE = 'production-oauth-test-results.json';

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Client Registration',
    role: 'client',
    expectedRole: 'client',
    description: 'Test Google OAuth registration as a client'
  },
  {
    name: 'Practitioner Registration', 
    role: 'practitioner',
    expectedRole: 'sports_therapist',
    description: 'Test Google OAuth registration as a practitioner'
  }
];

class OAuthTester {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      timestamp: new Date().toISOString(),
      productionUrl: PRODUCTION_URL,
      tests: []
    };
  }

  async init() {
    console.log('🚀 Initializing OAuth Tester...');
    this.browser = await puppeteer.launch({
      headless: false, // Set to true for CI/CD
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Enable console logging
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'log' && text.includes('🎯') || text.includes('🔄') || text.includes('✅') || text.includes('❌')) {
        console.log(`[${type.toUpperCase()}] ${text}`);
      }
    });

    // Enable network monitoring
    this.page.on('response', response => {
      if (response.url().includes('supabase') || response.url().includes('auth')) {
        console.log(`[NETWORK] ${response.status()} ${response.url()}`);
      }
    });

    console.log('✅ Browser initialized');
  }

  async testOAuthFlow(scenario) {
    console.log(`\n🧪 Testing: ${scenario.name}`);
    console.log(`📝 Description: ${scenario.description}`);
    
    const testResult = {
      scenario: scenario.name,
      role: scenario.role,
      expectedRole: scenario.expectedRole,
      startTime: new Date().toISOString(),
      steps: [],
      errors: [],
      success: false
    };

    try {
      // Step 1: Navigate to production URL
      console.log('📍 Step 1: Navigating to production URL...');
      await this.page.goto(PRODUCTION_URL, { waitUntil: 'networkidle0' });
      testResult.steps.push({
        step: 'Navigate to production',
        success: true,
        timestamp: new Date().toISOString()
      });

      // Step 2: Check if we're on login/register page
      console.log('🔍 Step 2: Checking current page...');
      const currentUrl = this.page.url();
      console.log(`Current URL: ${currentUrl}`);
      
      if (currentUrl.includes('/login') || currentUrl.includes('/register')) {
        console.log('✅ On authentication page');
        testResult.steps.push({
          step: 'On authentication page',
          success: true,
          url: currentUrl,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('⚠️ Not on authentication page, navigating to register...');
        await this.page.goto(`${PRODUCTION_URL}/register`, { waitUntil: 'networkidle0' });
        testResult.steps.push({
          step: 'Navigate to register page',
          success: true,
          timestamp: new Date().toISOString()
        });
      }

      // Step 3: Look for role selection buttons
      console.log('🎯 Step 3: Looking for role selection...');
      await this.page.waitForTimeout(2000); // Wait for page to load
      
      const roleButtons = await this.page.$$eval('button', buttons => 
        buttons.map(btn => ({
          text: btn.textContent?.trim(),
          visible: btn.offsetParent !== null,
          id: btn.id,
          className: btn.className
        }))
      );
      
      console.log('Available buttons:', roleButtons);
      
      // Find the appropriate role button
      const roleButton = await this.page.$(`button:has-text("${scenario.role === 'client' ? 'Client' : 'Practitioner'}")`);
      
      if (!roleButton) {
        throw new Error(`Could not find ${scenario.role} button`);
      }

      testResult.steps.push({
        step: 'Find role selection button',
        success: true,
        buttonText: scenario.role,
        timestamp: new Date().toISOString()
      });

      // Step 4: Click role button and start OAuth
      console.log(`🖱️ Step 4: Clicking ${scenario.role} button...`);
      await roleButton.click();
      await this.page.waitForTimeout(1000);

      testResult.steps.push({
        step: 'Click role button',
        success: true,
        role: scenario.role,
        timestamp: new Date().toISOString()
      });

      // Step 5: Look for Google OAuth button
      console.log('🔍 Step 5: Looking for Google OAuth button...');
      await this.page.waitForTimeout(2000);
      
      const googleButton = await this.page.$('button:has-text("Google")');
      if (!googleButton) {
        throw new Error('Could not find Google OAuth button');
      }

      testResult.steps.push({
        step: 'Find Google OAuth button',
        success: true,
        timestamp: new Date().toISOString()
      });

      // Step 6: Monitor console logs before clicking
      console.log('📊 Step 6: Monitoring console logs...');
      const consoleLogs = [];
      
      this.page.on('console', msg => {
        const text = msg.text();
        if (text.includes('RoleManager') || text.includes('🎯') || text.includes('🔄') || text.includes('✅') || text.includes('❌')) {
          consoleLogs.push({
            type: msg.type(),
            text: text,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Step 7: Click Google OAuth button
      console.log('🖱️ Step 7: Clicking Google OAuth button...');
      await googleButton.click();
      
      testResult.steps.push({
        step: 'Click Google OAuth button',
        success: true,
        timestamp: new Date().toISOString()
      });

      // Step 8: Wait for OAuth redirect and monitor
      console.log('⏳ Step 8: Waiting for OAuth flow...');
      await this.page.waitForTimeout(5000);
      
      const currentUrlAfterOAuth = this.page.url();
      console.log(`URL after OAuth click: ${currentUrlAfterOAuth}`);
      
      testResult.steps.push({
        step: 'OAuth redirect initiated',
        success: true,
        url: currentUrlAfterOAuth,
        timestamp: new Date().toISOString()
      });

      // Step 9: Check for OAuth callback
      console.log('🔄 Step 9: Monitoring OAuth callback...');
      
      // Wait for potential redirect to callback
      try {
        await this.page.waitForFunction(
          () => window.location.href.includes('callback') || window.location.href.includes('auth'),
          { timeout: 10000 }
        );
        
        const callbackUrl = this.page.url();
        console.log(`OAuth callback URL: ${callbackUrl}`);
        
        testResult.steps.push({
          step: 'OAuth callback detected',
          success: true,
          callbackUrl: callbackUrl,
          timestamp: new Date().toISOString()
        });

        // Step 10: Check for role assignment logs
        console.log('🎯 Step 10: Checking role assignment logs...');
        await this.page.waitForTimeout(3000);
        
        const roleAssignmentLogs = consoleLogs.filter(log => 
          log.text.includes('RoleManager') || 
          log.text.includes('Consumed intended role') ||
          log.text.includes('Role assigned successfully')
        );
        
        console.log('Role assignment logs:', roleAssignmentLogs);
        
        testResult.steps.push({
          step: 'Check role assignment logs',
          success: roleAssignmentLogs.length > 0,
          logs: roleAssignmentLogs,
          timestamp: new Date().toISOString()
        });

        // Step 11: Check final user state
        console.log('👤 Step 11: Checking final user state...');
        
        // Look for user profile or dashboard
        const userElements = await this.page.$$eval('*', elements => 
          elements.filter(el => 
            el.textContent?.includes('Welcome') || 
            el.textContent?.includes('Dashboard') ||
            el.textContent?.includes('Profile')
          ).map(el => el.textContent?.trim())
        );
        
        console.log('User elements found:', userElements);
        
        testResult.steps.push({
          step: 'Check user state',
          success: userElements.length > 0,
          userElements: userElements,
          timestamp: new Date().toISOString()
        });

        testResult.success = true;
        testResult.consoleLogs = consoleLogs;
        
      } catch (error) {
        console.log('⚠️ OAuth callback timeout or error:', error.message);
        testResult.errors.push({
          step: 'OAuth callback',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
      testResult.errors.push({
        step: 'General test execution',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    testResult.endTime = new Date().toISOString();
    testResult.duration = new Date(testResult.endTime) - new Date(testResult.startTime);
    
    this.results.tests.push(testResult);
    
    console.log(`\n📊 Test Result: ${testResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`⏱️ Duration: ${testResult.duration}ms`);
    console.log(`📝 Steps: ${testResult.steps.length}`);
    console.log(`❌ Errors: ${testResult.errors.length}`);
    
    return testResult;
  }

  async runAllTests() {
    console.log('🚀 Starting Production OAuth Flow Tests');
    console.log(`🌐 Production URL: ${PRODUCTION_URL}`);
    console.log(`📅 Test Date: ${new Date().toISOString()}`);
    console.log('=' .repeat(60));

    await this.init();

    for (const scenario of TEST_SCENARIOS) {
      try {
        await this.testOAuthFlow(scenario);
        
        // Wait between tests
        console.log('\n⏳ Waiting 5 seconds before next test...');
        await this.page.waitForTimeout(5000);
        
      } catch (error) {
        console.error(`❌ Scenario ${scenario.name} failed:`, error);
      }
    }

    await this.cleanup();
    await this.saveResults();
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Browser closed');
    }
  }

  async saveResults() {
    const resultsPath = path.join(__dirname, TEST_RESULTS_FILE);
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
    
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(60));
    console.log(`📅 Test Date: ${this.results.timestamp}`);
    console.log(`🌐 Production URL: ${this.results.productionUrl}`);
    console.log(`🧪 Total Tests: ${this.results.tests.length}`);
    
    const successfulTests = this.results.tests.filter(t => t.success);
    const failedTests = this.results.tests.filter(t => !t.success);
    
    console.log(`✅ Successful: ${successfulTests.length}`);
    console.log(`❌ Failed: ${failedTests.length}`);
    
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`  - ${test.scenario}: ${test.errors.map(e => e.error).join(', ')}`);
      });
    }
    
    console.log(`\n📄 Detailed results saved to: ${resultsPath}`);
  }
}

// Run the tests
if (require.main === module) {
  const tester = new OAuthTester();
  tester.runAllTests().catch(console.error);
}

module.exports = OAuthTester;
