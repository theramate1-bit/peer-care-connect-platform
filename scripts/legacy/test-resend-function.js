const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://aikqnvltuwwgifuocvto.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testResendEmail() {
  console.log("🧪 Testing Resend Email Function...\n");

  const testPayload = {
    emailType: "booking_confirmation_client",
    recipientEmail: "delivered@resend.dev",
    recipientName: "Test User",
    data: {
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      sessionTime: "14:00",
      sessionPrice: 50,
      sessionDuration: 60,
      practitionerName: "John Doe",
      bookingUrl: "https://theramate.co.uk/my-bookings",
      messageUrl: "https://theramate.co.uk/messages",
    },
  };

  try {
    console.log("📤 Invoking send-email function...");

    // Use direct fetch to get full error response
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(testPayload),
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    console.log(`Status: ${response.status}`);
    console.log("Response:", JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log("\n✅ Email sent successfully!");
      if (responseData.emailId) {
        console.log("Email ID:", responseData.emailId);
      }
    } else {
      console.log("\n❌ Email sending failed");
      console.log(
        "Error:",
        responseData.error || responseData.details || responseData,
      );

      // Check for specific error types
      if (
        responseData.details &&
        responseData.details.includes("RESEND_API_KEY")
      ) {
        console.log("\n🔴 CRITICAL: RESEND_API_KEY secret is missing!");
        console.log(
          "   Go to: https://supabase.com/dashboard/project/aikqnvltuwwgifuocvto/settings/functions",
        );
        console.log(
          "   Add secret: RESEND_API_KEY = re_PtKC1CKr_Lt2ais9fSf729cJ2Vx7fTjtQ",
        );
      }
    }
  } catch (err) {
    console.log("❌ Exception:", err.message);
    console.log("Stack:", err.stack);
  }
}

testResendEmail();
