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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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

async function testOAuthFlow() {
  console.log('🚀 Testing OAuth Flow Live...');
  console.log(`🌐 URL: ${PRODUCTION_URL}`);
  
  const tests = [
    { name: 'Main Page', url: PRODUCTION_URL },
    { name: 'Register Page', url: `${PRODUCTION_URL}/register` },
    { name: 'Login Page', url: `${PRODUCTION_URL}/login` },
    { name: 'Auth Callback', url: `${PRODUCTION_URL}/auth/callback` },
    { name: 'Role Selection', url: `${PRODUCTION_URL}/auth/role-selection` },
    { name: 'Onboarding', url: `${PRODUCTION_URL}/onboarding` }
  ];
  
  for (const test of tests) {
    try {
      console.log(`\n🧪 Testing ${test.name}...`);
      const response = await makeRequest(test.url);
      
      if (response.statusCode === 200) {
        console.log(`✅ ${test.name}: OK (${response.body.length} bytes)`);
        
        // Check for OAuth content
        const hasGoogle = response.body.includes('Google') || response.body.includes('google');
        const hasOAuth = response.body.includes('oauth') || response.body.includes('OAuth');
        const hasClient = response.body.includes('client') || response.body.includes('Client');
        const hasPractitioner = response.body.includes('practitioner') || response.body.includes('Practitioner');
        
        if (hasGoogle) console.log(`   🔍 Google OAuth detected`);
        if (hasOAuth) console.log(`   🔍 OAuth content detected`);
        if (hasClient) console.log(`   🔍 Client role detected`);
        if (hasPractitioner) console.log(`   🔍 Practitioner role detected`);
        
      } else {
        console.log(`❌ ${test.name}: Failed (${response.statusCode})`);
      }
      
    } catch (error) {
      console.log(`❌ ${test.name}: Error - ${error.message}`);
    }
  }
  
  console.log('\n📊 Test Complete!');
  console.log('📝 Manual Testing Instructions:');
  console.log('1. Open the production URL in your browser');
  console.log('2. Open Developer Tools (F12) and go to Console tab');
  console.log('3. Try registering as both client and practitioner');
  console.log('4. Look for these console logs:');
  console.log('   🎯 Consumed intended role: client');
  console.log('   🎯 Consumed intended role: sports_therapist');
  console.log('   ✅ Role assigned successfully');
}

testOAuthFlow().catch(console.error);
