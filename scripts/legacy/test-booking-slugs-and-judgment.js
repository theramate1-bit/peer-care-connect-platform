/**
 * End-to-End Test: Custom Booking Slugs and Product Judgment Visibility
 *
 * Tests:
 * 1. Direct booking link access via slug
 * 2. Service recommendations with judgment fields
 * 3. Pricing transparency display
 * 4. Booking flow explanations
 * 5. Booking link management
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "peer-care-connect", ".env.local") });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials. Please check .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const testResults = {
  passed: [],
  failed: [],
  warnings: [],
};

function logTest(name, passed, message) {
  if (passed) {
    console.log(`✅ ${name}: ${message}`);
    testResults.passed.push(name);
  } else {
    console.log(`❌ ${name}: ${message}`);
    testResults.failed.push({ name, message });
  }
}

function logWarning(name, message) {
  console.log(`⚠️  ${name}: ${message}`);
  testResults.warnings.push({ name, message });
}

async function test1_BookingSlugColumn() {
  console.log("\n📋 Test 1: Booking Slug Column Exists");
  try {
    const { data, error } = await supabase
      .from("users")
      .select("booking_slug")
      .limit(1);

    if (error) throw error;

    // Check if column exists (if query succeeds, column exists)
    logTest("Booking Slug Column", true, "Column exists and is queryable");
    return true;
  } catch (error) {
    logTest("Booking Slug Column", false, error.message);
    return false;
  }
}

async function test2_ProductJudgmentFields() {
  console.log("\n📋 Test 2: Product Judgment Fields Exist");
  try {
    const { data, error } = await supabase
      .from("practitioner_products")
      .select(
        "recommendation_reason, pricing_rationale, popularity_score, recommended_for",
      )
      .limit(1);

    if (error) throw error;

    logTest(
      "Product Judgment Fields",
      true,
      "All fields exist and are queryable",
    );
    return true;
  } catch (error) {
    logTest("Product Judgment Fields", false, error.message);
    return false;
  }
}

async function test3_FetchPractitionerBySlug() {
  console.log("\n📋 Test 3: Fetch Practitioner by Booking Slug");
  try {
    // Test with known slug
    const { data, error } = await supabase
      .from("users")
      .select(
        "id, first_name, last_name, booking_slug, user_role, is_active, profile_completed",
      )
      .eq("booking_slug", "johnny-osteo")
      .eq("user_role", "osteopath")
      .single();

    if (error) throw error;

    if (data && data.booking_slug === "johnny-osteo") {
      logTest(
        "Fetch by Slug",
        true,
        `Found practitioner: ${data.first_name} ${data.last_name}`,
      );
      return data;
    } else {
      logTest("Fetch by Slug", false, "Practitioner not found");
      return null;
    }
  } catch (error) {
    logTest("Fetch by Slug", false, error.message);
    return null;
  }
}

async function test4_ServiceRecommendations() {
  console.log("\n📋 Test 4: Service Recommendations with Judgment Fields");
  try {
    const practitionerId = "d419a3d1-5071-4940-a13f-b4aac9520dec"; // Johnny Osteo

    const { data, error } = await supabase
      .from("practitioner_products")
      .select(
        "id, name, price_amount, duration_minutes, popularity_score, recommendation_reason, pricing_rationale, recommended_for",
      )
      .eq("practitioner_id", practitionerId)
      .eq("is_active", true)
      .order("popularity_score", { ascending: false, nullsLast: true })
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      const topService = data[0];
      const hasJudgment =
        topService.recommendation_reason ||
        topService.pricing_rationale ||
        topService.recommended_for;

      logTest(
        "Service Recommendations",
        true,
        `Found ${data.length} services, top service: ${topService.name} (popularity: ${topService.popularity_score || 0})`,
      );

      if (hasJudgment) {
        logTest(
          "Service Judgment Data",
          true,
          "Service has recommendation/pricing rationale",
        );
      } else {
        logWarning(
          "Service Judgment Data",
          "Service exists but no judgment fields populated yet",
        );
      }

      return data;
    } else {
      logWarning(
        "Service Recommendations",
        "No active services found for test practitioner",
      );
      return [];
    }
  } catch (error) {
    logTest("Service Recommendations", false, error.message);
    return [];
  }
}

async function test5_SlugGeneration() {
  console.log("\n📋 Test 5: Slug Generation Function");
  try {
    // Test the slug generation function
    const { data, error } = await supabase.rpc("generate_booking_slug", {
      first_name: "John",
      last_name: "Smith",
    });

    if (error) throw error;

    if (data === "john-smith") {
      logTest("Slug Generation", true, `Generated slug: ${data}`);
      return true;
    } else {
      logTest("Slug Generation", false, `Expected 'john-smith', got '${data}'`);
      return false;
    }
  } catch (error) {
    logTest("Slug Generation", false, error.message);
    return false;
  }
}

async function test6_SlugUniqueness() {
  console.log("\n📋 Test 6: Slug Uniqueness Validation");
  try {
    // Test uniqueness function
    const testUserId = "d419a3d1-5071-4940-a13f-b4aac9520dec";
    const { data, error } = await supabase.rpc("ensure_unique_booking_slug", {
      proposed_slug: "johnny-osteo",
      user_id: testUserId,
    });

    if (error) throw error;

    // Should return the same slug if it belongs to this user, or a modified one if it belongs to another
    logTest("Slug Uniqueness", true, `Unique slug generated: ${data}`);
    return true;
  } catch (error) {
    logTest("Slug Uniqueness", false, error.message);
    return false;
  }
}

async function test7_UpdateBookingSlug() {
  console.log("\n📋 Test 7: Update Booking Slug");
  try {
    // Get a test practitioner
    const { data: practitioner, error: fetchError } = await supabase
      .from("users")
      .select("id, booking_slug")
      .eq("user_role", "osteopath")
      .limit(1)
      .single();

    if (fetchError) throw fetchError;

    const testSlug = `test-slug-${Date.now()}`;

    // Update slug
    const { error: updateError } = await supabase
      .from("users")
      .update({ booking_slug: testSlug })
      .eq("id", practitioner.id);

    if (updateError) throw updateError;

    // Verify update
    const { data: updated, error: verifyError } = await supabase
      .from("users")
      .select("booking_slug")
      .eq("id", practitioner.id)
      .single();

    if (verifyError) throw verifyError;

    if (updated.booking_slug === testSlug) {
      // Restore original slug
      await supabase
        .from("users")
        .update({ booking_slug: practitioner.booking_slug })
        .eq("id", practitioner.id);

      logTest(
        "Update Booking Slug",
        true,
        "Slug updated and verified successfully",
      );
      return true;
    } else {
      logTest("Update Booking Slug", false, "Slug update failed verification");
      return false;
    }
  } catch (error) {
    logTest("Update Booking Slug", false, error.message);
    return false;
  }
}

async function test8_ServiceSortingByPopularity() {
  console.log("\n📋 Test 8: Service Sorting by Popularity Score");
  try {
    const practitionerId = "d419a3d1-5071-4940-a13f-b4aac9520dec";

    const { data, error } = await supabase
      .from("practitioner_products")
      .select("id, name, popularity_score")
      .eq("practitioner_id", practitionerId)
      .eq("is_active", true)
      .order("popularity_score", { ascending: false, nullsLast: true });

    if (error) throw error;

    if (data && data.length > 1) {
      // Verify sorting (first should have highest or equal score)
      const scores = data.map((s) => s.popularity_score || 0);
      const isSorted = scores.every(
        (score, i) => i === 0 || score <= scores[i - 1],
      );

      if (isSorted) {
        logTest(
          "Service Sorting",
          true,
          `Services sorted correctly by popularity (${data.length} services)`,
        );
        return true;
      } else {
        logTest("Service Sorting", false, "Services not sorted correctly");
        return false;
      }
    } else {
      logWarning("Service Sorting", "Not enough services to test sorting");
      return true; // Not a failure, just not testable
    }
  } catch (error) {
    logTest("Service Sorting", false, error.message);
    return false;
  }
}

async function test9_UpdateProductJudgment() {
  console.log("\n📋 Test 9: Update Product Judgment Fields");
  try {
    const practitionerId = "d419a3d1-5071-4940-a13f-b4aac9520dec";

    // Get a service to update
    const { data: service, error: fetchError } = await supabase
      .from("practitioner_products")
      .select("id, name")
      .eq("practitioner_id", practitionerId)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (fetchError) throw fetchError;

    const testData = {
      recommendation_reason: "Test recommendation - great for testing",
      pricing_rationale: "Test pricing rationale - competitive rates",
      popularity_score: 75,
      recommended_for: ["testing", "evaluation"],
    };

    // Update service
    const { error: updateError } = await supabase
      .from("practitioner_products")
      .update(testData)
      .eq("id", service.id);

    if (updateError) throw updateError;

    // Verify update
    const { data: updated, error: verifyError } = await supabase
      .from("practitioner_products")
      .select(
        "recommendation_reason, pricing_rationale, popularity_score, recommended_for",
      )
      .eq("id", service.id)
      .single();

    if (verifyError) throw verifyError;

    const matches =
      updated.recommendation_reason === testData.recommendation_reason &&
      updated.pricing_rationale === testData.pricing_rationale &&
      updated.popularity_score === testData.popularity_score &&
      JSON.stringify(updated.recommended_for) ===
        JSON.stringify(testData.recommended_for);

    if (matches) {
      logTest(
        "Update Product Judgment",
        true,
        "All judgment fields updated successfully",
      );
      return true;
    } else {
      logTest("Update Product Judgment", false, "Update verification failed");
      return false;
    }
  } catch (error) {
    logTest("Update Product Judgment", false, error.message);
    return false;
  }
}

async function test10_DirectBookingLinkFlow() {
  console.log("\n📋 Test 10: Direct Booking Link Flow Simulation");
  try {
    // Simulate the DirectBooking page flow
    const slug = "johnny-osteo";

    // Step 1: Fetch practitioner by slug
    const { data: practitioner, error: fetchError } = await supabase
      .from("users")
      .select(
        `
        id,
        first_name,
        last_name,
        location,
        hourly_rate,
        specializations,
        bio,
        experience_years,
        user_role,
        profile_photo_url,
        is_active,
        profile_completed,
        booking_slug
      `,
      )
      .eq("booking_slug", slug)
      .eq("user_role", "osteopath")
      .single();

    if (fetchError) throw fetchError;

    if (
      !practitioner ||
      !practitioner.is_active ||
      !practitioner.profile_completed
    ) {
      logTest(
        "Direct Booking Flow",
        false,
        "Practitioner not available for booking",
      );
      return false;
    }

    // Step 2: Fetch services with judgment fields
    const { data: services, error: servicesError } = await supabase
      .from("practitioner_products")
      .select("*")
      .eq("practitioner_id", practitioner.id)
      .eq("is_active", true)
      .order("popularity_score", { ascending: false, nullsLast: true });

    if (servicesError) throw servicesError;

    // Step 3: Verify flow can proceed
    const canProceed = practitioner && services && services.length > 0;

    if (canProceed) {
      logTest(
        "Direct Booking Flow",
        true,
        `Flow ready: Practitioner found, ${services.length} services available`,
      );
      return true;
    } else {
      logTest(
        "Direct Booking Flow",
        false,
        "Flow cannot proceed - missing data",
      );
      return false;
    }
  } catch (error) {
    logTest("Direct Booking Flow", false, error.message);
    return false;
  }
}

async function runAllTests() {
  console.log(
    "🚀 Starting End-to-End Tests: Custom Booking Slugs and Product Judgment\n",
  );
  console.log("=".repeat(70));

  await test1_BookingSlugColumn();
  await test2_ProductJudgmentFields();
  await test3_FetchPractitionerBySlug();
  await test4_ServiceRecommendations();
  await test5_SlugGeneration();
  await test6_SlugUniqueness();
  await test7_UpdateBookingSlug();
  await test8_ServiceSortingByPopularity();
  await test9_UpdateProductJudgment();
  await test10_DirectBookingLinkFlow();

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("\n📊 Test Summary:");
  console.log(`✅ Passed: ${testResults.passed.length}`);
  console.log(`❌ Failed: ${testResults.failed.length}`);
  console.log(`⚠️  Warnings: ${testResults.warnings.length}`);

  if (testResults.failed.length > 0) {
    console.log("\n❌ Failed Tests:");
    testResults.failed.forEach(({ name, message }) => {
      console.log(`   - ${name}: ${message}`);
    });
  }

  if (testResults.warnings.length > 0) {
    console.log("\n⚠️  Warnings:");
    testResults.warnings.forEach(({ name, message }) => {
      console.log(`   - ${name}: ${message}`);
    });
  }

  const successRate =
    (testResults.passed.length /
      (testResults.passed.length + testResults.failed.length)) *
    100;
  console.log(`\n📈 Success Rate: ${successRate.toFixed(1)}%`);

  if (testResults.failed.length === 0) {
    console.log("\n🎉 All critical tests passed!");
    process.exit(0);
  } else {
    console.log("\n⚠️  Some tests failed. Please review the errors above.");
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error("💥 Fatal error running tests:", error);
  process.exit(1);
});
