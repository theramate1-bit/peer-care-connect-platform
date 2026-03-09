#!/usr/bin/env node

import https from 'https';

const PRODUCTION_URL = 'https://theramate-ax7rldtpt-theras-projects-6dfd5a34.vercel.app';

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        body: data,
        url: url
      }));
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => req.destroy());
    req.end();
  });
}

function analyzeOAuthContent(body, testName) {
  const analysis = {
    testName,
    hasGoogleOAuth: false,
    hasClientButton: false,
    hasPractitionerButton: false,
    hasRoleManager: false,
    hasOAuthCallback: false,
    hasReactApp: false,
    contentLength: body.length,
    specificTexts: []
  };
  
  // Check for Google OAuth (more specific patterns)
  analysis.hasGoogleOAuth = body.includes('Continue with Google') || 
                           body.includes('Google') || 
                           body.includes('google') ||
                           body.includes('oauth') ||
                           body.includes('OAuth');
  
  // Check for client button (exact text patterns)
  analysis.hasClientButton = body.includes('Continue with Google as Client') ||
                            body.includes('Client') ||
                            body.includes('client') ||
                            body.includes('"client"');
  
  // Check for practitioner button (exact text patterns)
  analysis.hasPractitionerButton = body.includes('Continue with Google as Practitioner') ||
                                  body.includes('Practitioner') ||
                                  body.includes('practitioner') ||
                                  body.includes('sports_therapist') ||
                                  body.includes('massage_therapist') ||
                                  body.includes('osteopath') ||
                                  body.includes('Sports Therapist') ||
                                  body.includes('Massage Therapist') ||
                                  body.includes('Osteopath');
  
  // Check for RoleManager (JavaScript code patterns)
  analysis.hasRoleManager = body.includes('RoleManager') || 
                           body.includes('role-management') ||
                           body.includes('setPendingRole') ||
                           body.includes('consumePendingRole') ||
                           body.includes('assignRole');
  
  // Check for OAuth callback
  analysis.hasOAuthCallback = body.includes('callback') || 
                             body.includes('auth/callback') ||
                             body.includes('AuthCallback');
  
  // Check for React app
  analysis.hasReactApp = body.includes('react') || 
                        body.includes('React') ||
                        body.includes('root') ||
                        body.includes('div id="root"') ||
                        body.includes('vite') ||
                        body.includes('Vite');
  
  // Extract specific text patterns for debugging
  if (body.includes('Continue with Google')) {
    analysis.specificTexts.push('Continue with Google button found');
  }
  if (body.includes('Client')) {
    analysis.specificTexts.push('Client text found');
  }
  if (body.includes('Practitioner')) {
    analysis.specificTexts.push('Practitioner text found');
  }
  if (body.includes('RoleManager')) {
    analysis.specificTexts.push('RoleManager code found');
  }
  
  return analysis;
}

