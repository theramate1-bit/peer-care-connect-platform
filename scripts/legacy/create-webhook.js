// IMPORTANT: Use environment variable for Stripe secret key
// Set STRIPE_SECRET_KEY in your environment before running this script
const stripe = require("stripe")(
  process.env.STRIPE_SECRET_KEY || process.env.STRIPE_LIVE_SECRET_KEY,
);

if (!stripe) {
  console.error("❌ Error: STRIPE_SECRET_KEY environment variable is required");
  console.error("Please set it before running this script:");
  console.error("  export STRIPE_SECRET_KEY=your_stripe_secret_key_here");
  process.exit(1);
}

async function createWebhookEndpoint() {
  try {
    const webhookEndpoint = await stripe.webhookEndpoints.create({
      url: "https://aikqnvltuwwgifuocvto.supabase.co/functions/v1/stripe-webhook",
      enabled_events: [
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
      ],
    });

    console.log("✅ Webhook endpoint created successfully!");
    console.log("Webhook ID:", webhookEndpoint.id);
    console.log("Webhook Secret:", webhookEndpoint.secret);
    console.log("URL:", webhookEndpoint.url);
    console.log("Events:", webhookEndpoint.enabled_events);
    console.log("Live Mode:", webhookEndpoint.livemode);

    return webhookEndpoint;
  } catch (error) {
    console.error("❌ Error creating webhook endpoint:", error.message);
    throw error;
  }
}

createWebhookEndpoint();
