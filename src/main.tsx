import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Check if React is properly imported
if (!React) {
  console.error('❌ CRITICAL: React is not properly imported!');
  throw new Error('React is not properly imported');
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('❌ Root element not found!');
  throw new Error('Root element not found');
}

const root = createRoot(rootElement);

// Ensure React is available before rendering
if (!React || !React.createElement) {
  console.error('❌ CRITICAL: React is not properly initialized!');
  throw new Error('React is not properly initialized');
}

// Use JSX directly - React.createElement might cause issues
root.render(<App />);