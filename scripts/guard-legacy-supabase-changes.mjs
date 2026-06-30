#!/usr/bin/env node
/**
 * Fail CI if new files are added under frozen legacy Supabase trees.
 *   node scripts/guard-legacy-supabase-changes.mjs
 *
 * Env:
 *   GUARD_BASE_SHA — compare against this commit (PR base or push "before")
 *   GUARD_HEAD_SHA — default HEAD
 */
import { execSync } from "node:child_process";

const FROZEN_PREFIXES = [
  "peer-care-connect/supabase/migrations/",
  "peer-care-connect/supabase/functions/",
];

const base = process.env.GUARD_BASE_SHA?.trim() || "HEAD~1";
const head = process.env.GUARD_HEAD_SHA?.trim() || "HEAD";

let names = "";
try {
  names = execSync(`git diff --name-only --diff-filter=A ${base} ${head}`, {
    encoding: "utf8",
  });
} catch (e) {
  console.warn(
    `guard-legacy-supabase: could not diff ${base}..${head} (${e.message}) — skipping`,
  );
  process.exit(0);
}

const added = names
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean);

const violations = added.filter((p) =>
  FROZEN_PREFIXES.some((prefix) => p.startsWith(prefix)),
);

if (violations.length === 0) {
  console.log(`OK — no new files under frozen peer-care-connect/supabase/ (${added.length} other adds)`);
  process.exit(0);
}

console.error("New files under FROZEN legacy Supabase paths:\n");
for (const v of violations) {
  console.error(`  ✗ ${v}`);
}
console.error(
  "\nAdd migrations to supabase/migrations/ and edge functions to supabase/functions/ only.",
);
console.error("See docs/architecture/CANONICAL_PATHS.md");
process.exit(1);
