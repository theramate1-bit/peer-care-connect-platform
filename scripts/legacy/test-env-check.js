// Test script to check environment variables in Edge Functions
const https = require("https");

const PROJECT_ID = "aikqnvltuwwgifuocvto";
const SUPABASE_URL = "https://aikqnvltuwwgifuocvto.supabase.co";

async function testEdgeFunction(functionName) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "aikqnvltuwwgifuocvto.supabase.co",
      port: 443,
      path: `/functions/v1/${functionName}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "0",
      },
    };

    const req = https.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        console.log(`📡 ${functionName}: ${res.statusCode} - ${responseData}`);
        resolve({ statusCode: res.statusCode, data: responseData });
      });
    });

    req.on("error", (error) => {
      console.log(`❌ ${functionName} error:`, error.message);
      reject(error);
    });

    req.write("");
    req.end();
  });
}

async function main() {
  console.log("🔍 Testing Edge Functions for environment variable issues...");
  console.log("");

  const functions = [
    "check-subscription",
    "create-checkout",
    "customer-portal",
    "stripe-payment",
  ];

  for (const func of functions) {
    try {
      await testEdgeFunction(func);
      console.log("");
    } catch (error) {
      console.log(`Failed to test ${func}:`, error.message);
    }
  }

  console.log("✅ Environment variable check complete!");
  console.log("");
  console.log("💡 If you see 500 errors, check these environment variables:");
  console.log("   - Stripe_secret_key (note the capital S)");
  console.log("   - SUPABASE_SERVICE_ROLE_KEY");
  console.log("   - SUPABASE_URL");
  console.log("   - OPENAI_API_KEY (for AI functions)");
}

main().catch(console.error);
