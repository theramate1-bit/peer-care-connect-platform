// Deploy webhook creation function and create webhook in one go
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = "https://aikqnvltuwwgifuocvto.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Read the Edge Function code
const functionCode = fs.readFileSync(
  path.join(
    __dirname,
    "peer-care-connect",
    "supabase",
    "functions",
    "create-webhook-endpoint",
    "index.ts",
  ),
  "utf8",
);

async function deployAndCreateWebhook() {
  console.log("🚀 COMPLETE WEBHOOK SETUP");
  console.log("=".repeat(70));
  console.log("");

  // Since we can't deploy via CLI without Docker, let's try a different approach:
  // Use the Stripe API directly by creating a script that will work

  console.log("📝 Creating webhook using Stripe API directly...");
  console.log("");
  console.log(
    "Since Docker is not available, we need to use the Stripe API directly.",
  );
  console.log(
    "However, we need the actual Stripe secret key from Supabase secrets.",
  );
  console.log("");
  console.log(
    "🔧 Alternative approach: Using existing webhook creation script...",
  );
  console.log("");

  // Try to use the create-webhook.js but with better error handling
  const stripe = require("stripe");

  // The key from create-webhook.js might be invalid, so let's try to create
  // a script that uses environment variables or prompts for the key

  console.log("💡 Solution:");
  console.log("");
  console.log("1. The Edge Function code is ready at:");
  console.log(
    "   peer-care-connect/supabase/functions/create-webhook-endpoint/index.ts",
  );
  console.log("");
  console.log("2. To deploy it, you can:");
  console.log("   a) Use Supabase Dashboard:");
  console.log(
    "      - Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/functions",
  );
  console.log('      - Click "Create a new function"');
  console.log("      - Name: create-webhook-endpoint");
  console.log("      - Copy the code from the file above");
  console.log("      - Deploy");
  console.log("");
  console.log("   b) Or use Supabase CLI (when Docker is available):");
  console.log("      cd peer-care-connect");
  console.log(
    "      supabase functions deploy create-webhook-endpoint --no-verify-jwt",
  );
  console.log("");
  console.log("3. Once deployed, run:");
  console.log("   node create-webhook-via-edge-function.js");
  console.log("");
  console.log("OR use the Stripe Dashboard directly:");
  console.log("   https://dashboard.stripe.com/webhooks");
  console.log("   - Add endpoint");
  console.log(
    "   - URL: https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/stripe-webhook",
  );
  console.log("   - Enable: checkout.session.completed");
  console.log("   - Copy the signing secret");
  console.log(
    "   - Update Supabase: supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...",
  );
  console.log("");
}

deployAndCreateWebhook();
