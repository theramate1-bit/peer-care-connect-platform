// Create webhook by invoking Edge Function that uses Supabase secrets
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://aikqnvltuwwgifuocvto.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createWebhookViaEdgeFunction() {
  console.log("🚀 Creating webhook endpoint via Edge Function...");
  console.log("=".repeat(70));
  console.log("");

  try {
    // First, let's try to invoke the function if it exists
    // If not, we'll need to deploy it first via Supabase Dashboard
    const { data, error } = await supabase.functions.invoke(
      "create-webhook-endpoint",
      {
        body: {},
      },
    );

    if (error) {
      if (
        error.message.includes("not found") ||
        error.message.includes("404")
      ) {
        console.log(
          "⚠️  Function not deployed yet. Deploying via direct API call...",
        );

        // Try direct API call to create webhook using Stripe API
        // We'll need to get the Stripe key from Supabase secrets
        // Since we can't access secrets directly, let's use the approach of
        // creating a temporary Edge Function code and deploying it

        console.log("📝 Creating webhook creation script...");
        console.log("");
        console.log("Since the Edge Function needs to be deployed first,");
        console.log("please run this command to deploy it:");
        console.log("");
        console.log("cd peer-care-connect");
        console.log(
          "supabase functions deploy create-webhook-endpoint --no-verify-jwt",
        );
        console.log("");
        console.log("Then run this script again.");
        console.log("");
        return;
      }

      throw error;
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

      console.log("✅ Setup complete! Webhook is now configured.");
      console.log("");
      console.log("🧪 Next steps:");
      console.log(
        "   1. Update STRIPE_WEBHOOK_SECRET in Supabase if you got a new secret",
      );
      console.log("   2. Create a test booking");
      console.log("   3. Check Supabase logs - should see 200 (not 401)");
      console.log("   4. Verify emails are sent");
    } else {
      console.log("❌ Failed:", data?.error || "Unknown error");
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
    console.error("");
    console.error("This might mean:");
    console.error("   1. Edge Function not deployed yet");
    console.error(
      "   2. Need to deploy create-webhook-endpoint function first",
    );
    console.error("");
    console.error("To deploy:");
    console.error("   cd peer-care-connect");
    console.error(
      "   supabase functions deploy create-webhook-endpoint --no-verify-jwt",
    );
  }
}

createWebhookViaEdgeFunction();
