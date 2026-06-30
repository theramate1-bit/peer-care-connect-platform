// Check Resend emails for ray87 bookings
// This script queries Resend API to check email delivery status

const RESEND_API_URL = "https://api.resend.com";

async function checkResendEmails() {
  console.log("=".repeat(70));
  console.log("RESEND EMAIL CHECK FOR ray87 BOOKINGS");
  console.log("=".repeat(70));
  console.log("");

  // Get API key from environment or prompt
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log("❌ RESEND_API_KEY not found in environment");
    console.log("");
    console.log("To use this script:");
    console.log("1. Get your Resend API key from: https://resend.com/api-keys");
    console.log("2. Run: RESEND_API_KEY=your_key node check-resend-emails.js");
    console.log(
      "   Or on Windows: set RESEND_API_KEY=your_key && node check-resend-emails.js",
    );
    console.log("");
    console.log("Alternatively, check Resend Dashboard directly:");
    console.log("   https://resend.com/emails");
    console.log("");
    return;
  }

  console.log("✅ Resend API key found");
  console.log("");

  try {
    // Check recent emails (Resend API endpoint)
    console.log("📧 Fetching recent emails from Resend...");
    console.log("");

    // Note: Resend API doesn't have a direct "list emails" endpoint in their public API
    // We need to use the Resend Dashboard or check via webhooks
    // However, we can check if emails were sent by querying our database for resend_email_id

    console.log(
      '⚠️  Resend API does not provide a direct "list emails" endpoint',
    );
    console.log("");
    console.log("📋 ALTERNATIVE METHODS TO CHECK:");
    console.log("");
    console.log("1️⃣ Check Resend Dashboard (Best Option):");
    console.log("   https://resend.com/emails");
    console.log("   - Filter by recipient email (ray87)");
    console.log("   - Check delivery status");
    console.log("   - View email content and metadata");
    console.log("");

    console.log("2️⃣ Check Supabase email_logs table:");
    console.log("   Run this SQL in Supabase Dashboard:");
    console.log("─".repeat(70));
    console.log(`
SELECT 
  email_type,
  recipient_email,
  status,
  resend_email_id,
  error_message,
  created_at,
  sent_at
FROM email_logs
WHERE recipient_email ILIKE '%ray87%'
ORDER BY created_at DESC
LIMIT 20;
    `);
    console.log("");

    console.log("3️⃣ Use Resend API to verify specific email IDs:");
    console.log(
      "   If you have resend_email_id from email_logs, you can verify:",
    );
    console.log("   GET https://api.resend.com/emails/{email_id}");
    console.log("");

    // If we have email IDs, we can verify them
    console.log("4️⃣ Check webhook logs for email IDs:");
    console.log(
      "   Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/logs/edge-functions",
    );
    console.log("   Filter: stripe-webhook");
    console.log("   Look for: [SUCCESS] messages with email IDs");
    console.log("");

    // Test API key validity
    console.log("🔑 Testing Resend API key validity...");
    try {
      const testResponse = await fetch(`${RESEND_API_URL}/domains`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (testResponse.ok) {
        const domains = await testResponse.json();
        console.log("✅ API key is valid");
        console.log(`   Found ${domains.data?.length || 0} verified domain(s)`);
        if (domains.data && domains.data.length > 0) {
          console.log("   Domains:");
          domains.data.forEach((d) => {
            console.log(`     - ${d.name} (${d.status})`);
          });
        }
      } else {
        const error = await testResponse.json();
        console.log(
          "❌ API key test failed:",
          error.message || "Unknown error",
        );
        console.log("   Status:", testResponse.status);
      }
    } catch (err) {
      console.log("❌ Error testing API key:", err.message);
    }
    console.log("");

    console.log("=".repeat(70));
    console.log("📊 SUMMARY");
    console.log("=".repeat(70));
    console.log("");
    console.log("To check ray87 emails:");
    console.log("1. Go to Resend Dashboard: https://resend.com/emails");
    console.log('2. Search for emails containing "ray87" in recipient');
    console.log("3. Check delivery status and timestamps");
    console.log("");
    console.log(
      "Or check Supabase email_logs table for resend_email_id values",
    );
    console.log("");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Also provide a function to check a specific email ID if we have it
async function checkSpecificEmail(emailId) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("❌ RESEND_API_KEY not found");
    return;
  }

  try {
    console.log(`📧 Checking email ID: ${emailId}...`);
    const response = await fetch(`${RESEND_API_URL}/emails/${emailId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const email = await response.json();
      console.log("✅ Email found:");
      console.log("   To:", email.to);
      console.log("   From:", email.from);
      console.log("   Subject:", email.subject);
      console.log("   Created:", email.created_at);
      console.log("   Status:", email.last_event || "unknown");
    } else {
      const error = await response.json();
      console.log("❌ Error:", error.message || "Unknown error");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

// Run the check
const emailId = process.argv[2];
if (emailId) {
  checkSpecificEmail(emailId);
} else {
  checkResendEmails();
}
