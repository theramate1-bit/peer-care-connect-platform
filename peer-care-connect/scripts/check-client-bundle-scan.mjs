#!/usr/bin/env node
/**
 * Fail builds if Stripe secret keys appear in the Vite client bundle (dist/).
 * Standalone copy for Vercel Root Directory = peer-care-connect.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(packageRoot, "dist");

const FORBIDDEN = [
  { label: "Stripe live secret key", pattern: /sk_live_[A-Za-z0-9]{20,}/g },
  { label: "Stripe test secret key", pattern: /sk_test_[A-Za-z0-9]{20,}/g },
  { label: "Stripe webhook secret", pattern: /whsec_[A-Za-z0-9]{20,}/g },
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (/\.(js|css|html|json|map)$/i.test(name)) out.push(full);
  }
  return out;
}

if (!fs.existsSync(distDir)) {
  console.error(`Missing build output: ${distDir}`);
  console.error("Run: npm run build");
  process.exit(1);
}

const hits = [];
for (const file of walk(distDir)) {
  const text = fs.readFileSync(file, "utf8");
  for (const { label, pattern } of FORBIDDEN) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) {
      hits.push({
        label,
        file: path.relative(packageRoot, file),
        sample: `${match[0].slice(0, 12)}…`,
      });
    }
  }
}

if (hits.length === 0) {
  console.log("✓ Client bundle secret scan passed (no sk_* / whsec_* in dist/)");
  process.exit(0);
}

console.error("SECURITY: Forbidden secrets found in client build output:\n");
for (const h of hits) {
  console.error(`  • ${h.label} in ${h.file} (${h.sample})`);
}
console.error(`
Fix hosting env (Vercel → Project → Settings → Environment Variables):
  • REMOVE VITE_STRIPE_SECRET_KEY and VITE_STRIPE_WEBHOOK_SECRET if present
  • VITE_STRIPE_PUBLISHABLE_KEY must be pk_live_* or pk_test_* only (or unset for hosted checkout)
  • STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET belong in Supabase Edge secrets only

Then rotate the exposed Stripe secret key in the Stripe Dashboard and redeploy.
`);
process.exit(1);
