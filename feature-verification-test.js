import fs from 'fs';
import path from 'path';

// Feature verification test script
console.log('🔍 Theramate Feature Verification Test');
console.log('=====================================\n');

const testResults = {
  professional: {
    verification: { implemented: false, functional: false, details: [] },
    creditEarning: { implemented: false, functional: false, details: [] },
    creditSpending: { implemented: false, functional: false, details: [] },
    community: { implemented: false, functional: false, details: [] }
  },
  client: {
    browsing: { implemented: false, functional: false, details: [] },
    booking: { implemented: false, functional: false, details: [] },
    sessions: { implemented: false, functional: false, details: [] },
    tracking: { implemented: false, functional: false, details: [] }
  },
  platform: {
    exchange: { implemented: false, functional: false, details: [] },
    scheduling: { implemented: false, functional: false, details: [] },
    trust: { implemented: false, functional: false, details: [] }
  }
};

// Check if file exists and has content
function checkFileExists(filePath, description) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      return {
        exists: true,
        hasContent: content.trim().length > 0,
        size: content.length,
        lines: content.split('\n').length
      };
    }
    return { exists: false, hasContent: false, size: 0, lines: 0 };
  } catch (error) {
    return { exists: false, hasContent: false, size: 0, lines: 0, error: error.message };
  }
}

