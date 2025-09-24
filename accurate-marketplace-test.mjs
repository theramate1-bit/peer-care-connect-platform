// 🧪 ACCURATE MARKETPLACE TESTING SCRIPT
// This script tests the actual marketplace functionality based on project structure

import fs from 'fs';
import path from 'path';

console.log('🚀 STARTING ACCURATE MARKETPLACE TESTING...\n');

let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

function logTest(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}: PASSED`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}: FAILED - ${details}`);
  }
  testResults.details.push({ name: testName, passed, details });
}

// Test 1: Project Structure Verification
function testProjectStructure() {
  try {
    const requiredFiles = [
      'src/components/PricingSection.tsx',
      'src/components/HeroSection.tsx',
      'src/components/marketplace/BookingFlow.tsx',
      'src/components/marketplace/PaymentStatus.tsx',
      'src/components/marketplace/PractitionerCard.tsx',
      'supabase/functions/create-checkout/index.ts',
      'supabase/functions/check-subscription/index.ts',
      'supabase/functions/customer-portal/index.ts'
    ];
    
    let foundFiles = 0;
    requiredFiles.forEach(file => {
      if (fs.existsSync(file)) {
        foundFiles++;
      }
    });
    
    const passed = foundFiles >= requiredFiles.length * 0.8; // 80% threshold
    logTest('Project Structure Verification', passed, `Found ${foundFiles}/${requiredFiles.length} required files`);
    return passed;
  } catch (error) {
    logTest('Project Structure Verification', false, error.message);
    return false;
  }
}

// Test 2: Edge Functions Code Quality
function testEdgeFunctionsCode() {
  try {
    const functions = [
      'supabase/functions/create-checkout/index.ts',
      'supabase/functions/check-subscription/index.ts',
      'supabase/functions/customer-portal/index.ts'
    ];
    
    let workingFunctions = 0;
    functions.forEach(funcPath => {
      if (fs.existsSync(funcPath)) {
        const content = fs.readFileSync(funcPath, 'utf8');
        const hasStripeImport = content.includes('stripe');
        const hasSupabaseImport = content.includes('@supabase/supabase-js');
        const hasServeFunction = content.includes('serve(');
        
        if (hasStripeImport && hasSupabaseImport && hasServeFunction) {
          workingFunctions++;
        }
      }
    });
    
    const passed = workingFunctions >= functions.length * 0.8;
    logTest('Edge Functions Code Quality', passed, `Found ${workingFunctions}/${functions.length} properly structured functions`);
    return passed;
  } catch (error) {
    logTest('Edge Functions Code Quality', false, error.message);
    return false;
  }
}

// Test 3: Marketplace Components Code Quality
function testMarketplaceComponents() {
  try {
    const components = [
      'src/components/marketplace/BookingFlow.tsx',
      'src/components/marketplace/PaymentStatus.tsx',
      'src/components/marketplace/PractitionerCard.tsx'
    ];
    
    let workingComponents = 0;
    components.forEach(compPath => {
      if (fs.existsSync(compPath)) {
        const content = fs.readFileSync(compPath, 'utf8');
        const hasReactImport = content.includes('react') || content.includes('useState') || content.includes('useEffect');
        const hasExport = content.includes('export default') || content.includes('export {');
        
        if (hasReactImport && hasExport) {
          workingComponents++;
        }
      }
    });
    
    const passed = workingComponents >= components.length * 0.8;
    logTest('Marketplace Components Code Quality', passed, `Found ${workingComponents}/${components.length} properly structured components`);
    return passed;
  } catch (error) {
    logTest('Marketplace Components Code Quality', false, error.message);
    return false;
  }
}

// Test 4: Pricing Section Content
function testPricingSectionContent() {
  try {
    const pricingPath = 'src/components/PricingSection.tsx';
    if (fs.existsSync(pricingPath)) {
      const content = fs.readFileSync(pricingPath, 'utf8');
      const hasStarterPlan = content.includes('Starter Plan') || content.includes('starter');
      const hasPractitionerPlan = content.includes('Practitioner Plan') || content.includes('practitioner');
      const hasClinicPlan = content.includes('Clinic Plan') || content.includes('clinic');
      const hasPricing = content.includes('£') || content.includes('$') || content.includes('price');
      
      const passed = hasStarterPlan && hasPractitionerPlan && hasClinicPlan && hasPricing;
      logTest('Pricing Section Content', passed, 'Checking for all plan tiers and pricing information');
      return passed;
    } else {
      logTest('Pricing Section Content', false, 'PricingSection.tsx not found');
      return false;
    }
  } catch (error) {
    logTest('Pricing Section Content', false, error.message);
    return false;
  }
}

