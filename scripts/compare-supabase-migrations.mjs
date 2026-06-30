#!/usr/bin/env node
/**
 * Compare migration filenames: canonical supabase/migrations vs legacy peer-care-connect/supabase/migrations.
 *   node scripts/compare-supabase-migrations.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canonicalDir = path.join(root, "supabase/migrations");
const legacyDir = path.join(root, "peer-care-connect/supabase/migrations");

function listSql(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

const canonical = new Set(listSql(canonicalDir));
const legacy = new Set(listSql(legacyDir));

const onlyCanonical = [...canonical].filter((f) => !legacy.has(f));
const onlyLegacy = [...legacy].filter((f) => !canonical.has(f));
const both = [...canonical].filter((f) => legacy.has(f));

console.log("Supabase migration inventory\n");
console.log(`  Canonical (supabase/migrations):     ${canonical.size}`);
console.log(`  Legacy (peer-care-connect/supabase): ${legacy.size}`);
console.log(`  Same filename in both:               ${both.length}`);
console.log(`  Only in canonical:                   ${onlyCanonical.length}`);
console.log(`  Only in legacy:                      ${onlyLegacy.length}`);

if (onlyLegacy.length > 0) {
  console.log("\n⚠ Legacy-only files (first 15):");
  onlyLegacy.slice(0, 15).forEach((f) => console.log(`    ${f}`));
  if (onlyLegacy.length > 15) console.log(`    … +${onlyLegacy.length - 15} more`);
}

console.log("\n→ Add new migrations only under supabase/migrations/");
console.log("→ See peer-care-connect/supabase/README.md");

process.exit(onlyLegacy.length > 0 && process.env.MIGRATION_COMPARE_STRICT === "1" ? 1 : 0);
