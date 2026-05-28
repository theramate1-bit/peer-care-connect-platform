/**
 * Verifies that the Connect.js CSP proxy fix is in place.
 * Run after build: node scripts/verify-connect-proxy.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const distDir = path.join(__dirname, '..', 'dist');
const assetsDir = path.join(distDir, 'assets');

function main() {
  let ok = true;

  // 1. Check that EmbeddedStripeOnboarding chunk contains proxy logic
  const files = fs.readdirSync(assetsDir).filter((f) => f.startsWith('EmbeddedStripeOnboarding-') && f.endsWith('.js'));
  if (files.length === 0) {
    console.error('❌ No EmbeddedStripeOnboarding chunk found in dist/assets');
    ok = false;
  } else {
    const content = fs.readFileSync(path.join(assetsDir, files[0]), 'utf8');
    if (!content.includes('/api/proxy/connect')) {
      console.error('❌ EmbeddedStripeOnboarding chunk does NOT contain /api/proxy/connect (proxy not in bundle)');
      ok = false;
    } else {
      console.log('✅ EmbeddedStripeOnboarding bundle loads Connect.js from /api/proxy/connect');
    }
  }

  // 2. Check that API proxy file exists
  const apiConnect = path.join(__dirname, '..', 'api', 'proxy', 'connect.js');
  if (!fs.existsSync(apiConnect)) {
    console.error('❌ API proxy not found at peer-care-connect/api/proxy/connect.js');
    ok = false;
  } else {
    console.log('✅ API proxy file exists at api/proxy/connect.js');
  }

  if (ok) {
    console.log('\n✓ CSP proxy fix is in place. Deploy and ensure Vercel serves api/proxy/connect (no Dashboard CSP override).');
  } else {
    process.exit(1);
  }
}

main();