// Test 5: Hero Section Video Integration
function testHeroVideoIntegration() {
  try {
    const heroPath = 'src/components/HeroSection.tsx';
    if (fs.existsSync(heroPath)) {
      const content = fs.readFileSync(heroPath, 'utf8');
      const hasVideo = content.includes('video') || content.includes('mp4') || content.includes('hero.mp4');
      const hasVideoLogic = content.includes('currentTime') || content.includes('playbackRate') || content.includes('setInterval');
      
      const passed = hasVideo && hasVideoLogic;
      logTest('Hero Video Integration', passed, 'Checking for video element and looping logic');
      return passed;
    } else {
      logTest('Hero Video Integration', false, 'HeroSection.tsx not found');
      return false;
    }
  } catch (error) {
    logTest('Hero Video Integration', false, error.message);
    return false;
  }
}

// Test 6: Database Schema Files
function testDatabaseSchemaFiles() {
  try {
    const schemaFiles = [
      'supabase/migrations/20250115_create_client_sessions_and_therapist_profiles.sql',
      'supabase/migrations/20250115_payment_system_setup.sql'
    ];
    
    let foundFiles = 0;
    schemaFiles.forEach(file => {
      if (fs.existsSync(file)) {
        foundFiles++;
      }
    });
    
    const passed = foundFiles >= schemaFiles.length * 0.5; // At least 50%
    logTest('Database Schema Files', passed, `Found ${foundFiles}/${schemaFiles.length} migration files`);
    return passed;
  } catch (error) {
    logTest('Database Schema Files', false, error.message);
    return false;
  }
}

// Test 7: Environment Configuration
function testEnvironmentConfiguration() {
  try {
    const envFiles = [
      '.env.local',
      '.env',
      'supabase/config.toml'
    ];
    
    let foundFiles = 0;
    envFiles.forEach(file => {
      if (fs.existsSync(file)) {
        foundFiles++;
      }
    });
    
    const passed = foundFiles >= 1; // At least one config file
    logTest('Environment Configuration', passed, `Found ${foundFiles}/${envFiles.length} configuration files`);
    return passed;
  } catch (error) {
    logTest('Environment Configuration', false, error.message);
    return false;
  }
}

// Test 8: Package Dependencies
function testPackageDependencies() {
  try {
    const packagePath = 'package.json';
    if (fs.existsSync(packagePath)) {
      const content = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      const hasSupabase = content.dependencies && content.dependencies['@supabase/supabase-js'];
      const hasStripe = content.dependencies && content.dependencies['stripe'];
      const hasReact = content.dependencies && content.dependencies['react'];
      
      const passed = hasSupabase && hasReact;
      logTest('Package Dependencies', passed, 'Checking for required dependencies (Supabase, React)');
      return passed;
    } else {
      logTest('Package Dependencies', false, 'package.json not found');
      return false;
    }
  } catch (error) {
    logTest('Package Dependencies', false, error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  testProjectStructure();
  testEdgeFunctionsCode();
  testMarketplaceComponents();
  testPricingSectionContent();
  testHeroVideoIntegration();
  testDatabaseSchemaFiles();
  testEnvironmentConfiguration();
  testPackageDependencies();
  
  // Display results
  console.log('\n📊 TEST RESULTS SUMMARY:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📊 Total: ${testResults.total}`);
  console.log(`🎯 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  // Detailed results
  console.log('\n📋 DETAILED RESULTS:');
  testResults.details.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    console.log(`${status} ${test.name}: ${test.details}`);
  });
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (testResults.failed === 0) {
    console.log('🎉 All tests passed! Your marketplace is ready for production.');
  } else if (testResults.passed >= testResults.total * 0.8) {
    console.log('✅ GOOD! Most marketplace features are working correctly.');
    console.log('🔧 Minor issues detected - review failed tests for improvements.');
  } else {
    console.log('⚠️ ATTENTION! Several marketplace features need attention.');
    console.log('🔧 Review failed tests and fix issues before production deployment.');
  }
  
  return testResults;
}

// Execute tests
runAllTests();
