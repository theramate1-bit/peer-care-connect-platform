/**
 * Practitioner onboarding completion — mirrors web `completePractitionerOnboarding`
 * (profile write, optional specialization mapping, Stripe Connect account creation).
 */

import { supabase } from "@/lib/supabase";
import { createConnectAccount } from "@/lib/api/stripeConnect";
import {
  buildPracticeLocationUpdate,
  type PracticeLocationValues,
  type TherapistType,
} from "@/lib/practitionerProfile";
import type { UserRole } from "@/types/database";

export type PractitionerOnboardingInput = {
  userId: string;
  email: string | null | undefined;
  userRole: UserRole;
  firstName: string;
  lastName: string;
  phone: string;
  bio?: string;
  /** Matches web onboarding basic-info step. */
  hasLiabilityInsurance?: boolean;
  practiceLocations: PracticeLocationValues;
  /** Passed to specialization lookup (defaults to sports_therapist bucket). */
  servicesOffered?: string[];
  /**
   * Web runs Stripe Connect in onboarding before this call; set true to skip
   * `create-connect-account` (idempotent extra call not needed).
   */
  skipStripeConnect?: boolean;
};

async function retryDatabaseOperation<T>(
  operation: () => Promise<{ data: T | null; error: unknown }>,
  maxRetries = 3,
  operationName = "database operation",
): Promise<{ data: T | null; error: unknown }> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    const result = await operation();
    if (!result.error) {
      return result;
    }
    lastError = result.error;
    if (attempt < maxRetries) {
      const delay = 2 ** (attempt - 1) * 500;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  console.error(
    `[completePractitionerOnboarding] ${operationName} failed after retries`,
  );
  return { data: null, error: lastError };
}

