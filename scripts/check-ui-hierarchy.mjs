#!/usr/bin/env node
/**
 * Web UI hierarchy guard: nav/sidebar hrefs must resolve in AppContent route table.
 *   npm run check:ui-hierarchy
 *   UI_HIERARCHY_STRICT=1 npm run check:ui-hierarchy
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.env.UI_HIERARCHY_STRICT === "1";
const ci = process.env.CI === "1";

const APP_CONTENT = path.join(
  root,
  "peer-care-connect/src/components/AppContent.tsx",
);

const NAV_SOURCES = [
  {
    file: path.join(
      root,
      "peer-care-connect/src/components/navigation/RoleBasedNavigation.tsx",
    ),
    label: "RoleBasedNavigation",
    pattern: /href:\s*['"](\/[^'"]+)['"]/g,
  },
  {
    file: path.join(
      root,
      "peer-care-connect/src/components/settings/SettingsSidebar.tsx",
    ),
    label: "SettingsSidebar",
    pattern: /href:\s*['"](\/[^'"]+)['"]/g,
  },
  {
    file: path.join(root, "peer-care-connect/src/pages/FindTherapists.tsx"),
    label: "FindTherapists breadcrumbs",
    pattern: /href:\s*["'](\/[^"']+)["']/g,
  },
  {
    file: path.join(root, "peer-care-connect/src/pages/MyBookings.tsx"),
    label: "MyBookings breadcrumbs",
    pattern: /href:\s*["'](\/[^"']+)["']/g,
  },
  {
    file: path.join(root, "peer-care-connect/src/components/Footer.tsx"),
    label: "Footer",
    pattern: /(?:href|to)=["'](\/[^"']+)["']/g,
  },
  {
    file: path.join(root, "peer-care-connect/src/components/FooterClean.tsx"),
    label: "FooterClean",
    pattern: /(?:href|to)=["'](\/[^"']+)["']/g,
  },
];

/** Paths registered in AppContent or intentional aliases (redirect targets). */
function extractAppContentPaths(text) {
  const paths = new Set();
  const routeRe = /path=["'](\/[^"']*)["']/g;
  let m;
  while ((m = routeRe.exec(text))) {
    paths.add(m[1]);
  }
  return paths;
}

function extractLinkedPaths(file, pattern) {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, "utf8");
  const out = new Set();
  let m;
  while ((m = pattern.exec(text))) out.add(m[1]);
  return [...out];
}

function routeMatches(pathname, registered) {
  if (registered.has(pathname)) return true;
  for (const r of registered) {
    if (r.includes(":")) {
      const prefix = r.split(":")[0];
      if (pathname.startsWith(prefix) && pathname.length > prefix.length) {
        return true;
      }
    }
  }
  return false;
}

function main() {
  if (!fs.existsSync(APP_CONTENT)) {
    console.error(`Missing ${APP_CONTENT}`);
    process.exit(1);
  }

  const appText = fs.readFileSync(APP_CONTENT, "utf8");
  const registered = extractAppContentPaths(appText);

  const issues = [];
  const linked = new Map();

  for (const src of NAV_SOURCES) {
    for (const href of extractLinkedPaths(src.file, src.pattern)) {
      if (!linked.has(href)) linked.set(href, []);
      linked.get(href).push(src.label);
    }
  }

  for (const [href, sources] of linked) {
    const pathname = href.split("?")[0].split("#")[0];
    if (!routeMatches(pathname, registered)) {
      issues.push({ href, sources });
    }
  }

  console.log("UI hierarchy check (web nav → AppContent routes)");
  console.log(`  Registered routes: ${registered.size}`);
  console.log(`  Nav hrefs scanned: ${linked.size}`);

  if (issues.length === 0) {
    console.log("  ✓ All nav hrefs resolve in AppContent");
    return;
  }

  for (const { href, sources } of issues) {
    console.log(`  ✗ ${href} (${sources.join(", ")}) — no matching route`);
  }

  if (strict || ci) {
    process.exit(1);
  }
  console.log(
    "\n  Run with UI_HIERARCHY_STRICT=1 to fail on unresolved nav links.",
  );
}

main();
