#!/usr/bin/env node
/**
 * Universal Links / App Links guard.
 *
 * Local (CI): AASA + assetlinks exist, parse, match bundle/team from eas.json.
 * Optional prod probe: UNIVERSAL_LINKS_PROBE=1 curls theramate.co.uk (warn unless strict).
 *
 *   npm run check:universal-links
 *   UNIVERSAL_LINKS_STRICT=1 UNIVERSAL_LINKS_PROBE=1 npm run check:universal-links
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.env.UNIVERSAL_LINKS_STRICT === "1";
const probe = process.env.UNIVERSAL_LINKS_PROBE === "1";
const ci = process.env.CI === "1";

const publicDir = path.join(root, "peer-care-connect/public");
const aasaPath = path.join(
  publicDir,
  ".well-known/apple-app-site-association",
);
const assetlinksPath = path.join(publicDir, ".well-known/assetlinks.json");
const easPath = path.join(root, "theramate-ios-client/eas.json");

const REQUIRED_AASA_PREFIXES = [
  "/book/",
  "/booking/",
  "/booking-success",
  "/mobile-booking/",
  "/practice/exchange-requests",
  "/auth/callback",
  "/therapist/",
];

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  return false;
}

function readJson(filePath, label) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch {
    fail(`${label} missing at ${path.relative(root, filePath)}`);
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    fail(`${label} is not valid JSON: ${e.message}`);
    return null;
  }
}

function extractAasaPaths(aasa) {
  const paths = [];
  const details = aasa?.applinks?.details ?? [];
  for (const detail of details) {
    if (Array.isArray(detail.paths)) {
      paths.push(...detail.paths);
    }
    for (const component of detail.components ?? []) {
      if (component["/"]) paths.push(component["/"]);
    }
  }
  return paths;
}

function pathPatternMatchesPrefix(pattern, prefix) {
  const normalized = pattern.replace(/\*+$/, "");
  return prefix.startsWith(normalized) || pattern.startsWith(prefix);
}

function checkLocalFiles() {
  console.log("Universal Links — local files");
  let ok = true;

  const eas = readJson(easPath, "eas.json");
  if (!eas) return false;

  const teamId = eas.submit?.production?.ios?.appleTeamId;
  const bundleId = eas.submit?.production?.ios?.bundleIdentifier;
  const expectedAppId = teamId && bundleId ? `${teamId}.${bundleId}` : null;

  const aasa = readJson(aasaPath, "apple-app-site-association");
  if (!aasa) return false;

  const details = aasa?.applinks?.details ?? [];
  if (details.length === 0) {
    ok = fail("AASA has no applinks.details entries");
  }

  const appIds = new Set();
  for (const detail of details) {
    for (const id of detail.appIDs ?? []) appIds.add(id);
    if (detail.appID) appIds.add(detail.appID);
  }

  if (expectedAppId && !appIds.has(expectedAppId)) {
    ok = fail(
      `AASA appIDs ${[...appIds].join(", ") || "(none)"} — expected ${expectedAppId}`,
    );
  } else if (expectedAppId) {
    console.log(`  ✓ AASA appID ${expectedAppId}`);
  }

  const aasaPaths = extractAasaPaths(aasa);
  for (const prefix of REQUIRED_AASA_PREFIXES) {
    const covered = aasaPaths.some((p) => pathPatternMatchesPrefix(p, prefix));
    if (!covered) {
      ok = fail(`AASA missing path coverage for ${prefix}`);
    }
  }
  if (ok) {
    console.log(`  ✓ AASA covers ${REQUIRED_AASA_PREFIXES.length} required prefixes`);
  }

  const headersPath = path.join(publicDir, "_headers");
  if (!fs.existsSync(headersPath)) {
    ok = fail("_headers missing — Netlify may serve AASA as text/html");
  } else {
    const headers = fs.readFileSync(headersPath, "utf8");
    if (!headers.includes("apple-app-site-association")) {
      ok = fail("_headers missing Content-Type for apple-app-site-association");
    } else {
      console.log("  ✓ _headers sets JSON content-type for .well-known");
    }
  }

  const assetlinks = readJson(assetlinksPath, "assetlinks.json");
  if (!assetlinks) return false;

  const entry = Array.isArray(assetlinks) ? assetlinks[0] : null;
  const pkg = entry?.target?.package_name;
  if (pkg !== bundleId) {
    ok = fail(`assetlinks package_name ${pkg ?? "(missing)"} — expected ${bundleId}`);
  } else {
    console.log(`  ✓ assetlinks package ${pkg}`);
  }

  const fingerprints = entry?.target?.sha256_cert_fingerprints ?? [];
  if (fingerprints.length === 0) {
    console.warn(
      "  ⚠ assetlinks sha256_cert_fingerprints empty — Android App Links need EAS signing cert",
    );
  }

  return ok;
}

async function probeProduction() {
  console.log("\nUniversal Links — production probe (theramate.co.uk)");
  const url = "https://theramate.co.uk/.well-known/apple-app-site-association";
  let res;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json" },
      redirect: "follow",
    });
  } catch (e) {
    console.warn(`  ⚠ Could not fetch ${url}: ${e.message}`);
    return !strict;
  }

  const contentType = res.headers.get("content-type") ?? "";
  const body = await res.text();
  const looksHtml =
    contentType.includes("text/html") || body.trimStart().startsWith("<!");

  if (!res.ok) {
    console.warn(`  ⚠ ${url} returned HTTP ${res.status}`);
    return !strict;
  }

  if (looksHtml) {
    console.warn(
      "  ⚠ Production AASA returns HTML (SPA fallback) — deploy public/.well-known/ and verify",
    );
    return !strict;
  }

  try {
    const json = JSON.parse(body);
    const paths = extractAasaPaths(json);
    console.log(`  ✓ Production AASA JSON (${paths.length} path rules)`);
    return true;
  } catch {
    console.warn("  ⚠ Production AASA response is not JSON");
    return !strict;
  }
}

async function main() {
  const localOk = checkLocalFiles();
  let probeOk = true;
  if (probe) {
    probeOk = await probeProduction();
  } else {
    console.log(
      "\n  ℹ Set UNIVERSAL_LINKS_PROBE=1 to curl production after deploy",
    );
  }

  const passed = localOk && probeOk;
  if (!passed && (strict || ci)) {
    process.exit(1);
  }
  if (!passed) {
    console.log("\n  Run with UNIVERSAL_LINKS_STRICT=1 to fail.");
    process.exit(1);
  }
  console.log("\nUniversal Links check passed.");
}

main();