async function ensureOnboardingStatusCompleted(
  userId: string,
): Promise<{ success: boolean; error?: unknown }> {
  const updateResult = await retryDatabaseOperation(
    async () =>
      supabase
        .from("users")
        .update({
          onboarding_status: "completed",
          profile_completed: true,
          treatment_exchange_enabled: true,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select("onboarding_status, profile_completed")
        .single(),
    3,
    "ensure onboarding completed",
  );
  if (updateResult.error) {
    return { success: false, error: updateResult.error };
  }
  return { success: true };
}

function getFieldValue(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value as string;
}

/** Maps `services_offered` slugs to `specializations` rows (same idea as web). */
async function syncServicesToSpecializations(
  userId: string,
  userRole: string,
  servicesOffered: string[],
): Promise<void> {
  if (!servicesOffered.length) return;

  const { data: availableSpecs, error: specFetchError } = await supabase
    .from("specializations")
    .select("id, name, category")
    .eq("category", userRole || "sports_therapist");

  if (specFetchError || !availableSpecs?.length) {
    console.warn(
      "[completePractitionerOnboarding] specializations fetch:",
      specFetchError,
    );
    return;
  }

  const serviceToSpecializationMap: Record<string, string[]> = {
    sports_massage: ["Sports Massage"],
    deep_tissue: ["Deep Tissue Massage"],
    swedish_massage: ["Massage Therapy"],
    trigger_point: ["Massage Therapy", "Deep Tissue Massage"],
    myofascial_release: ["Massage Therapy", "Deep Tissue Massage"],
    relaxation_massage: ["Massage Therapy"],
    massage: ["Massage Therapy"],
    sports_injury_assessment: ["Sports Injury"],
    exercise_rehabilitation: ["Rehabilitation"],
    strength_conditioning: ["Strength Training"],
    injury_prevention: ["Injury Prevention"],
    performance_enhancement: ["Sports Injury", "Strength Training"],
    return_to_play: ["Rehabilitation", "Sports Injury"],
    structural_osteopathy: ["Osteopathy", "Manual Therapy"],
    cranial_osteopathy: ["Cranial Osteopathy"],
    visceral_osteopathy: ["Osteopathy"],
    paediatric_osteopathy: ["Osteopathy"],
    sports_osteopathy: ["Osteopathy"],
    postural_assessment: ["Osteopathy", "Manual Therapy"],
    mobilisation: ["Manual Therapy"],
    manipulation: ["Manual Therapy"],
    stretching: ["Rehabilitation"],
    acupuncture: [],
    cupping: [],
  };

  const matchedSpecIds = new Set<string>();

  for (const service of servicesOffered) {
    const mappedNames = serviceToSpecializationMap[service] || [];
    if (mappedNames.length > 0) {
      for (const mappedName of mappedNames) {
        const matchingSpec = availableSpecs.find(
          (spec) => spec.name.toLowerCase() === mappedName.toLowerCase(),
        );
        if (matchingSpec) matchedSpecIds.add(matchingSpec.id);
      }
    } else {
      const serviceName = service
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      let matchingSpec = availableSpecs.find(
        (spec) => spec.name.toLowerCase() === serviceName.toLowerCase(),
      );
      if (!matchingSpec) {
        matchingSpec = availableSpecs.find((spec) => {
          const specLower = spec.name.toLowerCase();
          const serviceLower = serviceName.toLowerCase();
          return (
            specLower.includes(serviceLower) || serviceLower.includes(specLower)
          );
        });
      }
      if (matchingSpec) matchedSpecIds.add(matchingSpec.id);
    }
  }

  const specializationIds = Array.from(matchedSpecIds);
  if (!specializationIds.length) return;

  await supabase
    .from("practitioner_specializations")
    .delete()
    .eq("practitioner_id", userId);

  const specInserts = specializationIds.map((specId) => ({
    practitioner_id: userId,
    specialization_id: specId,
  }));

  const { error: specError } = await supabase
    .from("practitioner_specializations")
    .insert(specInserts);
  if (specError) {
    console.warn(
      "[completePractitionerOnboarding] specializations insert:",
      specError,
    );
  }
}

/**
 * Persists practitioner profile, marks onboarding complete, maps services → specializations,
 * and creates a Stripe Connect account (non-fatal if Connect fails).
 */
export async function completePractitionerOnboarding(
  input: PractitionerOnboardingInput,
): Promise<{ error: Error | null }> {
  const {
    userId,
    email,
    userRole,
    firstName,
    lastName,
    phone,
    bio,
    hasLiabilityInsurance,
    practiceLocations,
    servicesOffered = [],
    skipStripeConnect = false,
  } = input;

  const tt = practiceLocations.therapistType as TherapistType;
  if (tt !== "clinic_based" && tt !== "mobile" && tt !== "hybrid") {
    return {
      error: new Error(
        "Select how you deliver sessions (clinic, mobile, or hybrid).",
      ),
    };
  }
  if (!getFieldValue(phone)) {
    return { error: new Error("Phone number is required.") };
  }
  if (!firstName.trim() || !lastName.trim()) {
    return { error: new Error("First and last name are required.") };
  }

  const locUpdate = buildPracticeLocationUpdate(practiceLocations);
  const primaryLocation =
    tt === "mobile" ? locUpdate.base_address : locUpdate.clinic_address;
  const primaryLat =
    tt === "mobile" ? locUpdate.base_latitude : locUpdate.clinic_latitude;
  const primaryLng =
    tt === "mobile" ? locUpdate.base_longitude : locUpdate.clinic_longitude;

  if (!getFieldValue(primaryLocation)) {
    return { error: new Error("Practice location is required.") };
  }

  const userUpdateData: Record<string, unknown> = {
    ...locUpdate,
    phone: getFieldValue(phone),
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
    location: primaryLocation,
    latitude: primaryLat ?? null,
    longitude: primaryLng ?? null,
    onboarding_status: "completed",
    profile_completed: true,
    treatment_exchange_enabled: true,
    is_active: true,
    average_rating: 0,
    total_reviews: 0,
    services_offered: servicesOffered,
    response_time_hours: 24,
    updated_at: new Date().toISOString(),
  };

  if (getFieldValue(bio)) {
    userUpdateData.bio = bio!.trim();
  }
  if (hasLiabilityInsurance !== undefined) {
    userUpdateData.has_liability_insurance = hasLiabilityInsurance;
  }

  const updateResult = await retryDatabaseOperation(
    async () =>
      supabase
        .from("users")
        .update(userUpdateData)
        .eq("id", userId)
        .select()
        .single(),
    3,
    "practitioner profile update",
  );

  if (updateResult.error) {
    return {
      error:
        updateResult.error instanceof Error
          ? updateResult.error
          : new Error(String(updateResult.error)),
    };
  }

  const updatedUser = updateResult.data as {
    onboarding_status?: string;
    profile_completed?: boolean;
  } | null;
  if (
    updatedUser?.onboarding_status !== "completed" ||
    updatedUser?.profile_completed !== true
  ) {
    const fix = await ensureOnboardingStatusCompleted(userId);
    if (!fix.success) {
      return {
        error: new Error(
          "Could not confirm onboarding completion. Please try again.",
        ),
      };
    }
  }

  await syncServicesToSpecializations(userId, userRole, servicesOffered);

  if (!skipStripeConnect) {
    try {
      const connectRes = await createConnectAccount({
        email: email ?? "",
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        businessType: "individual",
      });
      if (!connectRes.ok) {
        console.warn(
          "[completePractitionerOnboarding] Stripe Connect:",
          connectRes.error,
        );
      }
    } catch (e) {
      console.warn(
        "[completePractitionerOnboarding] Stripe Connect exception:",
        e,
      );
    }
  }

  return { error: null };
}

export async function markPractitionerOnboardingInProgress(
  userId: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("users")
    .update({
      onboarding_status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .eq("onboarding_status", "pending");

  if (error) {
    return { error: new Error(error.message) };
  }
  return { error: null };
}
