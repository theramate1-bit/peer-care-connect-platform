const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

console.log('🔍 Simple Google OAuth Flow Test');
console.log('=' .repeat(40));

// Test Register.tsx
console.log('\n📄 Testing Register.tsx...');
const registerPath = join(__dirname, 'src/pages/auth/Register.tsx');
if (existsSync(registerPath)) {
    const content = readFileSync(registerPath, 'utf8');
    
    const hasClientButton = content.includes('Continue with Google as Client');
    const hasPractitionerButton = content.includes('Continue with Google as Practitioner');
    const hasClientStorage = content.includes("sessionStorage.setItem('intendedRole', 'client')");
    const hasPractitionerStorage = content.includes("sessionStorage.setItem('intendedRole', 'practitioner')");
    
    console.log(`✅ Client button: ${hasClientButton ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Practitioner button: ${hasPractitionerButton ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Client storage: ${hasClientStorage ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Practitioner storage: ${hasPractitionerStorage ? 'FOUND' : 'MISSING'}`);
    
    const registerPass = hasClientButton && hasPractitionerButton && hasClientStorage && hasPractitionerStorage;
    console.log(`📊 Register.tsx: ${registerPass ? 'PASS' : 'FAIL'}`);
} else {
    console.log('❌ Register.tsx not found');
}

// Test Login.tsx
console.log('\n📄 Testing Login.tsx...');
const loginPath = join(__dirname, 'src/pages/auth/Login.tsx');
if (existsSync(loginPath)) {
    const content = readFileSync(loginPath, 'utf8');
    
    const hasClientButton = content.includes('Continue with Google as Client');
    const hasPractitionerButton = content.includes('Continue with Google as Practitioner');
    const hasClientStorage = content.includes("sessionStorage.setItem('intendedRole', 'client')");
    const hasPractitionerStorage = content.includes("sessionStorage.setItem('intendedRole', 'practitioner')");
    
    console.log(`✅ Client button: ${hasClientButton ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Practitioner button: ${hasPractitionerButton ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Client storage: ${hasClientStorage ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Practitioner storage: ${hasPractitionerStorage ? 'FOUND' : 'MISSING'}`);
    
    const loginPass = hasClientButton && hasPractitionerButton && hasClientStorage && hasPractitionerStorage;
    console.log(`📊 Login.tsx: ${loginPass ? 'PASS' : 'FAIL'}`);
} else {
    console.log('❌ Login.tsx not found');
}

// Test AuthCallback.tsx
console.log('\n📄 Testing AuthCallback.tsx...');
const authCallbackPath = join(__dirname, 'src/components/auth/AuthCallback.tsx');
if (existsSync(authCallbackPath)) {
    const content = readFileSync(authCallbackPath, 'utf8');
    
    const hasIntendedRole = content.includes("sessionStorage.getItem('intendedRole')");
    const hasRoleClearing = content.includes("sessionStorage.removeItem('intendedRole')");
    const hasClientRouting = content.includes("intendedRole === 'client'");
    const hasPractitionerRouting = content.includes("intendedRole === 'practitioner'");
    const hasClientRedirect = content.includes("navigate('/onboarding'");
    const hasPractitionerRedirect = content.includes("navigate('/auth/role-selection'");
    
    console.log(`✅ Intended role check: ${hasIntendedRole ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Role clearing: ${hasRoleClearing ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Client routing: ${hasClientRouting ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Practitioner routing: ${hasPractitionerRouting ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Client redirect: ${hasClientRedirect ? 'FOUND' : 'MISSING'}`);
    console.log(`✅ Practitioner redirect: ${hasPractitionerRedirect ? 'FOUND' : 'MISSING'}`);
    
    const authCallbackPass = hasIntendedRole && hasRoleClearing && hasClientRouting && hasPractitionerRouting && hasClientRedirect && hasPractitionerRedirect;
    console.log(`📊 AuthCallback.tsx: ${authCallbackPass ? 'PASS' : 'FAIL'}`);
} else {
    console.log('❌ AuthCallback.tsx not found');
}

console.log('\n🎯 Test completed!');

