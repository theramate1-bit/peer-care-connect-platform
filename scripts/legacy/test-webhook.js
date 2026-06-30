const crypto = require("crypto");

// Test webhook signature verification
function testWebhookSignature() {
  const webhookSecret = "whsec_9g8S4MwyWBwFyLzKyWqGbdWZIKPPq5sZ";
  const payload = JSON.stringify({
    id: "evt_test_123",
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_123",
        payment_status: "paid",
        amount_total: 0,
        subscription: "sub_test_123",
        customer: "cus_test_123",
        metadata: {
          user_id: "1f5987ad-5530-4441-aea9-ce50ca9bc60b",
          plan: "pro",
          billing: "monthly",
        },
      },
    },
  });

  // Create signature
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac("sha256", webhookSecret)
    .update(timestamp + "." + payload)
    .digest("hex");

  console.log("Test payload:", payload);
  console.log("Test signature:", `t=${timestamp},v1=${signature}`);
  console.log("Webhook secret:", webhookSecret);

  return {
    payload,
    signature: `t=${timestamp},v1=${signature}`,
    webhookSecret,
  };
}

const testData = testWebhookSignature();
console.log("\nTest data generated successfully!");
console.log(
  "Use this signature in the Stripe-Signature header when testing the webhook.",
);