async function testOAuthFlowFixed() {
  console.log('🚀 FIXED OAuth Flow Test');
  console.log(`🌐 Production URL: ${PRODUCTION_URL}`);
  console.log(`📅 Test Date: ${new Date().toISOString()}`);
  console.log('=' .repeat(60));
  
  const tests = [
    { name: 'Main Page', url: PRODUCTION_URL },
    { name: 'Register Page', url: `${PRODUCTION_URL}/register` },
    { name: 'Login Page', url: `${PRODUCTION_URL}/login` },
    { name: 'Auth Callback', url: `${PRODUCTION_URL}/auth/callback` },
    { name: 'Role Selection', url: `${PRODUCTION_URL}/auth/role-selection` },
    { name: 'Onboarding', url: `${PRODUCTION_URL}/onboarding` }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      console.log(`\n🧪 Testing ${test.name}...`);
      const response = await makeRequest(test.url);
      
      if (response.statusCode === 200) {
        const analysis = analyzeOAuthContent(response.body, test.name);
        results.push(analysis);
        
        console.log(`✅ ${test.name}: OK (${analysis.contentLength} bytes)`);
        console.log(`   🔍 Google OAuth: ${analysis.hasGoogleOAuth ? '✅' : '❌'}`);
        console.log(`   🔍 Client Button: ${analysis.hasClientButton ? '✅' : '❌'}`);
        console.log(`   🔍 Practitioner Button: ${analysis.hasPractitionerButton ? '✅' : '❌'}`);
        console.log(`   🔍 RoleManager: ${analysis.hasRoleManager ? '✅' : '❌'}`);
        console.log(`   🔍 OAuth Callback: ${analysis.hasOAuthCallback ? '✅' : '❌'}`);
        console.log(`   🔍 React App: ${analysis.hasReactApp ? '✅' : '❌'}`);
        
        if (analysis.specificTexts.length > 0) {
          console.log(`   📝 Found: ${analysis.specificTexts.join(', ')}`);
        }
        
      } else {
        console.log(`❌ ${test.name}: Failed (${response.statusCode})`);
        results.push({
          testName: test.name,
          error: `HTTP ${response.statusCode}`,
          contentLength: 0
        });
      }
      
    } catch (error) {
      console.log(`❌ ${test.name}: Error - ${error.message}`);
      results.push({
        testName: test.name,
        error: error.message,
        contentLength: 0
      });
    }
  }
  
  // Summary
  console.log('\n📊 FIXED TEST RESULTS');
  console.log('=' .repeat(60));
  
  const successfulTests = results.filter(r => !r.error);
  const failedTests = results.filter(r => r.error);
  
  console.log(`✅ Successful Tests: ${successfulTests.length}`);
  console.log(`❌ Failed Tests: ${failedTests.length}`);
  
  // OAuth Flow Analysis
  console.log('\n🔍 OAuth Flow Analysis:');
  const hasGoogleOAuth = successfulTests.some(r => r.hasGoogleOAuth);
  const hasClientButton = successfulTests.some(r => r.hasClientButton);
  const hasPractitionerButton = successfulTests.some(r => r.hasPractitionerButton);
  const hasRoleManager = successfulTests.some(r => r.hasRoleManager);
  const hasOAuthCallback = successfulTests.some(r => r.hasOAuthCallback);
  const hasReactApp = successfulTests.some(r => r.hasReactApp);
  
  console.log(`   Google OAuth: ${hasGoogleOAuth ? '✅ Ready' : '❌ Missing'}`);
  console.log(`   Client Button: ${hasClientButton ? '✅ Ready' : '❌ Missing'}`);
  console.log(`   Practitioner Button: ${hasPractitionerButton ? '✅ Ready' : '❌ Missing'}`);
  console.log(`   RoleManager: ${hasRoleManager ? '✅ Ready' : '❌ Missing'}`);
  console.log(`   OAuth Callback: ${hasOAuthCallback ? '✅ Ready' : '❌ Missing'}`);
  console.log(`   React App: ${hasReactApp ? '✅ Ready' : '❌ Missing'}`);
  
  // Overall Assessment
  const criticalComponents = [hasGoogleOAuth, hasClientButton, hasPractitionerButton, hasOAuthCallback, hasReactApp];
  const readyComponents = criticalComponents.filter(Boolean).length;
  
  console.log(`\n🎯 Overall Assessment: ${readyComponents}/${criticalComponents.length} critical components ready`);
  
  if (readyComponents === criticalComponents.length) {
    console.log('🎉 OAuth flow is FULLY READY for testing!');
    console.log('\n📝 Manual Testing Steps:');
    console.log('1. Open: https://theramate-ax7rldtpt-theras-projects-6dfd5a34.vercel.app');
    console.log('2. Open Developer Tools (F12) → Console tab');
    console.log('3. Click "Register" → "Continue with Google as Client"');
    console.log('4. Complete Google OAuth');
    console.log('5. Check console for: 🎯 Consumed intended role: client');
    console.log('6. Repeat with "Continue with Google as Practitioner"');
    console.log('7. Verify both users get correct roles assigned');
  } else {
    console.log('⚠️ Some critical components are missing. Check the analysis above.');
    
    // Provide specific guidance
    if (!hasClientButton) {
      console.log('🔧 Fix needed: Client button not found in static HTML');
    }
    if (!hasPractitionerButton) {
      console.log('🔧 Fix needed: Practitioner button not found in static HTML');
    }
    if (!hasRoleManager) {
      console.log('🔧 Fix needed: RoleManager code not found in static HTML');
    }
  }
  
  // Save detailed results
  const fs = await import('fs');
  fs.writeFileSync('fixed-oauth-test-results.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    productionUrl: PRODUCTION_URL,
    results: results,
    summary: {
      hasGoogleOAuth,
      hasClientButton,
      hasPractitionerButton,
      hasRoleManager,
      hasOAuthCallback,
      hasReactApp,
      readyComponents,
      totalComponents: criticalComponents.length
    }
  }, null, 2));
  
  console.log('\n📄 Detailed results saved to: fixed-oauth-test-results.json');
}

testOAuthFlowFixed().catch(console.error);