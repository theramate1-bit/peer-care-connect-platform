#!/usr/bin/env node
/**
 * Compare edge function folder names: canonical vs legacy.
 *   npm run supabase:functions:compare
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canonicalDir = path.join(root, "supabase/functions");
const legacyDir = path.join(root, "peer-care-connect/supabase/functions");

function listFns(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name)
    .sort();
}

const canonical = new Set(listFns(canonicalDir));
const legacy = new Set(listFns(legacyDir));

const onlyCanonical = [...canonical].filter((n) => !legacy.has(n));
const onlyLegacy = [...legacy].filter((n) => !canonical.has(n));
const both = [...canonical].filter((n) => legacy.has(n));

console.log("Edge functions (folder names)\n");
console.log(`  Canonical: ${canonical.size}`);
console.log(`  Legacy:    ${legacy.size}`);
console.log(`  In both:   ${both.length}`);
console.log(`  Only canonical: ${onlyCanonical.length}`);
console.log(`  Only legacy:    ${onlyLegacy.length}\n`);

if (onlyCanonical.length) {
  console.log("Deploy these from supabase/functions/:");
  onlyCanonical.forEach((n) => console.log(`  + ${n}`));
  console.log("");
}

const aliases = [
  ["stripe-webhooks", "stripe-webhook"],
  ["send-booking-notification", "send-booking-notification"],
];
for (const [canon, leg] of aliases) {
  if (onlyCanonical.includes(canon) && onlyLegacy.some((l) => l.includes(leg))) {
    console.log(`Note: possible rename ${leg} (legacy) → ${canon} (canonical)`);
  }
}

if (onlyLegacy.length > 0) {
  console.log("\nLegacy-only (first 15) — do not deploy:");
  onlyLegacy.slice(0, 15).forEach((n) => console.log(`  - ${n}`));
}

console.log("\nSee supabase/DEPLOY.md");
