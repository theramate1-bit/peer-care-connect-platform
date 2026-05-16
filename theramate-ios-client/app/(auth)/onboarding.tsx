import React from "react";
import {
  View,
  Text,
  Alert,
  ScrollView,
  TextInput,
  TouchableOpacity,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { router } from "expo-router";

import { useAuthStore } from "@/stores/authStore";
import { getMainAppHref } from "@/lib/postAuthRoute";
import { AuthBackHeader } from "@/components/AuthBackHeader";
import { openHostedWebSession } from "@/lib/openHostedWeb";
import { publishedWebsitePath } from "@/lib/practiceWebUrls";

const THERAPY_TYPES = [
  "Sports Therapy",
  "Massage Therapy",
  "Osteopathy",
  "Physiotherapy",
  "Counselling",
  "Other",
] as const;

const SECONDARY_GOALS = [
  "Pain Relief",
  "Injury Recovery",
  "Stress Management",
  "Flexibility",
  "Strength Building",
  "Mental Health",
  "Performance Improvement",
  "Prevention",
] as const;

const PREFERRED_GENDER_OPTIONS = [
  "No preference",
  "Male",
  "Female",
  "Non-binary",
] as const;

const PREFERRED_LOCATION_OPTIONS = [
  "Home visit",
  "Clinic",
  "Online",
  "Gym / sports facility",
] as const;

const PREFERRED_TIME_OPTIONS = [
  "Morning",
  "Afternoon",
  "Evening",
  "Weekend",
] as const;

const MAX_TRAVEL_DISTANCE_OPTIONS = [
  "5 miles",
  "10 miles",
  "20 miles",
  "50+ miles",
] as const;

const TIMELINE_OPTIONS = [
  "Immediate",
  "1 month",
  "3 months",
  "6 months",
  "Ongoing",
] as const;

const BUDGET_OPTIONS = ["50-100", "100-200", "200-500", "500+"] as const;
const STEP_TITLES = [
  "Personal Information",
  "Health Background",
  "Therapy Preferences",
  "Goals & Objectives",
  "Complete Setup",
] as const;
const STEP_DESCRIPTIONS = [
  "Tell us about yourself and your therapy goals",
  "Share relevant health information for better care",
  "Choose your preferred therapy types and scheduling",
  "Define what you want to achieve through therapy",
  "Review and finalize your profile",
] as const;

function normalizeDobInput(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function isValidDateOfBirth(input: string): boolean {
  const raw = input.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  const [y, m, d] = raw.split("-").map((n) => Number(n));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() + 1 !== m ||
    date.getUTCDate() !== d
  ) {
    return false;
  }
  const now = new Date();
  return date <= now;
}

function MultiSelectChips({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <View className="mb-4">
      <Text className="text-charcoal-800 font-medium mb-2">{label}</Text>
      <View className="flex-row flex-wrap">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <TouchableOpacity
              key={option}
              onPress={() => onToggle(option)}
              className={`mr-2 mb-2 px-3 py-2 rounded-full border ${
                active
                  ? "bg-sage-500 border-sage-500"
                  : "bg-white border-cream-300"
              }`}
            >
              <Text
                className={
                  active ? "text-white text-xs" : "text-charcoal-700 text-xs"
                }
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function SingleSelectChips({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onSelect: (next: string) => void;
}) {
  return (
    <View className="mb-4">
      <Text className="text-charcoal-800 font-medium mb-2">{label}</Text>
      <View className="flex-row flex-wrap">
        {options.map((option) => {
          const active = value === option;
          return (
            <TouchableOpacity
              key={option}
              onPress={() => onSelect(option)}
              className={`mr-2 mb-2 px-3 py-2 rounded-full border ${
                active
                  ? "bg-sage-500 border-sage-500"
                  : "bg-white border-cream-300"
              }`}
            >
              <Text
                className={
                  active ? "text-white text-xs" : "text-charcoal-700 text-xs"
                }
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity className="flex-row items-center py-2" onPress={onToggle}>
      <View
        className={`w-5 h-5 rounded border mr-3 items-center justify-center ${
          value ? "bg-sage-500 border-sage-500" : "border-cream-300 bg-white"
        }`}
      >
        {value ? <Text className="text-white text-xs">✓</Text> : null}
      </View>
      <Text className="text-charcoal-700 flex-1">{label}</Text>
    </TouchableOpacity>
  );
}

export default function ClientOnboardingScreen() {
  const { userProfile, updateProfile, refreshProfile } = useAuth();
  const [step, setStep] = React.useState(0);
  const [firstName, setFirstName] = React.useState(
    userProfile?.first_name ?? "",
  );
  const [lastName, setLastName] = React.useState(userProfile?.last_name ?? "");
  const [dateOfBirth, setDateOfBirth] = React.useState("");
  const [phone, setPhone] = React.useState(userProfile?.phone ?? "");
  const [location, setLocation] = React.useState(userProfile?.location ?? "");
  const [emergencyContact, setEmergencyContact] = React.useState("");
  const [emergencyPhone, setEmergencyPhone] = React.useState("");
  const [medicalConditions, setMedicalConditions] = React.useState("");
  const [medications, setMedications] = React.useState("");
  const [allergies, setAllergies] = React.useState("");
  const [previousTherapy, setPreviousTherapy] = React.useState("");
  const [preferredTherapyTypes, setPreferredTherapyTypes] = React.useState<
    string[]
  >([]);
  const [preferredGender, setPreferredGender] = React.useState("");
  const [preferredLocation, setPreferredLocation] = React.useState("");
  const [preferredTime, setPreferredTime] = React.useState("");
  const [maxTravelDistance, setMaxTravelDistance] = React.useState("");
  const [primaryGoal, setPrimaryGoal] = React.useState("");
  const [secondaryGoals, setSecondaryGoals] = React.useState<string[]>([]);
  const [timeline, setTimeline] = React.useState("");
  const [budget, setBudget] = React.useState("");
  const [acceptTerms, setAcceptTerms] = React.useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = React.useState(false);
  const [allowMarketing, setAllowMarketing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [savingDraft, setSavingDraft] = React.useState(false);
  const totalSteps = 5;
  const hydratedRef = React.useRef(false);
  const draftSaveInFlightRef = React.useRef(false);
  const appStateRef = React.useRef(AppState.currentState);
  const saveDraftRef = React.useRef<() => Promise<void>>(async () => {});

  React.useEffect(() => {
    if (hydratedRef.current) return;
    const rawPrefs = userProfile?.preferences;
    if (!rawPrefs || typeof rawPrefs !== "object") {
      hydratedRef.current = true;
      return;
    }

    const onboarding =
      "onboarding" in rawPrefs
        ? (rawPrefs as Record<string, unknown>).onboarding
        : null;
    if (!onboarding || typeof onboarding !== "object") {
      hydratedRef.current = true;
      return;
    }

    const data = onboarding as Record<string, unknown>;
    const asText = (v: unknown) => (typeof v === "string" ? v : "");
    const asBool = (v: unknown) => (typeof v === "boolean" ? v : false);
    const asStringArray = (v: unknown) =>
      Array.isArray(v)
        ? v.filter((x): x is string => typeof x === "string")
        : [];

    setDateOfBirth(asText(data.dateOfBirth));
    setEmergencyContact(asText(data.emergencyContact));
    setEmergencyPhone(asText(data.emergencyPhone));
    setMedicalConditions(asText(data.medicalConditions));
    setMedications(asText(data.medications));
    setAllergies(asText(data.allergies));
    setPreviousTherapy(asText(data.previousTherapy));
    setPreferredTherapyTypes(asStringArray(data.preferredTherapyTypes));
    setPreferredGender(asText(data.preferredGender));
    setPreferredLocation(asText(data.preferredLocation));
    setPreferredTime(asText(data.preferredTime));
    setMaxTravelDistance(asText(data.maxTravelDistance));
    setPrimaryGoal(asText(data.primaryGoal));
    setSecondaryGoals(asStringArray(data.secondaryGoals));
    setTimeline(asText(data.timeline));
    setBudget(asText(data.budget));
    setAcceptTerms(asBool(data.acceptTerms));
    setAcceptPrivacy(asBool(data.acceptPrivacy));
    setAllowMarketing(asBool(data.allowMarketing));
    hydratedRef.current = true;
  }, [userProfile?.preferences]);

  const toggleInList = (
    current: string[],
    value: string,
    setter: (next: string[]) => void,
  ) => {
    if (current.includes(value)) {
      setter(current.filter((item) => item !== value));
      return;
    }
    setter([...current, value]);
  };

  const canProceed = () => {
    if (step === 0) {
      return (
        firstName.trim().length >= 2 &&
        lastName.trim().length >= 2 &&
        isValidDateOfBirth(dateOfBirth)
      );
    }
    if (step === 1) return true;
    if (step === 2) return preferredTherapyTypes.length > 0;
    if (step === 3) return primaryGoal.trim().length > 0;
    if (step === 4) return acceptTerms && acceptPrivacy;
    return false;
  };

  const buildOnboardingDraft = () => ({
    dateOfBirth: dateOfBirth.trim() || null,
    emergencyContact: emergencyContact.trim() || null,
    emergencyPhone: emergencyPhone.trim() || null,
    medicalConditions: medicalConditions.trim() || null,
    medications: medications.trim() || null,
    allergies: allergies.trim() || null,
    previousTherapy: previousTherapy.trim() || null,
    preferredTherapyTypes,
    preferredGender: preferredGender || null,
    preferredLocation: preferredLocation || null,
    preferredTime: preferredTime || null,
    maxTravelDistance: maxTravelDistance || null,
    primaryGoal: primaryGoal.trim() || null,
    secondaryGoals,
    timeline: timeline || null,
    budget: budget || null,
    acceptTerms,
    acceptPrivacy,
    allowMarketing,
    onboarding_completed: false,
    onboarding_last_saved_at: new Date().toISOString(),
  });

  const saveDraft = async () => {
    if (saving || draftSaveInFlightRef.current) return;
    draftSaveInFlightRef.current = true;
    setSavingDraft(true);
    try {
      const existingPreferences =
        userProfile?.preferences && typeof userProfile.preferences === "object"
          ? (userProfile.preferences as Record<string, unknown>)
          : {};
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        location: location.trim() || null,
        onboarding_status:
          userProfile?.onboarding_status === "completed"
            ? "completed"
            : "in_progress",
        preferences: {
          ...existingPreferences,
          onboarding: buildOnboardingDraft(),
        },
      });
    } finally {
      draftSaveInFlightRef.current = false;
      setSavingDraft(false);
    }
  };

  React.useEffect(() => {
    saveDraftRef.current = saveDraft;
  }, [saveDraft]);

  React.useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;
      if (prevState === "active" && nextState !== "active") {
        void saveDraftRef.current();
      }
    });
    return () => {
      sub.remove();
    };
  }, []);

  React.useEffect(() => {
    return () => {
      void saveDraftRef.current();
    };
  }, []);

  const onComplete = async () => {
    if (!canProceed()) {
      if (step === 0 && !isValidDateOfBirth(dateOfBirth)) {
        Alert.alert(
          "Date of birth required",
          "Use a valid date in YYYY-MM-DD format.",
        );
      } else {
        Alert.alert(
          "Almost there",
          "Please complete the required fields first.",
        );
      }
      return;
    }
    setSaving(true);
    try {
      const existingPreferences =
        userProfile?.preferences && typeof userProfile.preferences === "object"
          ? (userProfile.preferences as Record<string, unknown>)
          : {};

      const result = await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        location: location.trim() || null,
        terms_accepted: acceptTerms && acceptPrivacy,
        terms_accepted_at:
          acceptTerms && acceptPrivacy ? new Date().toISOString() : null,
        preferences: {
          ...existingPreferences,
          onboarding: {
            ...buildOnboardingDraft(),
            onboarding_completed: true,
            onboarding_date: new Date().toISOString(),
          },
        },
        onboarding_status: "completed",
        profile_completed: true,
      });
      if (!result.success) {
        Alert.alert(
          "Could not complete onboarding",
          result.error || "Please try again.",
        );
        return;
      }
      await refreshProfile();
      const role = useAuthStore.getState().userProfile?.user_role;
      router.replace(getMainAppHref(role));
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <>
          <Input
            label="First name *"
            value={firstName}
            onChangeText={setFirstName}
          />
          <Input
            label="Last name *"
            value={lastName}
            onChangeText={setLastName}
          />
          <Input
            label="Date of birth (YYYY-MM-DD) *"
            value={dateOfBirth}
            onChangeText={(value) => setDateOfBirth(normalizeDobInput(value))}
            placeholder="1990-05-20"
            keyboardType="number-pad"
          />
          <Input
            label="Phone number (optional)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Input
            label="Emergency contact name (optional)"
            value={emergencyContact}
            onChangeText={setEmergencyContact}
          />
          <Input
            label="Emergency contact phone (optional)"
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
            keyboardType="phone-pad"
          />
        </>
      );
    }

    if (step === 1) {
      return (
        <>
          <Text className="text-charcoal-800 font-medium mb-2">
            Medical conditions
          </Text>
          <TextInput
            className="bg-white border border-cream-300 rounded-xl px-3 py-3 mb-4 text-charcoal-900"
            multiline
            value={medicalConditions}
            onChangeText={setMedicalConditions}
            placeholder="Any relevant medical conditions"
            textAlignVertical="top"
            style={{ minHeight: 88 }}
          />
          <Text className="text-charcoal-800 font-medium mb-2">
            Current medications
          </Text>
          <TextInput
            className="bg-white border border-cream-300 rounded-xl px-3 py-3 mb-4 text-charcoal-900"
            multiline
            value={medications}
            onChangeText={setMedications}
            placeholder="Any medications you're taking"
            textAlignVertical="top"
            style={{ minHeight: 88 }}
          />
          <Input
            label="Allergies (optional)"
            value={allergies}
            onChangeText={setAllergies}
          />
          <Text className="text-charcoal-800 font-medium mb-2 mt-2">
            Previous therapy experience
          </Text>
          <TextInput
            className="bg-white border border-cream-300 rounded-xl px-3 py-3 mb-1 text-charcoal-900"
            multiline
            value={previousTherapy}
            onChangeText={setPreviousTherapy}
            placeholder="What has or hasn't worked for you before"
            textAlignVertical="top"
            style={{ minHeight: 88 }}
          />
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <MultiSelectChips
            label="Therapy types you're interested in *"
            options={THERAPY_TYPES}
            selected={preferredTherapyTypes}
            onToggle={(value) =>
              toggleInList(
                preferredTherapyTypes,
                value,
                setPreferredTherapyTypes,
              )
            }
          />
          <SingleSelectChips
            label="Preferred therapist gender"
            options={PREFERRED_GENDER_OPTIONS}
            value={preferredGender}
            onSelect={setPreferredGender}
          />
          <SingleSelectChips
            label="Preferred location"
            options={PREFERRED_LOCATION_OPTIONS}
            value={preferredLocation}
            onSelect={setPreferredLocation}
          />
          <SingleSelectChips
            label="Preferred time"
            options={PREFERRED_TIME_OPTIONS}
            value={preferredTime}
            onSelect={setPreferredTime}
          />
          <SingleSelectChips
            label="Max travel distance"
            options={MAX_TRAVEL_DISTANCE_OPTIONS}
            value={maxTravelDistance}
            onSelect={setMaxTravelDistance}
          />
          <Input
            label="General location (optional)"
            value={location}
            onChangeText={setLocation}
            placeholder="City or area"
          />
        </>
      );
    }

    if (step === 3) {
      return (
        <>
          <Text className="text-charcoal-800 font-medium mb-2">
            Primary goal *
          </Text>
          <TextInput
            className="bg-white border border-cream-300 rounded-xl px-3 py-3 mb-4 text-charcoal-900"
            multiline
            value={primaryGoal}
            onChangeText={setPrimaryGoal}
            placeholder="What is your main objective for therapy?"
            textAlignVertical="top"
            style={{ minHeight: 96 }}
          />
          <MultiSelectChips
            label="Secondary goals"
            options={SECONDARY_GOALS}
            selected={secondaryGoals}
            onToggle={(value) =>
              toggleInList(secondaryGoals, value, setSecondaryGoals)
            }
          />
          <SingleSelectChips
            label="Timeline"
            options={TIMELINE_OPTIONS}
            value={timeline}
            onSelect={setTimeline}
          />
          <SingleSelectChips
            label="Budget range"
            options={BUDGET_OPTIONS.map((v) => `£${v}`)}
            value={budget}
            onSelect={(v) => setBudget(v.replace("£", ""))}
          />
        </>
      );
    }

    return (
      <>
        <View className="bg-white border border-cream-300 rounded-xl p-4 mb-4">
          <Text className="text-charcoal-900 font-semibold mb-2">Review</Text>
          <Text className="text-charcoal-600 text-sm">
            Name: {firstName} {lastName}
          </Text>
          <Text className="text-charcoal-600 text-sm">
            Phone: {phone || "Not provided"}
          </Text>
          <Text className="text-charcoal-600 text-sm">
            Primary goal: {primaryGoal || "Not provided"}
          </Text>
          <Text className="text-charcoal-600 text-sm">
            Therapy types: {preferredTherapyTypes.join(", ") || "None selected"}
          </Text>
        </View>
        <ToggleRow
          label="I accept the Terms of Service *"
          value={acceptTerms}
          onToggle={() => setAcceptTerms((v) => !v)}
        />
        <TouchableOpacity
          className="mb-2"
          onPress={() =>
            openHostedWebSession({
              kind: "web_app",
              url: publishedWebsitePath("/terms"),
            })
          }
        >
          <Text className="text-sage-600 text-sm">
            Read Terms of Service (in app)
          </Text>
        </TouchableOpacity>
        <ToggleRow
          label="I accept the Privacy Policy *"
          value={acceptPrivacy}
          onToggle={() => setAcceptPrivacy((v) => !v)}
        />
        <TouchableOpacity
          className="mb-2"
          onPress={() =>
            openHostedWebSession({
              kind: "web_app",
              url: publishedWebsitePath("/privacy"),
            })
          }
        >
          <Text className="text-sage-600 text-sm">
            Read Privacy Policy (in app)
          </Text>
        </TouchableOpacity>
        <ToggleRow
          label="I agree to receive marketing updates (optional)"
          value={allowMarketing}
          onToggle={() => setAllowMarketing((v) => !v)}
        />
      </>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <View className="px-6 pt-2">
        <AuthBackHeader fallbackHref="/role-selection" label="Role" />
      </View>
      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <Text className="text-charcoal-900 text-3xl font-bold">
          Welcome to Theramate
        </Text>
        <Text className="text-charcoal-700 mt-2 font-semibold">
          {STEP_TITLES[step]}
        </Text>
        <Text className="text-charcoal-500 mt-1">
          {STEP_DESCRIPTIONS[step]}
        </Text>
        <Text className="text-charcoal-500 mt-2 mb-8">
          Step {step + 1} of {totalSteps}
        </Text>
        <View className="w-full h-2 bg-cream-200 rounded-full mb-6">
          <View
            className="h-2 bg-sage-500 rounded-full"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </View>

        {renderStep()}

        <View className="flex-row mt-3">
          <Button
            variant="outline"
            className="flex-1 mr-2"
            onPress={() => {
              void saveDraft();
              setStep((s) => Math.max(0, s - 1));
            }}
            disabled={step === 0 || saving}
          >
            Previous
          </Button>
          {step === totalSteps - 1 ? (
            <Button
              variant="primary"
              className="flex-1 ml-2"
              onPress={() => void onComplete()}
              isLoading={saving}
              disabled={!canProceed() || saving}
            >
              Complete setup
            </Button>
          ) : (
            <Button
              variant="primary"
              className="flex-1 ml-2"
              onPress={() => {
                void saveDraft();
                setStep((s) => Math.min(totalSteps - 1, s + 1));
              }}
              disabled={!canProceed() || saving}
            >
              Next
            </Button>
          )}
        </View>
        {savingDraft ? (
          <Text className="text-charcoal-400 text-xs mt-3 text-center">
            Saving draft...
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
