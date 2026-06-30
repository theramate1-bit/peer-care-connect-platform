// Complete webhook fix script - checks, creates, and configures webhook endpoint
// Get Stripe key from environment or use the one from create-webhook.js
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_KEY;

if (
  !STRIPE_KEY ||
  !STRIPE_KEY.startsWith("sk_") ||
  STRIPE_KEY.includes("***")
) {
  console.error("❌ STRIPE_SECRET_KEY not set or invalid");
  console.error("   Please set STRIPE_SECRET_KEY environment variable");
  console.error("   Or update the script with your Stripe secret key");
  process.exit(1);
}

const stripe = require("stripe")(STRIPE_KEY);
const { execSync } = require("child_process");

const WEBHOOK_URL =
  "https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/stripe-webhook";
const REQUIRED_EVENTS = [
  "checkout.session.completed",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "charge.succeeded",
  "charge.failed",
  "invoice.payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "checkout.session.expired",
  "invoice.payment_action_required",
];

async function listWebhooks() {
  try {
    const webhooks = await stripe.webhookEndpoints.list({ limit: 100 });
    return webhooks.data;
  } catch (error) {
    console.error("❌ Error listing webhooks:", error.message);
    throw error;
  }
}

async function findExistingWebhook() {
  console.log("🔍 Checking for existing webhook endpoints...");
  const webhooks = await listWebhooks();

  const matching = webhooks.filter((w) => w.url === WEBHOOK_URL);

  if (matching.length > 0) {
    console.log(
      `✅ Found ${matching.length} existing webhook(s) with matching URL:`,
    );
    matching.forEach((w, i) => {
      console.log(`   ${i + 1}. ID: ${w.id}`);
      console.log(`      Status: ${w.status}`);
      console.log(`      Events: ${w.enabled_events.length}`);
      console.log(
        `      Created: ${new Date(w.created * 1000).toLocaleString()}`,
      );
    });
    return matching[0]; // Return the first one
  }

  console.log("ℹ️  No existing webhook found with matching URL");
  return null;
}

async function createWebhookEndpoint() {
  console.log("🔧 Creating new webhook endpoint...");
  try {
    const webhookEndpoint = await stripe.webhookEndpoints.create({
      url: WEBHOOK_URL,
      enabled_events: REQUIRED_EVENTS,
      description: "Theramate Payment Webhook - Auto-created",
    });

    console.log("✅ Webhook endpoint created successfully!");
    console.log("   Webhook ID:", webhookEndpoint.id);
    console.log("   Webhook Secret:", webhookEndpoint.secret);
    console.log("   URL:", webhookEndpoint.url);
    console.log("   Status:", webhookEndpoint.status);
    console.log("   Events:", webhookEndpoint.enabled_events.length);
    console.log("   Live Mode:", webhookEndpoint.livemode);

    return webhookEndpoint;
  } catch (error) {
    console.error("❌ Error creating webhook endpoint:", error.message);
    throw error;
  }
}

async function updateWebhookEvents(webhookId) {
  console.log("🔄 Updating webhook events...");
  try {
    const updated = await stripe.webhookEndpoints.update(webhookId, {
      enabled_events: REQUIRED_EVENTS,
    });
    console.log("✅ Webhook events updated");
    return updated;
  } catch (error) {
    console.error("❌ Error updating webhook:", error.message);
    throw error;
  }
}

async function setSupabaseSecret(secret) {
  console.log("🔐 Setting webhook secret in Supabase...");
  try {
    const command = `cd peer-care-connect && supabase secrets set STRIPE_WEBHOOK_SECRET=${secret}`;
    console.log("   Running:", command.replace(secret, "whsec_***"));
    execSync(command, { stdio: "inherit" });
    console.log("✅ Webhook secret set in Supabase");
    return true;
  } catch (error) {
    console.error("❌ Error setting Supabase secret:", error.message);
    console.log("⚠️  Please set manually:");
    console.log(`   supabase secrets set STRIPE_WEBHOOK_SECRET=${secret}`);
    return false;
  }
}

async function main() {
  console.log("🚀 WEBHOOK FIX - COMPLETE SETUP");
  console.log("=".repeat(70));
  console.log("");

  try {
    // Step 1: Check for existing webhook
    let webhook = await findExistingWebhook();

    // Step 2: Create or update webhook
    if (!webhook) {
      webhook = await createWebhookEndpoint();
    } else {
      console.log("");
      console.log("🔄 Updating existing webhook...");
      // Check if all required events are enabled
      const missingEvents = REQUIRED_EVENTS.filter(
        (e) => !webhook.enabled_events.includes(e),
      );
      if (missingEvents.length > 0) {
        console.log(`   Missing events: ${missingEvents.join(", ")}`);
        webhook = await updateWebhookEvents(webhook.id);
      } else {
        console.log("✅ All required events are already enabled");
      }

      // Get the secret (need to retrieve it)
      console.log("🔑 Retrieving webhook secret...");
      const retrieved = await stripe.webhookEndpoints.retrieve(webhook.id);
      webhook.secret = retrieved.secret || webhook.secret;
    }

    console.log("");

    // Step 3: Set secret in Supabase
    if (webhook.secret) {
      await setSupabaseSecret(webhook.secret);
    } else {
      console.log(
        "⚠️  Webhook secret not available. You may need to retrieve it from Stripe Dashboard.",
      );
    }

    console.log("");
    console.log("=".repeat(70));
    console.log("✅ WEBHOOK SETUP COMPLETE");
    console.log("=".repeat(70));
    console.log("");
    console.log("📋 Summary:");
    console.log(`   Webhook ID: ${webhook.id}`);
    console.log(`   URL: ${webhook.url}`);
    console.log(`   Status: ${webhook.status}`);
    console.log(`   Events: ${webhook.enabled_events.length} enabled`);
    console.log(
      `   Secret: ${webhook.secret ? "Set in Supabase" : "⚠️  Needs manual setup"}`,
    );
    console.log("");
    console.log("🧪 Next Steps:");
    console.log("   1. Create a test booking");
    console.log(
      "   2. Check Supabase logs for webhook activity (should see 200, not 401)",
    );
    console.log("   3. Verify emails are sent");
    console.log("");
  } catch (error) {
    console.error("");
    console.error("❌ SETUP FAILED");
    console.error("=".repeat(70));
    console.error("Error:", error.message);
    console.error("");
    process.exit(1);
  }
}

main();
