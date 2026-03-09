const fs = require('fs');
const path = require('path');

console.log('🔍 Testing AuthCallback component loading...');

// Check if AuthCallback component exists and is syntactically correct
const authCallbackPath = path.join(__dirname, 'src/components/auth/AuthCallback.tsx');

if (!fs.existsSync(authCallbackPath)) {
  console.log('❌ AuthCallback component file does not exist');
  process.exit(1);
}

const content = fs.readFileSync(authCallbackPath, 'utf8');

// Check for basic syntax
const issues = [];

// Check for proper React imports
if (!content.includes('import { useEffect, useState } from "react"')) {
  issues.push('Missing React hooks import');
}

if (!content.includes('import { useNavigate } from "react-router-dom"')) {
  issues.push('Missing useNavigate import');
}

if (!content.includes('import { useAuth } from "@/contexts/AuthContext"')) {
  issues.push('Missing useAuth import');
}

// Check for proper component structure
if (!content.includes('const AuthCallback = () => {')) {
  issues.push('Component function declaration missing');
}

if (!content.includes('console.log(\'🔍 AuthCallback: Component loaded\');')) {
  issues.push('Debug log missing');
}

if (!content.includes('export default AuthCallback;')) {
  issues.push('Export statement missing');
}

// Check for proper useEffect structure
if (!content.includes('useEffect(() => {')) {
  issues.push('useEffect missing');
}

if (!content.includes('const timeout = setTimeout(() => {')) {
  issues.push('Timeout setup missing');
}

if (issues.length === 0) {
  console.log('✅ AuthCallback component syntax is correct');
} else {
  console.log('❌ AuthCallback component issues:');
  issues.forEach(issue => console.log('  -', issue));
}

// Check if the component is properly imported in AppContent
const appContentPath = path.join(__dirname, 'src/components/AppContent.tsx');
const appContent = fs.readFileSync(appContentPath, 'utf8');

if (appContent.includes('import AuthCallback from "../components/auth/AuthCallback"')) {
  console.log('✅ AuthCallback properly imported in AppContent');
} else {
  console.log('❌ AuthCallback import missing in AppContent');
}

if (appContent.includes('<Route path="/auth/callback" element={<AuthCallback />} />')) {
  console.log('✅ AuthCallback route properly configured');
} else {
  console.log('❌ AuthCallback route missing');
}

console.log('\n🔍 The issue is likely that AuthProvider loading state is stuck at true');
console.log('This prevents any components from rendering, including AuthCallback');
console.log('\nNext steps:');
console.log('1. Check browser console for JavaScript errors');
console.log('2. Verify AuthProvider loading state is being set to false');
console.log('3. Check if there are any React rendering loops');
