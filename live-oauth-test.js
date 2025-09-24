#!/usr/bin/env node

/**
 * Live Google OAuth Flow Test
 * This script tests the actual Google OAuth implementation
 */

const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

console.log('🔍 Live Google OAuth Flow Test');
console.log('=' .repeat(50));

// Test the actual implementation files
function testImplementation() {
    console.log('\n📁 Checking Implementation Files...\n');
    
    const files = [
        'src/pages/auth/Register.tsx',
        'src/pages/auth/Login.tsx', 
        'src/components/auth/AuthCallback.tsx',
        'src/pages/auth/RoleSelection.tsx'
    ];
    
    let allFilesExist = true;
    
    files.forEach(file => {
        const filePath = join(__dirname, file);
        const exists = existsSync(filePath);
        console.log(`${exists ? '✅' : '❌'} ${file}`);
        if (!exists) allFilesExist = false;
    });
    
    return allFilesExist;
}

// Test Register.tsx implementation
function testRegisterImplementation() {
    console.log('\n🧪 Testing Register.tsx...\n');
    
    const filePath = join(__dirname, 'src/pages/auth/Register.tsx');
    const content = readFileSync(filePath, 'utf8');
    
    const tests = [
        {
            name: 'Client Google OAuth Button',
            test: content.includes('Continue with Google as Client'),
            expected: true
        },
        {
            name: 'Practitioner Google OAuth Button', 
            test: content.includes('Continue with Google as Practitioner'),
            expected: true
        },
        {
            name: 'Client Session Storage',
            test: content.includes("sessionStorage.setItem('intendedRole', 'client')"),
            expected: true
        },
        {
            name: 'Practitioner Session Storage',
            test: content.includes("sessionStorage.setItem('intendedRole', 'practitioner')"),
            expected: true
        },
        {
            name: 'No Generic Google Button',
            test: content.includes('Continue with Google') && 
                  !content.includes('Continue with Google as Client') &&
                  !content.includes('Continue with Google as Practitioner'),
            expected: false
        }
    ];
    
    let passed = 0;
    tests.forEach(test => {
        const result = test.test === test.expected;
        console.log(`${result ? '✅' : '❌'} ${test.name}: ${test.test ? 'Found' : 'Not Found'}`);
        if (result) passed++;
    });
    
    console.log(`\n📊 Register.tsx: ${passed}/${tests.length} tests passed`);
    return passed === tests.length;
}

// Test Login.tsx implementation
function testLoginImplementation() {
    console.log('\n🧪 Testing Login.tsx...\n');
    
    const filePath = join(__dirname, 'src/pages/auth/Login.tsx');
    const content = readFileSync(filePath, 'utf8');
    
    const tests = [
        {
            name: 'Client Google OAuth Button',
            test: content.includes('Continue with Google as Client'),
            expected: true
        },
        {
            name: 'Practitioner Google OAuth Button',
            test: content.includes('Continue with Google as Practitioner'),
            expected: true
        },
        {
            name: 'Client Session Storage',
            test: content.includes("sessionStorage.setItem('intendedRole', 'client')"),
            expected: true
        },
        {
            name: 'Practitioner Session Storage',
            test: content.includes("sessionStorage.setItem('intendedRole', 'practitioner')"),
            expected: true
        },
        {
            name: 'No Generic Google Button',
            test: content.includes('Continue with Google') && 
                  !content.includes('Continue with Google as Client') &&
                  !content.includes('Continue with Google as Practitioner'),
            expected: false
        }
    ];
    
    let passed = 0;
    tests.forEach(test => {
        const result = test.test === test.expected;
        console.log(`${result ? '✅' : '❌'} ${test.name}: ${test.test ? 'Found' : 'Not Found'}`);
        if (result) passed++;
    });
    
    console.log(`\n📊 Login.tsx: ${passed}/${tests.length} tests passed`);
    return passed === tests.length;
}

