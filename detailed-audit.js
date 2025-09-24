#!/usr/bin/env node

import fs from 'fs';

// More detailed feature audit focusing on actual functionality
const detailedFeatures = {
  'Professional Verification': {
    files: ['src/pages/admin/VerificationDashboard.tsx'],
    checkFunction: (content) => {
      return content.includes('verification') && 
             content.includes('license') && 
             content.includes('upload');
    },
    description: 'License upload and verification system'
  },
  'Credit System (Functional)': {
    files: ['src/pages/Credits.tsx', 'src/pages/payments/Payments.tsx'],
    checkFunction: (content) => {
      // Check if there's actual credit earning/spending logic, not just UI
      return content.includes('earnCredits') || 
             content.includes('spendCredits') || 
             content.includes('creditBalance') ||
             content.includes('supabase') && content.includes('credit');
    },
    description: 'Actual credit earning/spending functionality'
  },
  'Real-time Booking': {
    files: ['src/pages/client/ClientBooking.tsx', 'src/components/booking/BookingCalendar.tsx'],
    checkFunction: (content) => {
      return content.includes('supabase') && 
             content.includes('booking') && 
             content.includes('session');
    },
    description: 'Database-backed booking system'
  },
  'Messaging System (Functional)': {
    files: ['src/pages/Messages.tsx', 'src/components/messaging/MessageDisplay.tsx'],
    checkFunction: (content) => {
      return content.includes('supabase') && 
             content.includes('message') && 
             content.includes('insert') || content.includes('select');
    },
    description: 'Database-backed messaging system'
  },
  'Session Management (Functional)': {
    files: ['src/pages/client/ClientSessions.tsx', 'src/pages/practice/SessionRecording.tsx'],
    checkFunction: (content) => {
      return content.includes('supabase') && 
             content.includes('session') && 
             (content.includes('insert') || content.includes('select'));
    },
    description: 'Database-backed session tracking'
  },
  'Review System (Functional)': {
    files: ['src/pages/Reviews.tsx', 'src/pages/reviews/SubmitReview.tsx'],
    checkFunction: (content) => {
      return content.includes('supabase') && 
             content.includes('review') && 
             (content.includes('insert') || content.includes('select'));
    },
    description: 'Database-backed review system'
  },
  'Recurring Sessions': {
    files: ['src/pages/client/ClientBooking.tsx', 'src/pages/practice/AppointmentScheduler.tsx'],
    checkFunction: (content) => {
      return content.includes('recurring') || 
             content.includes('repeat') || 
             content.includes('recurringSessions');
    },
    description: 'Recurring appointment functionality'
  },
  'Auto-reminders (Functional)': {
    files: ['src/pages/practice/AppointmentScheduler.tsx'],
    checkFunction: (content) => {
      return content.includes('reminder') && 
             (content.includes('supabase') || content.includes('notification'));
    },
    description: 'Actual reminder/notification system'
  },
  'Waitlist Management (Functional)': {
    files: ['src/pages/practice/AppointmentScheduler.tsx'],
    checkFunction: (content) => {
      return content.includes('waitlist') && 
             content.includes('queue') && 
             content.includes('supabase');
    },
    description: 'Database-backed waitlist system'
  },
  'Location Matching (Functional)': {
    files: ['src/pages/FindTherapists.tsx', 'src/pages/public/PublicMarketplace.tsx'],
    checkFunction: (content) => {
      return content.includes('location') && 
             content.includes('distance') && 
             content.includes('supabase');
    },
    description: 'Database-backed location matching'
  }
};

function checkDetailedFeature(featureName, feature) {
  console.log(`\n🔍 Detailed Check: ${featureName}`);
  console.log(`Description: ${feature.description}`);
  
  let implemented = false;
  let foundInFiles = [];
  
  for (const file of feature.files) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      if (feature.checkFunction(content)) {
        implemented = true;
        foundInFiles.push(file);
      }
    }
  }
  
  if (implemented) {
    console.log(`✅ FUNCTIONAL - Found in: ${foundInFiles.join(', ')}`);
  } else {
    console.log(`❌ NOT FUNCTIONAL - Only UI/mockup found`);
  }
  
  return implemented;
}

function main() {
  console.log('🔍 Theramate Detailed Feature Audit');
  console.log('====================================');
  console.log('Checking for actual functionality vs. just UI...\n');
  
  let functionalCount = 0;
  let totalCount = 0;
  
  for (const [featureName, feature] of Object.entries(detailedFeatures)) {
    totalCount++;
    if (checkDetailedFeature(featureName, feature)) {
      functionalCount++;
    }
  }
  
  console.log('\n📊 DETAILED AUDIT SUMMARY');
  console.log('==========================');
  console.log(`Total Features Checked: ${totalCount}`);
  console.log(`Fully Functional: ${functionalCount}`);
  console.log(`UI Only/Mockup: ${totalCount - functionalCount}`);
  console.log(`Functionality Rate: ${Math.round((functionalCount / totalCount) * 100)}%`);
  
  if (functionalCount < totalCount) {
    console.log('\n⚠️  WARNING: Some features are UI-only without backend functionality!');
  } else {
    console.log('\n🎉 All features are fully functional!');
  }
}

main();
