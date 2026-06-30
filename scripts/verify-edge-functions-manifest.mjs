#!/usr/bin/env node
/**
 * Ensure supabase/functions on disk matches manifest.json (canonical deploy set).
 *   npm run supabase:verify:functions
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fnDir = path.join(root, "supabase/functions");
const manifestPath = path.join(fnDir, "manifest.json");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const expected = new Set(manifest.functions);

const onDisk = fs
  .readdirSync(fnDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
  .map((d) => d.name);

const diskSet = new Set(onDisk);
const missing = [...expected].filter((n) => !diskSet.has(n));
const extra = onDisk.filter((n) => !expected.has(n));

console.log(`Edge functions manifest (${expected.size} expected, ${onDisk.length} on disk)\n`);

if (missing.length) {
  console.error("Missing on disk:");
  missing.forEach((n) => console.error(`  - ${n}`));
}
if (extra.length) {
  console.error("On disk but not in manifest.json (update manifest or remove):");
  extra.forEach((n) => console.error(`  + ${n}`));
}

if (missing.length || extra.length) {
  console.error("\nFix supabase/functions/manifest.json and folder layout before deploy.");
  process.exit(1);
}

console.log("OK — manifest matches supabase/functions/");
process.exit(0);