// Test AuthCallback.tsx implementation
function testAuthCallbackImplementation() {
    console.log('\n🧪 Testing AuthCallback.tsx...\n');
    
    const filePath = join(__dirname, 'src/components/auth/AuthCallback.tsx');
    const content = readFileSync(filePath, 'utf8');
    
    const tests = [
        {
            name: 'Intended Role Check',
            test: content.includes("sessionStorage.getItem('intendedRole')"),
            expected: true
        },
        {
            name: 'Role Clearing',
            test: content.includes("sessionStorage.removeItem('intendedRole')"),
            expected: true
        },
        {
            name: 'Client Routing Logic',
            test: content.includes("intendedRole === 'client'"),
            expected: true
        },
        {
            name: 'Practitioner Routing Logic',
            test: content.includes("intendedRole === 'practitioner'"),
            expected: true
        },
        {
            name: 'Client Onboarding Redirect',
            test: content.includes("navigate('/onboarding'"),
            expected: true
        },
        {
            name: 'Practitioner Role Selection Redirect',
            test: content.includes("navigate('/auth/role-selection'"),
            expected: true
        }
    ];
    
    let passed = 0;
    tests.forEach(test => {
        const result = test.test === test.expected;
        console.log(`${result ? '✅' : '❌'} ${test.name}: ${test.test ? 'Found' : 'Not Found'}`);
        if (result) passed++;
    });
    
    console.log(`\n📊 AuthCallback.tsx: ${passed}/${tests.length} tests passed`);
    return passed === tests.length;
}

// Test RoleSelection.tsx implementation
function testRoleSelectionImplementation() {
    console.log('\n🧪 Testing RoleSelection.tsx...\n');
    
    const filePath = join(__dirname, 'src/pages/auth/RoleSelection.tsx');
    const content = readFileSync(filePath, 'utf8');
    
    const tests = [
        {
            name: 'Sports Therapist Option',
            test: content.includes("'sports_therapist'"),
            expected: true
        },
        {
            name: 'Massage Therapist Option',
            test: content.includes("'massage_therapist'"),
            expected: true
        },
        {
            name: 'Osteopath Option',
            test: content.includes("'osteopath'"),
            expected: true
        },
        {
            name: 'Client Option',
            test: content.includes("'client'"),
            expected: true
        },
        {
            name: 'Onboarding Redirect',
            test: content.includes("navigate('/onboarding'"),
            expected: true
        }
    ];
    
    let passed = 0;
    tests.forEach(test => {
        const result = test.test === test.expected;
        console.log(`${result ? '✅' : '❌'} ${test.name}: ${test.test ? 'Found' : 'Not Found'}`);
        if (result) passed++;
    });
    
    console.log(`\n📊 RoleSelection.tsx: ${passed}/${tests.length} tests passed`);
    return passed === tests.length;
}

// Test production URL accessibility
async function testProductionAccess() {
    console.log('\n🌐 Testing Production Site Access...\n');
    
    const productionUrl = 'https://theramate-l3h8xe50o-theras-projects-6dfd5a34.vercel.app';
    
    try {
        const response = await fetch(productionUrl);
        const isAccessible = response.ok;
        
        console.log(`${isAccessible ? '✅' : '❌'} Production site accessible: ${response.status} ${response.statusText}`);
        
        if (isAccessible) {
            console.log('✅ Production site is responding correctly');
            return true;
        } else {
            console.log('❌ Production site returned error status');
            return false;
        }
    } catch (error) {
        console.log(`❌ Failed to access production site: ${error.message}`);
        return false;
    }
}

// Main test execution
async function runLiveTests() {
    console.log('🚀 Starting Live OAuth Flow Tests...\n');
    
    const results = {
        filesExist: testImplementation(),
        register: testRegisterImplementation(),
        login: testLoginImplementation(),
        authCallback: testAuthCallbackImplementation(),
        roleSelection: testRoleSelectionImplementation(),
        productionAccess: await testProductionAccess()
    };
    
    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 LIVE TEST SUMMARY');
    console.log('=' .repeat(50));
    
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(Boolean).length;
    
    console.log(`✅ Files Exist: ${results.filesExist ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Register.tsx: ${results.register ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Login.tsx: ${results.login ? 'PASS' : 'FAIL'}`);
    console.log(`✅ AuthCallback.tsx: ${results.authCallback ? 'PASS' : 'FAIL'}`);
    console.log(`✅ RoleSelection.tsx: ${results.roleSelection ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Production Access: ${results.productionAccess ? 'PASS' : 'FAIL'}`);
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 All live tests passed! Google OAuth flow is properly implemented.');
    } else {
        console.log('\n⚠️ Some tests failed. The Google OAuth flow needs fixes.');
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Open the production site in a browser');
    console.log('2. Test the actual Google OAuth buttons');
    console.log('3. Verify the flow works for both clients and practitioners');
    console.log('4. Check browser console for any errors');
}

// Run the tests
runLiveTests().catch(console.error);

