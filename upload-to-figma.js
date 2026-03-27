/**
 * Script to upload screenshots to Figma
 *
 * This script uses the Figma REST API to create a new file and upload screenshots as images.
 *
 * Prerequisites:
 * 1. Get a Figma Personal Access Token from: https://www.figma.com/developers/api#access-tokens
 * 2. Set it as an environment variable: FIGMA_ACCESS_TOKEN
 * 3. Install dependencies: npm install axios form-data fs-extra
 */

const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

// Configuration
const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN;
const SCREENSHOTS_DIR = path.join(
  process.env.LOCALAPPDATA || process.env.HOME,
  "AppData",
  "Local",
  "Temp",
  "cursor",
  "screenshots",
);
const FIGMA_FILE_NAME = "Theramate Platform - All Screens";

// Figma API endpoints
const FIGMA_API_BASE = "https://api.figma.com/v1";

if (!FIGMA_ACCESS_TOKEN) {
  console.error(
    "❌ Error: FIGMA_ACCESS_TOKEN environment variable is not set.",
  );
  console.log("\n📝 To get your Figma Personal Access Token:");
  console.log("1. Go to https://www.figma.com/developers/api#access-tokens");
  console.log('2. Click "Get personal access token"');
  console.log("3. Copy the token");
  console.log(
    '4. Set it: export FIGMA_ACCESS_TOKEN="your-token-here" (Mac/Linux)',
  );
  console.log("   or: set FIGMA_ACCESS_TOKEN=your-token-here (Windows)");
  process.exit(1);
}

/**
 * Get current user's teams
 */
async function getTeams() {
  try {
    const response = await axios.get(`${FIGMA_API_BASE}/teams`, {
      headers: {
        "X-Figma-Token": FIGMA_ACCESS_TOKEN,
      },
    });
    return response.data.teams;
  } catch (error) {
    console.error(
      "Error fetching teams:",
      error.response?.data || error.message,
    );
    throw error;
  }
}

/**
 * Create a new Figma file
 */
async function createFigmaFile(teamId, fileName) {
  try {
    // Note: Figma API doesn't have a direct endpoint to create files
    // We'll need to use the Figma Plugin API or guide user to create manually
    console.log(
      "⚠️  Figma REST API does not support creating files programmatically.",
    );
    console.log(
      "📋 Please create a new file manually in Figma, then we can upload images to it.",
    );
    console.log(`\n📝 Steps:`);
    console.log(`1. Go to https://www.figma.com`);
    console.log(`2. Create a new file named: "${fileName}"`);
    console.log(
      `3. Copy the file key from the URL (e.g., https://www.figma.com/file/FILE_KEY/file-name)`,
    );
    console.log(
      `4. Run this script again with: FIGMA_FILE_KEY=your-file-key node upload-to-figma.js`,
    );
    return null;
  } catch (error) {
    console.error(
      "Error creating file:",
      error.response?.data || error.message,
    );
    throw error;
  }
}

/**
 * Upload image to Figma (using plugin API or manual import)
 *
 * Note: Figma REST API doesn't support uploading images directly.
 * We'll create a script that generates a Figma plugin or use manual import.
 */
async function uploadImageToFigma(fileKey, imagePath, frameName) {
  // Figma REST API doesn't support image uploads
  // We need to use a different approach
  console.log(
    `📸 Would upload: ${path.basename(imagePath)} as frame "${frameName}"`,
  );
}

/**
 * Alternative: Generate a Figma plugin script
 */
async function generateFigmaPlugin() {
  const pluginCode = `
// Figma Plugin to import screenshots
// Install: Plugins > Development > Import plugin from manifest

figma.showUI(__html__, { width: 400, height: 300 });

figma.ui.postMessage({
  type: 'ready',
  screenshots: ${JSON.stringify(await getScreenshotList())}
});

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'import-screenshot') {
    const image = await figma.createImageFromBytes(msg.imageData);
    const node = figma.createFrame();
    node.name = msg.name;
    node.resize(msg.width, msg.height);
    const imageHash = figma.createImage(image).hash;
    node.fills = [{ type: 'IMAGE', imageHash, scaleMode: 'FILL' }];
    figma.currentPage.appendChild(node);
    figma.viewport.scrollAndZoomIntoView([node]);
  }
};
`;

  await fs.writeFile("figma-plugin.js", pluginCode);
  console.log("✅ Generated figma-plugin.js");
}

