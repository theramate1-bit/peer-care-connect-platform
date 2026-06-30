#!/usr/bin/env node
/**
 * Run all UI / route hierarchy guards (strict).
 *   npm run check:hierarchy
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const checks = [
  ["check:ui-hierarchy", "UI_HIERARCHY_STRICT"],
  ["check:route-inventory", "ROUTE_INVENTORY_STRICT"],
  ["check:mobile-chrome", "MOBILE_CHROME_STRICT"],
  ["check:deep-link-routes", "DEEP_LINK_STRICT"],
  ["check:universal-links", "UNIVERSAL_LINKS_STRICT"],
];

let failed = 0;

console.log("Hierarchy checks (web nav + mobile routes + chrome + deep links)\n");

for (const [script, envKey] of checks) {
  console.log(`▶ ${script}`);
  const r = spawnSync(npmCmd, ["run", script], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, [envKey]: "1", CI: "1" },
  });
  if (r.status !== 0) failed++;
  console.log(r.status === 0 ? `✓ ${script}\n` : `✗ ${script}\n`);
}

if (failed) {
  console.error(`${failed} hierarchy check(s) failed.`);
  process.exit(1);
}

console.log("All hierarchy checks passed.");
