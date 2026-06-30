// Direct API Test Script for Email System
// Tests Supabase Edge Functions via direct HTTP calls

const SUPABASE_URL = "https://aikqnvltuwwgifuocvto.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3Fudmx0dXd3Z2lmdW9jdnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MTk5NDgsImV4cCI6MjA3MTE5NTk0OH0.PJAKAkbAfp2PP4DXelMpIzhUZZUE5SVoKPzN0JJSRac";

// Test email types configuration
const EMAIL_TESTS = [
  {
    name: "Client Booking Confirmation",
    type: "booking_confirmation_client",
    data: {
      sessionId: "test-" + Date.now(),
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      sessionTime: "14:00",
      sessionPrice: 50,
      sessionDuration: 60,
      practitionerName: "John Doe",
      bookingUrl: "https://theramate.co.uk/my-bookings",
      calendarUrl: "#",
      messageUrl: "https://theramate.co.uk/messages",
    },
  },
  {
    name: "Practitioner Booking Confirmation",
    type: "booking_confirmation_practitioner",
    data: {
      sessionId: "test-" + Date.now(),
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      sessionTime: "14:00",
      sessionPrice: 50,
      sessionDuration: 60,
      clientName: "Jane Smith",
      clientEmail: "jane@example.com",
      paymentStatus: "completed",
      bookingUrl: "https://theramate.co.uk/practice/sessions/test-123",
      messageUrl: "https://theramate.co.uk/messages",
    },
  },
  {
    name: "Client Payment Confirmation",
    type: "payment_confirmation_client",
    data: {
      sessionId: "test-" + Date.now(),
      paymentId: "pay_test_" + Date.now(),
      paymentAmount: 50,
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      sessionTime: "14:00",
      sessionLocation: "123 Main St",
      practitionerName: "John Doe",
      bookingUrl: "https://theramate.co.uk/my-bookings",
    },
  },
  {
    name: "Practitioner Payment Received",
    type: "payment_received_practitioner",
    data: {
      paymentAmount: 50,
      platformFee: 0.25,
      practitionerAmount: 49.75,
      clientName: "Jane Smith",
      sessionType: "Massage Therapy",
      sessionDate: "2025-02-15",
      paymentId: "pay_test_" + Date.now(),
    },
  },
];

/**
 * Call Edge Function via direct HTTP API
 */
async function callEdgeFunction(functionName, payload) {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    return {
      status: response.status,
      ok: response.ok,
      data: responseData,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
      stack: error.stack,
    };
  }
}

/**
 * Test a single email type
 */
async function testEmailType(emailTest) {
  console.log(`📧 Testing: ${emailTest.name}`);
  console.log(`   Type: ${emailTest.type}`);

  const payload = {
    emailType: emailTest.type,
    recipientEmail: "delivered@resend.dev", // Resend test address
    recipientName: "Test User",
    data: emailTest.data,
  };

  const result = await callEdgeFunction("send-email", payload);

  if (result.error) {
    console.log(`   ❌ NETWORK ERROR: ${result.error}`);
    return {
      name: emailTest.name,
      type: emailTest.type,
      status: "NETWORK_ERROR",
      error: result.error,
    };
  }

  if (!result.ok) {
    console.log(`   ❌ HTTP ERROR: Status ${result.status}`);
    if (result.data.error) {
      console.log(`   Error: ${result.data.error}`);
    }
    if (result.data.details) {
      console.log(`   Details: ${result.data.details}`);
    }
    return {
      name: emailTest.name,
      type: emailTest.type,
      status: "HTTP_ERROR",
      statusCode: result.status,
      error:
        result.data.error ||
        result.data.details ||
        result.data.raw ||
        "Unknown error",
      response: result.data,
    };
  }

  if (result.data.success) {
    console.log(`   ✅ SUCCESS`);
    console.log(`   Email ID: ${result.data.emailId}`);
    console.log(
      `   Message: ${result.data.message || "Email sent successfully"}`,
    );
    return {
      name: emailTest.name,
      type: emailTest.type,
      status: "SUCCESS",
      emailId: result.data.emailId,
      message: result.data.message,
    };
  } else {
    console.log(
      `   ❌ FAILED: ${result.data.error || result.data.details || "Unknown error"}`,
    );
    return {
      name: emailTest.name,
      type: emailTest.type,
      status: "FAILED",
      error: result.data.error || result.data.details || "Unknown error",
      response: result.data,
    };
  }
}

/**
 * Test function health/status
 */
async function testFunctionHealth() {
  console.log("🏥 Testing Function Health...\n");

  // Try a minimal request to check if function is accessible
  const result = await callEdgeFunction("send-email", { test: true });

  if (result.error) {
    console.log("❌ Function not reachable (network error)");
    return { reachable: false, error: result.error };
  }

  if (result.status === 0) {
    console.log("❌ Function not reachable");
    return { reachable: false };
  }

  console.log(`✅ Function is reachable (Status: ${result.status})`);

  // Check for common error patterns
  if (result.data?.error) {
    if (result.data.error.includes("RESEND_API_KEY")) {
      console.log("⚠️  RESEND_API_KEY issue detected");
      return { reachable: true, apiKeyIssue: true };
    }
    if (result.data.error.includes("Invalid email type")) {
      console.log("⚠️  Email type validation working");
      return { reachable: true, validationWorking: true };
    }
  }

  return { reachable: true };
}

