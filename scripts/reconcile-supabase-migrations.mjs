#!/usr/bin/env node
/**
 * Full migration reconciliation report (local trees vs each other).
 *   npm run supabase:migrations:reconcile
 *   RECONCILE_WRITE_REPORT=1  — default writes docs/architecture/reports/
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canonicalDir = path.join(root, "supabase/migrations");
const legacyDir = path.join(root, "peer-care-connect/supabase/migrations");
const writeReport = process.env.RECONCILE_WRITE_REPORT !== "0";

function listSql(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

const canonical = listSql(canonicalDir);
const legacy = listSql(legacyDir);
const canonicalSet = new Set(canonical);
const legacySet = new Set(legacy);

const bothNames = canonical.filter((f) => legacySet.has(f));
const onlyCanonical = canonical.filter((f) => !legacySet.has(f));
const onlyLegacy = legacy.filter((f) => !canonicalSet.has(f));

const divergent = [];
for (const name of bothNames) {
  const a = path.join(canonicalDir, name);
  const b = path.join(legacyDir, name);
  const ha = sha256File(a);
  const hb = sha256File(b);
  if (ha !== hb) {
    divergent.push({ name, canonicalHash: ha, legacyHash: hb });
  }
}

const lines = [];
const section = (t) => {
  lines.push(t);
  console.log(t);
};

section("# Supabase migration reconciliation (local)\n");
section(`Generated: ${new Date().toISOString()}\n`);
section("## Summary\n");
section(`| Metric | Count |`);
section(`| ------ | ----- |`);
section(`| Canonical \`supabase/migrations/\` | ${canonical.length} |`);
section(`| Legacy \`peer-care-connect/supabase/migrations/\` | ${legacy.length} |`);
section(`| Same filename in both | ${bothNames.length} |`);
section(`| **Content divergent (same name)** | **${divergent.length}** |`);
section(`| Only in canonical | ${onlyCanonical.length} |`);
section(`| Only in legacy | ${onlyLegacy.length} |\n`);

if (divergent.length) {
  section("## ⚠ Divergent files (same name, different SQL)\n");
  section("Resolve before any merge — production may match one version only.\n");
  for (const d of divergent) {
    section(`- \`${d.name}\` — canonical \`${d.canonicalHash}\` vs legacy \`${d.legacyHash}\``);
  }
  section("");
}

section("## Policy\n");
section("- **New migrations:** `supabase/migrations/` only (CI blocks legacy adds).");
section("- **Legacy tree:** frozen; do not deploy from `peer-care-connect/supabase/`.");
section("- **Remote truth:** compare with `supabase migration list` on linked project.\n");

section("## Wave 1 reconciliation (recommended order)\n");
section("1. Export `list_migrations` from Supabase Dashboard for project `aikqnvltuwwgifuocvto`.");
section("2. Mark each legacy-only file as *applied remotely* or *obsolete*.");
section("3. For divergent filenames, pick canonical file and archive legacy copy.");
section("4. Never `db push` from legacy folder.\n");

if (onlyLegacy.length > 0) {
  section(`## Legacy-only sample (first 20 of ${onlyLegacy.length})\n`);
  onlyLegacy.slice(0, 20).forEach((f) => section(`- ${f}`));
  if (onlyLegacy.length > 20) section(`- … +${onlyLegacy.length - 20} more`);
  section("");
}

if (writeReport) {
  const dir = path.join(root, "docs/architecture/reports");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const out = path.join(dir, `migration-reconcile-${stamp}.md`);
  fs.writeFileSync(out, lines.join("\n") + "\n");
  section(`\nReport: ${path.relative(root, out)}`);
}

process.exit(divergent.length > 0 && process.env.RECONCILE_STRICT === "1" ? 1 : 0);