/**
 * Get list of all screenshots
 */
async function getScreenshotList() {
  try {
    const files = await fs.readdir(SCREENSHOTS_DIR);
    return files
      .filter((f) => f.endsWith(".png"))
      .sort()
      .map((file) => ({
        name: file,
        path: path.join(SCREENSHOTS_DIR, file),
        number: parseInt(file.split("-")[0]) || 999,
      }));
  } catch (error) {
    console.error("Error reading screenshots directory:", error.message);
    return [];
  }
}

/**
 * Main function
 */
async function main() {
  console.log("🚀 Starting Figma upload process...\n");

  // Check if screenshots directory exists
  if (!(await fs.pathExists(SCREENSHOTS_DIR))) {
    console.error(`❌ Screenshots directory not found: ${SCREENSHOTS_DIR}`);
    process.exit(1);
  }

  const screenshots = await getScreenshotList();
  console.log(`📸 Found ${screenshots.length} screenshots\n`);

  // Since Figma API doesn't support file creation or image uploads directly,
  // we'll create a guide for manual import or use browser automation
  console.log("📋 Figma REST API Limitations:");
  console.log("   - Cannot create files programmatically");
  console.log("   - Cannot upload images directly");
  console.log("\n💡 Recommended Approach: Use Figma Desktop App or Browser\n");

  // Generate import guide
  await generateImportGuide(screenshots);
}

/**
 * Generate a guide for manual import
 */
async function generateImportGuide(screenshots) {
  const guide = `# Figma Import Guide

## Option 1: Manual Import (Easiest)

1. Open Figma Desktop App or go to https://www.figma.com
2. Create a new file: "${FIGMA_FILE_NAME}"
3. Organize screenshots into frames by phase:

### Phase 1: Public & Marketing Pages
${screenshots
  .filter((s) => s.number >= 1 && s.number <= 12)
  .map((s) => `- ${s.name}`)
  .join("\n")}

### Phase 2: Authentication & Onboarding  
${screenshots
  .filter((s) => s.number >= 13 && s.number <= 24)
  .map((s) => `- ${s.name}`)
  .join("\n")}

### Phase 3: Client-Facing Screens
${screenshots
  .filter((s) => s.number >= 25 && s.number <= 33)
  .map((s) => `- ${s.name}`)
  .join("\n")}

### Phase 4: Practitioner Core Screens
${screenshots
  .filter((s) => s.number >= 34 && s.number <= 45)
  .map((s) => `- ${s.name}`)
  .join("\n")}

### Phase 5: Practice Management Screens
${screenshots
  .filter((s) => s.number >= 46 && s.number <= 60)
  .map((s) => `- ${s.name}`)
  .join("\n")}

### Phase 6: Settings & Configuration
${screenshots
  .filter((s) => s.number >= 61 && s.number <= 66)
  .map((s) => `- ${s.name}`)
  .join("\n")}

### Phase 7: Analytics & Reporting
${screenshots
  .filter((s) => s.number >= 67 && s.number <= 69)
  .map((s) => `- ${s.name}`)
  .join("\n")}

### Phase 8: Additional Features
${screenshots
  .filter((s) => s.number >= 70 && s.number <= 77)
  .map((s) => `- ${s.name}`)
  .join("\n")}

## Option 2: Batch Import Script

Use the Figma Desktop App:
1. File > Import > Images
2. Select all screenshots from: ${SCREENSHOTS_DIR}
3. They will be imported as separate frames

## Option 3: Use Browser Automation

We can use browser automation to navigate to Figma and import screenshots.
Run: node upload-to-figma-browser.js
`;

  await fs.writeFile("FIGMA_IMPORT_GUIDE.md", guide);
  console.log("✅ Created FIGMA_IMPORT_GUIDE.md");
  console.log("\n📖 See FIGMA_IMPORT_GUIDE.md for detailed instructions\n");
}

main().catch(console.error);
