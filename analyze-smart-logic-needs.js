#!/usr/bin/env node

/**
 * Analyze Smart Logic Needs Across All Pages
 * Identifies pages and screens that need context-aware, intelligent logic
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Analyzing Smart Logic Needs Across All Pages...\n');

// Function to scan directory for React components
function scanDirectory(dir, results = []) {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git') && !item.includes('dist')) {
        scanDirectory(fullPath, results);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        results.push(fullPath);
      }
    }
  } catch (error) {
    console.log(`Error scanning ${dir}: ${error.message}`);
  }
  
  return results;
}

// Function to analyze file for smart logic needs
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);
    
    const issues = [];
    
    // Check for generic text that should be context-aware
    if (content.includes('Continue to') && !content.includes('intendedRole')) {
      issues.push('Generic "Continue to" text - needs context awareness');
    }
    
    if (content.includes('Create Account') && !content.includes('intendedRole')) {
      issues.push('Generic "Create Account" text - needs role-specific messaging');
    }
    
    if (content.includes('Welcome') && !content.includes('userProfile') && !content.includes('intendedRole')) {
      issues.push('Generic welcome message - needs personalization');
    }
    
    // Check for hardcoded user types
    if (content.includes('client') && content.includes('professional') && !content.includes('intendedRole')) {
      issues.push('Hardcoded user type logic - needs dynamic context');
    }
    
    // Check for generic button text
    if (content.includes('Get Started') && !content.includes('intendedRole')) {
      issues.push('Generic "Get Started" button - needs context awareness');
    }
    
    // Check for generic navigation
    if (content.includes('navigate') && !content.includes('intendedRole') && !content.includes('userProfile')) {
      issues.push('Generic navigation - needs user context');
    }
    
    // Check for generic dashboard content
    if (content.includes('Dashboard') && !content.includes('userProfile') && !content.includes('userRole')) {
      issues.push('Generic dashboard content - needs role-specific content');
    }
    
    // Check for generic onboarding
    if (content.includes('onboarding') && !content.includes('intendedRole') && !content.includes('userRole')) {
      issues.push('Generic onboarding - needs role-specific flow');
    }
    
    // Check for generic messaging
    if (content.includes('message') && !content.includes('userProfile') && !content.includes('intendedRole')) {
      issues.push('Generic messaging - needs personalization');
    }
    
    // Check for generic forms
    if (content.includes('form') && !content.includes('intendedRole') && !content.includes('userRole')) {
      issues.push('Generic form - needs role-specific fields');
    }
    
    return {
      file: relativePath,
      issues: issues,
      hasIssues: issues.length > 0
    };
  } catch (error) {
    return {
      file: filePath,
      issues: ['Error reading file'],
      hasIssues: true
    };
  }
}

// Scan all React files
console.log('📁 Scanning React components...\n');
const srcDir = path.join(process.cwd(), 'src');
const files = scanDirectory(srcDir);

console.log(`Found ${files.length} React files to analyze\n`);

// Analyze each file
const results = files.map(analyzeFile);
const filesWithIssues = results.filter(result => result.hasIssues);

// Categorize issues
const categories = {
  'Authentication & Registration': [],
  'Dashboard & User Interface': [],
  'Navigation & Routing': [],
  'Forms & Input': [],
  'Messaging & Communication': [],
  'Onboarding & Setup': [],
  'Other Components': []
};

filesWithIssues.forEach(result => {
  const filePath = result.file;
  
  if (filePath.includes('auth') || filePath.includes('register') || filePath.includes('login')) {
    categories['Authentication & Registration'].push(result);
  } else if (filePath.includes('dashboard') || filePath.includes('Dashboard')) {
    categories['Dashboard & User Interface'].push(result);
  } else if (filePath.includes('navigation') || filePath.includes('routing') || filePath.includes('Header')) {
    categories['Navigation & Routing'].push(result);
  } else if (filePath.includes('form') || filePath.includes('Form') || filePath.includes('input')) {
    categories['Forms & Input'].push(result);
  } else if (filePath.includes('message') || filePath.includes('Message') || filePath.includes('chat')) {
    categories['Messaging & Communication'].push(result);
  } else if (filePath.includes('onboarding') || filePath.includes('Onboarding') || filePath.includes('setup')) {
    categories['Onboarding & Setup'].push(result);
  } else {
    categories['Other Components'].push(result);
  }
});

// Display results
console.log('🎯 SMART LOGIC ANALYSIS RESULTS\n');

Object.entries(categories).forEach(([category, files]) => {
  if (files.length > 0) {
    console.log(`📂 ${category}:`);
    files.forEach(result => {
      console.log(`   📄 ${result.file}`);
      result.issues.forEach(issue => {
        console.log(`      ⚠️  ${issue}`);
      });
      console.log('');
    });
  }
});

// Summary
console.log('📊 SUMMARY:');
console.log(`   Total files analyzed: ${files.length}`);
console.log(`   Files needing smart logic: ${filesWithIssues.length}`);
console.log(`   Files already smart: ${files.length - filesWithIssues.length}\n`);

// Priority recommendations
console.log('🎯 PRIORITY RECOMMENDATIONS:\n');

console.log('🔥 HIGH PRIORITY:');
console.log('   1. Dashboard components - Need role-specific content');
console.log('   2. Navigation components - Need user context awareness');
console.log('   3. Onboarding flows - Need role-specific steps');
console.log('   4. Form components - Need dynamic field logic\n');

console.log('⚡ MEDIUM PRIORITY:');
console.log('   5. Messaging components - Need personalization');
console.log('   6. Generic buttons - Need context-aware text');
console.log('   7. Welcome messages - Need user-specific content\n');

console.log('📝 LOW PRIORITY:');
console.log('   8. Utility components - May need minor context awareness');
console.log('   9. Static pages - May need user-specific elements\n');

// Specific file recommendations
console.log('🎯 SPECIFIC FILES TO UPDATE:\n');

const highPriorityFiles = filesWithIssues.filter(result => 
  result.file.includes('dashboard') || 
  result.file.includes('Dashboard') ||
  result.file.includes('onboarding') ||
  result.file.includes('Onboarding') ||
  result.file.includes('Header')
);

if (highPriorityFiles.length > 0) {
  console.log('🔥 HIGH PRIORITY FILES:');
  highPriorityFiles.forEach(result => {
    console.log(`   📄 ${result.file}`);
    console.log(`      Issues: ${result.issues.join(', ')}`);
  });
  console.log('');
}

console.log('✨ Analysis complete! Focus on high-priority files for maximum impact.');
console.log('🧠 Smart logic will improve user experience and make the app feel intelligent.');