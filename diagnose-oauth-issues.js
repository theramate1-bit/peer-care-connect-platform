#!/usr/bin/env node

import https from 'https';

const PRODUCTION_URL = 'https://theramate-ax7rldtpt-theras-projects-6dfd5a34.vercel.app';

class OAuthIssueDiagnostic {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      productionUrl: PRODUCTION_URL,
      issues: [],
      recommendations: [],
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

  analyzeOAuthCallback(body) {
    const issues = [];
    
    // Check for proper error handling
    if (!body.includes('error') && !body.includes('Error')) {
      issues.push({
        type: 'Missing Error Handling',
        severity: 'HIGH',
        description: 'OAuth callback page does not show error handling for invalid/missing parameters',
        impact: 'Users may not know when OAuth fails',
      });
    }

    // Check for role assignment logic
    if (!body.includes('role') && !body.includes('Role')) {
      issues.push({
        type: 'Missing Role Assignment UI',
        severity: 'HIGH', 
        description: 'No role assignment interface visible in OAuth callback',
        impact: 'Users cannot select or confirm their intended role',
      });
    }

    // Check for redirect logic
    if (!body.includes('redirect') && !body.includes('navigate')) {
      issues.push({
        type: 'Missing Redirect Logic',
        severity: 'MEDIUM',
        description: 'No visible redirect logic after OAuth completion',
        impact: 'Users may get stuck on callback page',
      });
    }

    return issues;
  }

  async diagnoseOAuthIssues() {
    console.log('🔍 Diagnosing OAuth Issues in Production...');
    console.log(`🌐 Production URL: ${PRODUCTION_URL}`);

    try {
      // Test OAuth callback page
      const callbackResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/callback`);
      
      if (callbackResponse.statusCode !== 200) {
        this.results.issues.push({
          type: 'OAuth Callback Access',
          severity: 'CRITICAL',
          description: `OAuth callback page returns status ${callbackResponse.statusCode}`,
          impact: 'OAuth flow completely broken',
        });
        return;
      }

      // Analyze the callback page for issues
      const callbackIssues = this.analyzeOAuthCallback(callbackResponse.body);
      this.results.issues.push(...callbackIssues);

      // Test register page for OAuth initiation
      const registerResponse = await this.makeRequest(`${PRODUCTION_URL}/auth/register`);
      
      if (registerResponse.statusCode !== 200) {
        this.results.issues.push({
          type: 'OAuth Initiation',
          severity: 'CRITICAL',
          description: `Register page returns status ${registerResponse.statusCode}`,
          impact: 'Users cannot start OAuth flow',
        });
      }

      // Check for OAuth button presence (should be dynamically rendered)
      const hasOAuthInitiation = registerResponse.body.includes('google') || 
                                registerResponse.body.includes('oauth') ||
                                registerResponse.body.includes('auth');
      
      if (!hasOAuthInitiation) {
        this.results.issues.push({
          type: 'OAuth Initiation Missing',
          severity: 'HIGH',
          description: 'No OAuth initiation buttons found on register page',
          impact: 'Users cannot start Google OAuth',
        });
      }

      // Test role selection page
      const roleSelectionResponse = await this.makeRequest(`${PRODUCTION_URL}/role-selection`);
      
      if (roleSelectionResponse.statusCode !== 200) {
        this.results.issues.push({
          type: 'Role Selection Page',
          severity: 'HIGH',
          description: `Role selection page returns status ${roleSelectionResponse.statusCode}`,
          impact: 'Users cannot select their intended role',
        });
      }

      // Generate recommendations
      this.generateRecommendations();

    } catch (error) {
      this.results.issues.push({
        type: 'Diagnostic Error',
        severity: 'CRITICAL',
        description: `Failed to diagnose OAuth issues: ${error.message}`,
        impact: 'Cannot determine OAuth flow status',
      });
    }
  }

  generateRecommendations() {
    console.log('\n📊 OAuth Issue Analysis Results:');
    
    if (this.results.issues.length === 0) {
      console.log('✅ No critical OAuth issues detected in static analysis.');
      console.log('⚠️  However, the real issue is likely in the dynamic OAuth callback logic.');
    } else {
      console.log(`❌ Found ${this.results.issues.length} OAuth issues:`);
      
      this.results.issues.forEach((issue, index) => {
        const icon = issue.severity === 'CRITICAL' ? '🚨' : 
                    issue.severity === 'HIGH' ? '⚠️' : 'ℹ️';
        console.log(`\n${icon} Issue ${index + 1}: ${issue.type}`);
        console.log(`   Severity: ${issue.severity}`);
        console.log(`   Description: ${issue.description}`);
        console.log(`   Impact: ${issue.impact}`);
      });
    }

    console.log('\n🔧 Root Cause Analysis:');
    console.log('Based on database analysis, the real issues are:');
    console.log('1. 🚨 DUPLICATE USER ACCOUNTS: Users sign up multiple times with same email');
    console.log('2. 🚨 INCONSISTENT ROLE ASSIGNMENT: Some users get roles, others don\'t');
    console.log('3. 🚨 FRONTEND OAUTH CALLBACK: Not properly calling assign_user_role function');
    console.log('4. 🚨 MISSING ERROR HANDLING: No feedback when OAuth fails');

    console.log('\n🛠️  Immediate Fixes Needed:');
    console.log('1. Fix AuthCallback.tsx to properly call assign_user_role');
    console.log('2. Add proper error handling for OAuth failures');
    console.log('3. Implement duplicate user detection and merging');
    console.log('4. Add role confirmation UI in OAuth callback');
    console.log('5. Add proper redirect logic after role assignment');

    console.log('\n📋 Specific Code Changes Required:');
    console.log('1. Update AuthCallback.tsx to use RoleManager.assignRole()');
    console.log('2. Add error states and user feedback');
    console.log('3. Implement proper redirect after successful role assignment');
    console.log('4. Add duplicate user detection logic');
    console.log('5. Test with real Google OAuth accounts');

    this.results.recommendations = [
      'Fix AuthCallback.tsx role assignment logic',
      'Add error handling for OAuth failures', 
      'Implement duplicate user detection',
      'Add role confirmation UI',
      'Test with real Google OAuth accounts',
    ];
  }
}

// Run the diagnostic
const diagnostic = new OAuthIssueDiagnostic();
diagnostic.diagnoseOAuthIssues().catch(console.error);