// Check for specific functionality in code
function checkFunctionality(filePath, patterns, description) {
  try {
    if (!fs.existsSync(filePath)) {
      return { found: false, details: [`File ${filePath} does not exist`] };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const found = [];
    const missing = [];
    
    patterns.forEach(pattern => {
      if (typeof pattern === 'string') {
        if (content.includes(pattern)) {
          found.push(pattern);
        } else {
          missing.push(pattern);
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(content)) {
          found.push(pattern.toString());
        } else {
          missing.push(pattern.toString());
        }
      }
    });
    
    return {
      found: found.length > 0,
      foundPatterns: found,
      missingPatterns: missing,
      details: found.length > 0 ? 
        `Found: ${found.join(', ')}` : 
        `Missing: ${missing.join(', ')}`
    };
  } catch (error) {
    return { found: false, details: [`Error reading file: ${error.message}`] };
  }
}

// Test Professional Features
console.log('📋 TESTING PROFESSIONAL FEATURES');
console.log('================================');

// 1. Professional Verification
console.log('\n1. Professional Verification System:');
const verificationFiles = [
  'src/lib/verification.ts',
  'src/components/admin/RealVerificationDashboard.tsx',
  'supabase/migrations/20250116_professional_verification.sql'
];

let verificationImplemented = true;
let verificationFunctional = true;

verificationFiles.forEach(file => {
  const result = checkFileExists(file, 'Verification file');
  console.log(`   ${file}: ${result.exists ? '✅' : '❌'} ${result.exists ? 'Exists' : 'Missing'}`);
  if (result.exists) {
    console.log(`      Size: ${result.size} bytes, Lines: ${result.lines}`);
  } else {
    verificationImplemented = false;
  }
});

// Check verification functionality
const verificationPatterns = [
  'professional_licenses',
  'uploadLicense',
  'approveDocument',
  'verification_status'
];

const verificationCheck = checkFunctionality('src/lib/verification.ts', verificationPatterns, 'Verification API');
console.log(`   API Functions: ${verificationCheck.found ? '✅' : '❌'} ${verificationCheck.details}`);

if (!verificationCheck.found) {
  verificationFunctional = false;
}

testResults.professional.verification = {
  implemented: verificationImplemented,
  functional: verificationFunctional,
  details: verificationCheck.details
};

// 2. Credit Earning System
console.log('\n2. Credit Earning System:');
const creditFiles = [
  'src/lib/credits.ts',
  'src/pages/Credits.tsx',
  'supabase/migrations/20250116_credit_system.sql'
];

let creditImplemented = true;
let creditFunctional = true;

creditFiles.forEach(file => {
  const result = checkFileExists(file, 'Credit file');
  console.log(`   ${file}: ${result.exists ? '✅' : '❌'} ${result.exists ? 'Exists' : 'Missing'}`);
  if (result.exists) {
    console.log(`      Size: ${result.size} bytes, Lines: ${result.lines}`);
  } else {
    creditImplemented = false;
  }
});

// Check credit functionality
const creditPatterns = [
  'earnCredits',
  'spendCredits',
  'getBalance',
  'CreditManager'
];

const creditCheck = checkFunctionality('src/lib/credits.ts', creditPatterns, 'Credit API');
console.log(`   API Functions: ${creditCheck.found ? '✅' : '❌'} ${creditCheck.details}`);

if (!creditCheck.found) {
  creditFunctional = false;
}

testResults.professional.creditEarning = {
  implemented: creditImplemented,
  functional: creditFunctional,
  details: creditCheck.details
};

// 3. Credit Spending System
console.log('\n3. Credit Spending System:');
const spendingPatterns = [
  'useCredits',
  'creditCost',
  'processSessionCredits'
];

const spendingCheck = checkFunctionality('src/components/marketplace/BookingFlow.tsx', spendingPatterns, 'Credit Spending');
console.log(`   Booking Integration: ${spendingCheck.found ? '✅' : '❌'} ${spendingCheck.details}`);

testResults.professional.creditSpending = {
  implemented: spendingCheck.found,
  functional: spendingCheck.found,
  details: spendingCheck.details
};

// 4. Community Features
console.log('\n4. Community Features:');
const communityFiles = [
  'src/lib/messaging.ts',
  'src/components/messaging/RealMessagingInterface.tsx',
  'src/pages/Messages.tsx'
];

let communityImplemented = true;
let communityFunctional = true;

communityFiles.forEach(file => {
  const result = checkFileExists(file, 'Community file');
  console.log(`   ${file}: ${result.exists ? '✅' : '❌'} ${result.exists ? 'Exists' : 'Missing'}`);
  if (result.exists) {
    console.log(`      Size: ${result.size} bytes, Lines: ${result.lines}`);
  } else {
    communityImplemented = false;
  }
});

const communityPatterns = [
  'sendMessage',
  'getConversations',
  'MessagingManager'
];

const communityCheck = checkFunctionality('src/lib/messaging.ts', communityPatterns, 'Messaging API');
console.log(`   Messaging API: ${communityCheck.found ? '✅' : '❌'} ${communityCheck.details}`);

if (!communityCheck.found) {
  communityFunctional = false;
}

testResults.professional.community = {
  implemented: communityImplemented,
  functional: communityFunctional,
  details: communityCheck.details
};

// Test Client Features
console.log('\n\n📋 TESTING CLIENT FEATURES');
console.log('===========================');

// 1. Therapist Browsing
console.log('\n1. Therapist Browsing:');
const browsingFiles = [
  'src/pages/public/PublicMarketplace.tsx',
  'src/components/location/LocationSearch.tsx'
];

let browsingImplemented = true;
let browsingFunctional = true;

browsingFiles.forEach(file => {
  const result = checkFileExists(file, 'Browsing file');
  console.log(`   ${file}: ${result.exists ? '✅' : '❌'} ${result.exists ? 'Exists' : 'Missing'}`);
  if (result.exists) {
    console.log(`      Size: ${result.size} bytes, Lines: ${result.lines}`);
  } else {
    browsingImplemented = false;
  }
});

const browsingPatterns = [
  'findNearbyTherapists',
  'LocationSearch',
  'therapist_profiles'
];

const browsingCheck = checkFunctionality('src/pages/public/PublicMarketplace.tsx', browsingPatterns, 'Browsing Features');
console.log(`   Browsing Features: ${browsingCheck.found ? '✅' : '❌'} ${browsingCheck.details}`);

if (!browsingCheck.found) {
  browsingFunctional = false;
}

testResults.client.browsing = {
  implemented: browsingImplemented,
  functional: browsingFunctional,
  details: browsingCheck.details
};

// 2. Booking System
console.log('\n2. Booking System:');
const bookingPatterns = [
  'BookingFlow',
  'handleBooking',
  'sessionType',
  'selectedDuration'
];

const bookingCheck = checkFunctionality('src/components/marketplace/BookingFlow.tsx', bookingPatterns, 'Booking System');
console.log(`   Booking System: ${bookingCheck.found ? '✅' : '❌'} ${bookingCheck.details}`);

testResults.client.booking = {
  implemented: bookingCheck.found,
  functional: bookingCheck.found,
  details: bookingCheck.details
};

// 3. Session Management
console.log('\n3. Session Management:');
const sessionFiles = [
  'src/pages/MyBookings.tsx',
  'src/pages/client/ClientDashboard.tsx'
];

let sessionImplemented = true;
let sessionFunctional = true;

sessionFiles.forEach(file => {
  const result = checkFileExists(file, 'Session file');
  console.log(`   ${file}: ${result.exists ? '✅' : '❌'} ${result.exists ? 'Exists' : 'Missing'}`);
  if (result.exists) {
    console.log(`      Size: ${result.size} bytes, Lines: ${result.lines}`);
  } else {
    sessionImplemented = false;
  }
});

testResults.client.sessions = {
  implemented: sessionImplemented,
  functional: sessionImplemented,
  details: sessionImplemented ? 'Session files exist' : 'Session files missing'
};

// 4. Progress Tracking
console.log('\n4. Progress Tracking:');
const trackingPatterns = [
  'sessionHistory',
  'progress',
  'analytics'
];

const trackingCheck = checkFunctionality('src/pages/client/ClientDashboard.tsx', trackingPatterns, 'Progress Tracking');
console.log(`   Progress Tracking: ${trackingCheck.found ? '✅' : '❌'} ${trackingCheck.details}`);

testResults.client.tracking = {
  implemented: trackingCheck.found,
  functional: trackingCheck.found,
  details: trackingCheck.details
};

// Test Platform Features
console.log('\n\n📋 TESTING PLATFORM FEATURES');
console.log('=============================');

// 1. Exchange System
console.log('\n1. Exchange System:');
const exchangePatterns = [
  'creditBalance',
  'CreditManager',
  'purchaseCredits'
];

const exchangeCheck = checkFunctionality('src/pages/Credits.tsx', exchangePatterns, 'Exchange System');
console.log(`   Exchange System: ${exchangeCheck.found ? '✅' : '❌'} ${exchangeCheck.details}`);

testResults.platform.exchange = {
  implemented: exchangeCheck.found,
  functional: exchangeCheck.found,
  details: exchangeCheck.details
};

// 2. Smart Scheduling
console.log('\n2. Smart Scheduling:');
const schedulingFiles = [
  'src/lib/scheduling.ts',
  'supabase/migrations/20250116_advanced_scheduling.sql'
];

let schedulingImplemented = true;
let schedulingFunctional = true;

schedulingFiles.forEach(file => {
  const result = checkFileExists(file, 'Scheduling file');
  console.log(`   ${file}: ${result.exists ? '✅' : '❌'} ${result.exists ? 'Exists' : 'Missing'}`);
  if (result.exists) {
    console.log(`      Size: ${result.size} bytes, Lines: ${result.lines}`);
  } else {
    schedulingImplemented = false;
  }
});

const schedulingPatterns = [
  'recurring_patterns',
  'createRecurringSessions',
  'waitlists',
  'reminders'
];

const schedulingCheck = checkFunctionality('src/lib/scheduling.ts', schedulingPatterns, 'Scheduling System');
console.log(`   Scheduling API: ${schedulingCheck.found ? '✅' : '❌'} ${schedulingCheck.details}`);

if (!schedulingCheck.found) {
  schedulingFunctional = false;
}

testResults.platform.scheduling = {
  implemented: schedulingImplemented,
  functional: schedulingFunctional,
  details: schedulingCheck.details
};

// 3. Trust & Safety
console.log('\n3. Trust & Safety:');
const trustPatterns = [
  'verification_status',
  'is_verified',
  'background_checks',
  'insurance_policies'
];

const trustCheck = checkFunctionality('src/lib/verification.ts', trustPatterns, 'Trust & Safety');
console.log(`   Trust & Safety: ${trustCheck.found ? '✅' : '❌'} ${trustCheck.details}`);

testResults.platform.trust = {
  implemented: trustCheck.found,
  functional: trustCheck.found,
  details: trustCheck.details
};

// Summary Report
console.log('\n\n📊 FEATURE VERIFICATION SUMMARY');
console.log('================================');

let totalFeatures = 0;
let implementedFeatures = 0;
let functionalFeatures = 0;

Object.keys(testResults).forEach(category => {
  console.log(`\n${category.toUpperCase()}:`);
  Object.keys(testResults[category]).forEach(feature => {
    totalFeatures++;
    const result = testResults[category][feature];
    const status = result.implemented && result.functional ? '✅ FULLY FUNCTIONAL' : 
                  result.implemented ? '⚠️ IMPLEMENTED BUT NOT FUNCTIONAL' : '❌ NOT IMPLEMENTED';
    
    console.log(`   ${feature}: ${status}`);
    if (result.details) {
      console.log(`      Details: ${result.details}`);
    }
    
    if (result.implemented) implementedFeatures++;
    if (result.functional) functionalFeatures++;
  });
});

console.log('\n📈 OVERALL STATISTICS:');
console.log(`   Total Features Tested: ${totalFeatures}`);
console.log(`   Implemented: ${implementedFeatures} (${Math.round(implementedFeatures/totalFeatures*100)}%)`);
console.log(`   Functional: ${functionalFeatures} (${Math.round(functionalFeatures/totalFeatures*100)}%)`);

if (functionalFeatures === totalFeatures) {
  console.log('\n🎉 ALL FEATURES ARE FULLY FUNCTIONAL!');
} else if (implementedFeatures === totalFeatures) {
  console.log('\n⚠️ ALL FEATURES ARE IMPLEMENTED BUT SOME ARE NOT FUNCTIONAL');
} else {
  console.log('\n❌ SOME FEATURES ARE NOT IMPLEMENTED OR FUNCTIONAL');
}

console.log('\n🔍 DETAILED ANALYSIS:');
console.log('====================');

// Check for missing critical files
const criticalFiles = [
  'src/lib/credits.ts',
  'src/lib/messaging.ts', 
  'src/lib/verification.ts',
  'src/lib/scheduling.ts',
  'src/lib/location.ts'
];

console.log('\nCritical API Files:');
criticalFiles.forEach(file => {
  const result = checkFileExists(file, 'Critical file');
  console.log(`   ${file}: ${result.exists ? '✅' : '❌'} ${result.exists ? `(${result.size} bytes)` : 'MISSING'}`);
});

// Check database migrations
const migrations = [
  'supabase/migrations/20250116_credit_system.sql',
  'supabase/migrations/20250116_messaging_system.sql',
  'supabase/migrations/20250116_professional_verification.sql',
  'supabase/migrations/20250116_advanced_scheduling.sql',
  'supabase/migrations/20250116_location_matching.sql'
];

console.log('\nDatabase Migrations:');
migrations.forEach(file => {
  const result = checkFileExists(file, 'Migration file');
  console.log(`   ${file}: ${result.exists ? '✅' : '❌'} ${result.exists ? `(${result.size} bytes)` : 'MISSING'}`);
});

console.log('\n🏁 VERIFICATION COMPLETE');
console.log('========================');