/**
 * Generate comprehensive test report
 */
function generateReport(results, healthCheck) {
  console.log("\n" + "=".repeat(70));
  console.log("📊 COMPREHENSIVE TEST REPORT");
  console.log("=".repeat(70));
  console.log("");

  // Health Check Summary
  console.log("🏥 Function Health:");
  if (healthCheck.reachable) {
    console.log("   ✅ Function is reachable");
    if (healthCheck.apiKeyIssue) {
      console.log("   ⚠️  RESEND_API_KEY issue detected");
    }
    if (healthCheck.validationWorking) {
      console.log("   ✅ Email type validation working");
    }
  } else {
    console.log("   ❌ Function not reachable");
    if (healthCheck.error) {
      console.log(`   Error: ${healthCheck.error}`);
    }
  }
  console.log("");

  // Test Results Summary
  console.log("📧 Email Type Tests:");
  const successCount = results.filter((r) => r.status === "SUCCESS").length;
  const failedCount = results.filter((r) => r.status !== "SUCCESS").length;

  results.forEach((result, index) => {
    const icon = result.status === "SUCCESS" ? "✅" : "❌";
    console.log(`   ${index + 1}. ${icon} ${result.name} (${result.type})`);

    if (result.status === "SUCCESS") {
      console.log(`      Email ID: ${result.emailId}`);
    } else {
      console.log(`      Status: ${result.status}`);
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
      if (result.statusCode) {
        console.log(`      HTTP Status: ${result.statusCode}`);
      }
    }
  });
  console.log("");

  // Overall Summary
  console.log("📈 Overall Summary:");
  console.log(`   Total Tests: ${results.length}`);
  console.log(`   ✅ Passed: ${successCount}`);
  console.log(`   ❌ Failed: ${failedCount}`);
  console.log(
    `   Success Rate: ${((successCount / results.length) * 100).toFixed(1)}%`,
  );
  console.log("");

  // Recommendations
  console.log("💡 Recommendations:");
  if (successCount === results.length) {
    console.log("   🎉 ALL TESTS PASSED!");
    console.log("   ✅ Email system is working correctly");
    console.log("   ✅ All email types are functional");
    console.log("   📧 Check Resend Dashboard: https://resend.com/emails");
  } else if (successCount > 0) {
    console.log("   ⚠️  PARTIAL SUCCESS");
    console.log("   ✅ Some email types are working");
    console.log("   ❌ Some email types need attention");
    console.log("   🔍 Check error messages above for details");
  } else {
    console.log("   ❌ ALL TESTS FAILED");
    console.log("   🔍 Check error messages above");

    // Check for common issues
    const apiKeyErrors = results.filter(
      (r) => r.error && r.error.includes("RESEND_API_KEY"),
    );
    if (apiKeyErrors.length > 0) {
      console.log("   🔴 RESEND_API_KEY issue detected");
      console.log("      Fix: Verify secret exists in Supabase Dashboard");
      console.log("      Location: Settings → Edge Functions → Secrets");
    }

    const networkErrors = results.filter((r) => r.status === "NETWORK_ERROR");
    if (networkErrors.length > 0) {
      console.log("   🔴 Network connectivity issue");
      console.log("      Fix: Check internet connection and Supabase status");
    }
  }
  console.log("");

  // Next Steps
  console.log("📋 Next Steps:");
  if (successCount === results.length) {
    console.log("   1. ✅ Email system verified - ready for production");
    console.log("   2. Create test booking to verify end-to-end flow");
    console.log("   3. Check webhook logs for [SUCCESS] messages");
    console.log("   4. Monitor Resend Dashboard for email activity");
  } else {
    console.log("   1. Review error messages above");
    console.log("   2. Check Supabase function logs");
    console.log("   3. Verify RESEND_API_KEY secret is set");
    console.log("   4. Redeploy functions if needed");
    console.log("   5. Re-run tests after fixes");
  }
  console.log("");

  return {
    total: results.length,
    passed: successCount,
    failed: failedCount,
    successRate: (successCount / results.length) * 100,
    results: results,
    healthCheck: healthCheck,
  };
}

/**
 * Main test execution
 */
async function runTests() {
  console.log("🔍 EMAIL SYSTEM DIRECT API TEST");
  console.log("=".repeat(70));
  console.log("");
  console.log("Testing Supabase Edge Functions via direct HTTP API");
  console.log("Bypassing Supabase client library to avoid network issues");
  console.log("");

  // Test function health first
  const healthCheck = await testFunctionHealth();
  console.log("");

  // Test all email types
  console.log("🧪 Testing All Booking Email Types");
  console.log("=".repeat(70));
  console.log("");

  const results = [];
  for (const emailTest of EMAIL_TESTS) {
    const result = await testEmailType(emailTest);
    results.push(result);
    console.log("");

    // Small delay between tests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Generate report
  const report = generateReport(results, healthCheck);

  console.log("=".repeat(70));
  console.log("✅ TEST COMPLETE");
  console.log("=".repeat(70));
  console.log("");

  return report;
}

// Run tests
runTests()
  .then((report) => {
    // Exit with appropriate code
    process.exit(report.passed === report.total ? 0 : 1);
  })
  .catch((error) => {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
  });
