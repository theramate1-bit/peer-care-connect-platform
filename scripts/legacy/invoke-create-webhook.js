// Invoke the create-webhook-endpoint function with proper auth
const { createClient } = require("@supabase/supabase-js");

// We need to use the service role key for this
// Since we can't get it directly, let's try with anon key first
// If that fails, we'll need to use the Supabase API directly

const SUPABASE_URL = "https://aikqnvltuwwgifuocvto.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createWebhook() {
  console.log("🚀 Creating webhook endpoint...");
  console.log("=".repeat(70));
  console.log("");

  try {
    // Try invoking with anon key first
    const { data, error } = await supabase.functions.invoke(
      "create-webhook-endpoint",
      {
        body: {},
      },
    );

    if (error) {
      // If JWT verification fails, try direct API call with service role
      console.log("⚠️  Anon key failed, trying direct API call...");

      // Use fetch directly with the function URL
      const functionUrl = `${SUPABASE_URL}/functions/v1/create-webhook-endpoint`;

      // We need the service role key, but we can't get it directly
      // Let's try with anon key in Authorization header
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log("✅ Webhook endpoint configured successfully!");
        console.log("");
        console.log("📋 Details:");
        console.log(`   Action: ${result.action}`);
        console.log(`   Webhook ID: ${result.webhook_id}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Events: ${result.events.length} enabled`);
        console.log("");

        if (result.webhook_secret) {
          console.log("🔐 Webhook Secret:", result.webhook_secret);
          console.log("");
          console.log(
            "⚠️  IMPORTANT: Update Supabase secret with this webhook secret:",
          );
          console.log(
            `   supabase secrets set STRIPE_WEBHOOK_SECRET=${result.webhook_secret}`,
          );
          console.log("");
        }

        return result;
      } else {
        throw new Error(result.error || "Unknown error");
      }
    }

    if (data && data.success) {
      console.log("✅ Webhook endpoint configured successfully!");
      console.log("");
      console.log("📋 Details:");
      console.log(`   Action: ${data.action}`);
      console.log(`   Webhook ID: ${data.webhook_id}`);
      console.log(`   URL: ${data.url}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Events: ${data.events.length} enabled`);
      console.log("");

      if (data.webhook_secret) {
        console.log("🔐 Webhook Secret:", data.webhook_secret);
        console.log("");
        console.log(
          "⚠️  IMPORTANT: Update Supabase secret with this webhook secret:",
        );
        console.log(
          `   supabase secrets set STRIPE_WEBHOOK_SECRET=${data.webhook_secret}`,
        );
        console.log("");
      }

      return data;
    } else {
      throw new Error(data?.error || "Unknown error");
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
    console.error("");
    console.error("This might mean:");
    console.error("   1. Function requires service role key");
    console.error("   2. JWT verification is enabled");
    console.error("");
    console.error("Try updating the function to disable JWT verification, or");
    console.error("use the Supabase Dashboard to invoke it manually.");
    throw err;
  }
}

createWebhook()
  .then(() => {
    console.log("✅ Setup complete!");
  })
  .catch((err) => {
    console.error("❌ Setup failed:", err.message);
    process.exit(1);
  });
