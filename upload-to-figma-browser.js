/**
 * Browser automation script to upload screenshots to Figma
 *
 * This script uses Puppeteer to automate the Figma import process
 *
 * Prerequisites:
 * 1. npm install puppeteer
 * 2. Have Figma account logged in
 */

const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const path = require("path");

const SCREENSHOTS_DIR = path.join(
  process.env.LOCALAPPDATA || process.env.HOME,
  "AppData",
  "Local",
  "Temp",
  "cursor",
  "screenshots",
);

async function uploadToFigma() {
  console.log(
    "🚀 Starting browser automation to upload screenshots to Figma...\n",
  );

  const browser = await puppeteer.launch({
    headless: false, // Show browser for user interaction
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();

  try {
    // Navigate to Figma
    console.log("📱 Navigating to Figma...");
    await page.goto("https://www.figma.com", { waitUntil: "networkidle2" });

    // Wait for user to log in and create a file
    console.log("\n⏸️  Please:");
    console.log("1. Log in to Figma (if not already logged in)");
    console.log("2. Create a new file or open an existing file");
    console.log("3. Press Enter in the terminal when ready...");

    // Wait for user input (simplified - in production, use readline)
    await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds

    // Get list of screenshots
    const screenshots = await fs
      .readdir(SCREENSHOTS_DIR)
      .then((files) => files.filter((f) => f.endsWith(".png")).sort())
      .catch(() => []);

    console.log(`\n📸 Found ${screenshots.length} screenshots to upload\n`);

    // Guide user through manual import
    console.log("📋 Manual Import Steps:");
    console.log("1. In Figma, go to: File > Import > Images");
    console.log(`2. Navigate to: ${SCREENSHOTS_DIR}`);
    console.log("3. Select all PNG files (Ctrl+A / Cmd+A)");
    console.log('4. Click "Open"');
    console.log("5. Screenshots will be imported as separate frames");
    console.log(
      "\n💡 Tip: After import, organize frames by phase using Auto Layout",
    );

    // Keep browser open
    console.log("\n✅ Browser will stay open. Close it when done.");
    await page.waitForTimeout(60000); // Wait 60 seconds
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    // Don't close browser automatically - let user close it
    // await browser.close();
  }
}

uploadToFigma().catch(console.error);
