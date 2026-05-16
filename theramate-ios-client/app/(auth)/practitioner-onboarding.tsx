import React from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, {
  Marker,
  type MapPressEvent,
  type Region,
} from "react-native-maps";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { AuthBackHeader } from "@/components/AuthBackHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Colors } from "@/constants/colors";
import { APP_CONFIG } from "@/constants/config";
import { useAuth } from "@/hooks/useAuth";
import { getMainAppHref } from "@/lib/postAuthRoute";
import { validateDetailedStreetAddress } from "@/lib/addressValidation";
import { fetchConnectAccountStatus } from "@/lib/api/stripeConnect";
import { fetchLatestSubscription } from "@/lib/api/subscription";
import {
  validatePracticeLocations,
  type PracticeLocationValues,
  type TherapistType,
} from "@/lib/practitionerProfile";
import {
  completePractitionerOnboarding,
  markPractitionerOnboardingInProgress,
} from "@/lib/completePractitionerOnboarding";
import { setPendingHostedWebSession } from "@/lib/pendingHostedWebSession";
import { useAuthStore } from "@/stores/authStore";
import type { UserRole } from "@/types/database";

/** Mirrors `peer-care-connect/src/pages/auth/Onboarding.tsx` */
const PRACTITIONER_STEPS = {
  THERAPIST_TYPE: 0,
  BASIC_INFO: 1,
  LOCATION: 2,
  RADIUS: 3,
  STRIPE_CONNECT: 4,
  SUBSCRIPTION: 5,
} as const;

const TYPE_OPTIONS: Array<{ id: TherapistType; label: string; hint: string }> =
  [
    {
      id: "clinic_based",
      label: "Clinic based",
      hint: "Clients visit your clinic.",
    },
    { id: "mobile", label: "Mobile", hint: "You travel to clients." },
    { id: "hybrid", label: "Hybrid", hint: "Clinic and mobile sessions." },
  ];

const LONDON_REGION: Region = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const OPTIONAL_SERVICE_SLUGS = [
  { slug: "sports_injury_assessment", label: "Injury assessment" },
  { slug: "exercise_rehabilitation", label: "Exercise rehab" },
  { slug: "sports_massage", label: "Sports massage" },
  { slug: "deep_tissue", label: "Deep tissue" },
  { slug: "strength_conditioning", label: "Strength & conditioning" },
] as const;

const DRAFT_KEY = "practitioner_onboarding_draft_v2";

const PHONE_RE = /^[+]?[0-9\s\-()]{10,}$/;

function validatePhone(phone: string): string | null {
  const t = phone.trim();
  if (!t) return "Phone number is required";
  if (!PHONE_RE.test(t)) return "Please enter a valid phone number";
  return null;
}

function getTotalSteps(therapistType: TherapistType): number {
  return therapistType === "clinic_based" ? 5 : 6;
}

/** Displayed step label (web skips radius in progress for clinic). */
function getDisplayStepNumber(
  step: number,
  therapistType: TherapistType,
): number {
  if (therapistType === "clinic_based") {
    if (step <= PRACTITIONER_STEPS.LOCATION) return step + 1;
    if (step === PRACTITIONER_STEPS.STRIPE_CONNECT) return 4;
    if (step === PRACTITIONER_STEPS.SUBSCRIPTION) return 5;
  }
  return step + 1;
}

type PinTarget = "clinic" | "base";

type DraftPayload = {
  userId: string;
  step: number;
  therapistType: TherapistType;
  firstName: string;
  lastName: string;
  phone: string;
  bio: string;
  hasLiabilityInsurance: boolean;
  servicesOffered: string[];
  loc: PracticeLocationValues;
  stripeTermsAccepted: boolean;
};

export default function PractitionerOnboardingScreen() {
  const { user, userProfile, refreshProfile } = useAuth();
  const userId = user?.id;
  const dbRole = (userProfile?.user_role ?? "sports_therapist") as UserRole;

  const [step, setStep] = React.useState<number>(
    PRACTITIONER_STEPS.THERAPIST_TYPE,
  );
  const [saving, setSaving] = React.useState(false);
  const [verifyingSub, setVerifyingSub] = React.useState(false);
  const [connectBusy, setConnectBusy] = React.useState(false);

  const extendedUser = userProfile as typeof userProfile & {
    therapist_type?: TherapistType | null;
  };

  const ext = userProfile as typeof userProfile & {
    clinic_address?: string | null;
    clinic_latitude?: number | null;
    clinic_longitude?: number | null;
    base_address?: string | null;
    base_latitude?: number | null;
    base_longitude?: number | null;
    mobile_service_radius_km?: number | null;
    service_radius_km?: number | null;
    has_liability_insurance?: boolean | null;
  };

  const [therapistType, setTherapistType] = React.useState<TherapistType>(
    (extendedUser?.therapist_type as TherapistType | undefined) ??
      "clinic_based",
  );
  const [firstName, setFirstName] = React.useState(
    userProfile?.first_name ?? "",
  );
  const [lastName, setLastName] = React.useState(userProfile?.last_name ?? "");
  const [phone, setPhone] = React.useState(userProfile?.phone ?? "");
  const [bio, setBio] = React.useState(userProfile?.bio ?? "");
  const [hasLiabilityInsurance, setHasLiabilityInsurance] = React.useState(
    Boolean(ext?.has_liability_insurance),
  );
  const [pinTarget, setPinTarget] = React.useState<PinTarget>("clinic");
  const [servicesOffered, setServicesOffered] = React.useState<string[]>([]);
  const [stripeTermsAccepted, setStripeTermsAccepted] = React.useState(false);

  const [loc, setLoc] = React.useState<PracticeLocationValues>(() => ({
    therapistType:
      (extendedUser?.therapist_type as TherapistType) ?? "clinic_based",
    clinicAddress: ext?.clinic_address ?? "",
    clinicLatitude: ext?.clinic_latitude ?? null,
    clinicLongitude: ext?.clinic_longitude ?? null,
    baseAddress: ext?.base_address ?? "",
    baseLatitude: ext?.base_latitude ?? null,
    baseLongitude: ext?.base_longitude ?? null,
    mobileServiceRadiusKm:
      ext?.mobile_service_radius_km ?? ext?.service_radius_km ?? 25,
  }));

  const [validationHint, setValidationHint] = React.useState<string | null>(
    null,
  );
  const draftHydrated = React.useRef(false);

  React.useEffect(() => {
    setLoc((prev) => ({ ...prev, therapistType }));
  }, [therapistType]);

  React.useEffect(() => {
    if (therapistType === "hybrid") setPinTarget("clinic");
  }, [therapistType]);

  const inProgressMarked = React.useRef(false);
  React.useEffect(() => {
    if (!userId || inProgressMarked.current) return;
    if (userProfile?.onboarding_status === "completed") return;
    inProgressMarked.current = true;
    void markPractitionerOnboardingInProgress(userId);
  }, [userId, userProfile?.onboarding_status]);

  const persistDraft = React.useCallback(async () => {
    if (!userId || !draftHydrated.current) return;
    const payload: DraftPayload = {
      userId,
      step,
      therapistType,
      firstName,
      lastName,
      phone,
      bio,
      hasLiabilityInsurance,
      servicesOffered,
      loc: { ...loc, therapistType },
      stripeTermsAccepted,
    };
    try {
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [
    userId,
    step,
    therapistType,
    firstName,
    lastName,
    phone,
    bio,
    hasLiabilityInsurance,
    servicesOffered,
    loc,
    stripeTermsAccepted,
  ]);

  React.useEffect(() => {
    void persistDraft();
  }, [persistDraft]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!userId) {
        draftHydrated.current = true;
        return;
      }
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (!raw || cancelled) return;
        const d = JSON.parse(raw) as DraftPayload;
        if (d.userId !== userId) return;
        if (userProfile?.onboarding_status === "completed") return;
        setStep(d.step);
        setTherapistType(d.therapistType);
        setFirstName(d.firstName);
        setLastName(d.lastName);
        setPhone(d.phone);
        setBio(d.bio);
        setHasLiabilityInsurance(d.hasLiabilityInsurance);
        setServicesOffered(d.servicesOffered ?? []);
        setLoc(d.loc);
        setStripeTermsAccepted(d.stripeTermsAccepted);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) draftHydrated.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, userProfile?.onboarding_status]);

  const toggleService = (slug: string) => {
    setServicesOffered((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const markerCoord = () => {
    if (pinTarget === "clinic") {
      return {
        latitude: loc.clinicLatitude ?? LONDON_REGION.latitude,
        longitude: loc.clinicLongitude ?? LONDON_REGION.longitude,
      };
    }
    return {
      latitude: loc.baseLatitude ?? LONDON_REGION.latitude,
      longitude: loc.baseLongitude ?? LONDON_REGION.longitude,
    };
  };

  const onMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    if (pinTarget === "clinic") {
      setLoc((p) => {
        const next = {
          ...p,
          clinicLatitude: latitude,
          clinicLongitude: longitude,
        };
        if (therapistType === "hybrid") {
          return {
            ...next,
            baseLatitude: latitude,
            baseLongitude: longitude,
            baseAddress: p.clinicAddress?.trim()
              ? p.clinicAddress
              : p.baseAddress,
          };
        }
        return next;
      });
      return;
    }
    setLoc((p) => ({ ...p, baseLatitude: latitude, baseLongitude: longitude }));
  };

  const practiceSnapshot = React.useMemo(
    (): PracticeLocationValues => ({ ...loc, therapistType }),
    [loc, therapistType],
  );

  const totalSteps = getTotalSteps(therapistType);
  const displayStep = getDisplayStepNumber(step, therapistType);
  const progressPct = (displayStep / totalSteps) * 100;

  const verifyStripeConnect = React.useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    const { data, notConnected, error } =
      await fetchConnectAccountStatus(userId);
    if (error) {
      Alert.alert("Stripe", error.message);
      return false;
    }
    if (notConnected || !data?.stripe_account_id) {
      Alert.alert(
        "Stripe Connect",
        "Please finish payment account setup before continuing.",
      );
      return false;
    }
    return true;
  }, [userId]);

  useFocusEffect(
    React.useCallback(() => {
      if (step === PRACTITIONER_STEPS.STRIPE_CONNECT) {
        void refreshProfile();
      }
    }, [step, refreshProfile]),
  );

  const openStripeSetup = () => {
    if (!stripeTermsAccepted) {
      Alert.alert(
        "Stripe",
        "Please confirm you agree to continue with Stripe Connect.",
      );
      return;
    }
    router.push("/(practitioner)/stripe-connect" as never);
  };

  const openPricing = () => {
    const url = `${APP_CONFIG.WEB_URL}/pricing`;
    setPendingHostedWebSession({
      kind: "web_app",
      url,
      dismissPath: "/practitioner-onboarding",
    });
    router.push("/hosted-web" as never);
  };

  const handleVerifySubscription = async () => {
    if (!userId) return;
    setVerifyingSub(true);
    try {
      await refreshProfile();
      const { data, error } = await fetchLatestSubscription(userId);
      if (error) throw error;
      const st = data?.subscription?.status?.trim().toLowerCase();
      const ok = st === "active" || st === "trialing";
      if (ok) {
        Alert.alert(
          "Subscription",
          "Your plan is active. Tap Complete setup to finish.",
        );
      } else {
        Alert.alert(
          "Subscription",
          "We could not find an active subscription yet. Complete checkout on the website, then tap Verify again.",
        );
      }
    } catch (e: unknown) {
      Alert.alert(
        "Subscription",
        e instanceof Error ? e.message : "Verification failed.",
      );
    } finally {
      setVerifyingSub(false);
    }
  };

  const finalizeOnboarding = async () => {
    if (!userId) return;
    const { data, error } = await fetchLatestSubscription(userId);
    if (error) {
      Alert.alert("Subscription", error.message);
      return;
    }
    const st = data?.subscription?.status?.trim().toLowerCase();
    const subscribed = st === "active" || st === "trialing";
    if (!subscribed) {
      Alert.alert(
        "Subscription required",
        "Complete your Theramate plan checkout before finishing onboarding (same as web).",
      );
      return;
    }

    const v = validatePracticeLocations(practiceSnapshot);
    if (v) {
      Alert.alert("Check details", v);
      return;
    }
    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      Alert.alert("Phone", phoneErr);
      return;
    }

    setSaving(true);
    try {
      const { error: completeErr } = await completePractitionerOnboarding({
        userId,
        email: user?.email,
        userRole: dbRole,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        bio: bio.trim() || undefined,
        hasLiabilityInsurance,
        practiceLocations: practiceSnapshot,
        servicesOffered,
        skipStripeConnect: true,
      });
      if (completeErr) {
        Alert.alert("Could not complete setup", completeErr.message);
        return;
      }
      await AsyncStorage.removeItem(DRAFT_KEY);
      await refreshProfile();
      const role = useAuthStore.getState().userProfile?.user_role;
      router.replace(getMainAppHref(role));
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    setValidationHint(null);
    if (step === PRACTITIONER_STEPS.THERAPIST_TYPE) {
      if (!therapistType) {
        setValidationHint("Select how you deliver sessions.");
        return;
      }
      setStep(PRACTITIONER_STEPS.BASIC_INFO);
      return;
    }
    if (step === PRACTITIONER_STEPS.BASIC_INFO) {
      if (!firstName.trim() || !lastName.trim()) {
        setValidationHint("First and last name are required.");
        return;
      }
      const pe = validatePhone(phone);
      if (pe) {
        setValidationHint(pe);
        return;
      }
      setStep(PRACTITIONER_STEPS.LOCATION);
      return;
    }
    if (step === PRACTITIONER_STEPS.LOCATION) {
      if (therapistType === "clinic_based" || therapistType === "hybrid") {
        if (!loc.clinicAddress?.trim()) {
          setValidationHint("Clinic address is required.");
          return;
        }
        if (loc.clinicLatitude == null || loc.clinicLongitude == null) {
          setValidationHint("Set your clinic pin on the map.");
          return;
        }
      }
      if (therapistType === "mobile") {
        if (!loc.baseAddress?.trim()) {
          setValidationHint("Base address is required.");
          return;
        }
        const addrCheck = validateDetailedStreetAddress(loc.baseAddress);
        if (!addrCheck.isValid) {
          setValidationHint(addrCheck.message ?? "Check your base address.");
          return;
        }
        if (loc.baseLatitude == null || loc.baseLongitude == null) {
          setValidationHint("Set your base pin on the map.");
          return;
        }
      }
      if (therapistType === "mobile" || therapistType === "hybrid") {
        setStep(PRACTITIONER_STEPS.RADIUS);
      } else {
        setStep(PRACTITIONER_STEPS.STRIPE_CONNECT);
      }
      return;
    }
    if (step === PRACTITIONER_STEPS.RADIUS) {
      const r = loc.mobileServiceRadiusKm;
      if (r == null || r < 5 || r > 100) {
        setValidationHint("Set a service radius between 5 and 100 km.");
        return;
      }
      setStep(PRACTITIONER_STEPS.STRIPE_CONNECT);
      return;
    }
    if (step === PRACTITIONER_STEPS.STRIPE_CONNECT) {
      setConnectBusy(true);
      try {
        const ok = await verifyStripeConnect();
        if (ok) setStep(PRACTITIONER_STEPS.SUBSCRIPTION);
      } finally {
        setConnectBusy(false);
      }
      return;
    }
  };

  const goBack = () => {
    setValidationHint(null);
    if (step === PRACTITIONER_STEPS.THERAPIST_TYPE) return;
    if (step === PRACTITIONER_STEPS.BASIC_INFO) {
      setStep(PRACTITIONER_STEPS.THERAPIST_TYPE);
      return;
    }
    if (step === PRACTITIONER_STEPS.LOCATION) {
      setStep(PRACTITIONER_STEPS.BASIC_INFO);
      return;
    }
    if (step === PRACTITIONER_STEPS.RADIUS) {
      setStep(PRACTITIONER_STEPS.LOCATION);
      return;
    }
    if (step === PRACTITIONER_STEPS.STRIPE_CONNECT) {
      if (therapistType === "clinic_based") {
        setStep(PRACTITIONER_STEPS.LOCATION);
      } else {
        setStep(PRACTITIONER_STEPS.RADIUS);
      }
      return;
    }
    if (step === PRACTITIONER_STEPS.SUBSCRIPTION) {
      setStep(PRACTITIONER_STEPS.STRIPE_CONNECT);
    }
  };

  const adjustRadius = (delta: number) => {
    setLoc((p) => {
      const cur = p.mobileServiceRadiusKm ?? 25;
      const next = Math.min(100, Math.max(5, cur + delta));
      return { ...p, mobileServiceRadiusKm: next };
    });
  };

  if (!userId) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50">
        <View className="flex-1 px-6 justify-center items-center">
          <Text className="text-charcoal-700">Sign in required.</Text>
          <Button
            variant="primary"
            className="mt-6"
            onPress={() => router.replace("/login")}
          >
            Sign in
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  React.useEffect(() => {
    if (userProfile?.onboarding_status === "completed") {
      router.replace(getMainAppHref(userProfile.user_role) as never);
    }
  }, [userProfile?.onboarding_status, userProfile?.user_role]);

  if (userProfile?.onboarding_status === "completed") {
    return (
      <SafeAreaView className="flex-1 bg-cream-50 items-center justify-center">
        <ActivityIndicator color={Colors.sage[500]} />
      </SafeAreaView>
    );
  }

  const radiusValue = loc.mobileServiceRadiusKm ?? 25;

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <View className="px-6 pt-2">
        <AuthBackHeader fallbackHref="/role-selection" label="Role" />
      </View>
      <ScrollView
        className="flex-1 px-6 pt-4"
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-charcoal-900 text-2xl font-bold">
          Welcome{firstName ? `, ${firstName}` : ""}!
        </Text>
        <Text className="text-charcoal-500 mt-1 mb-2">
          Step {displayStep} of {totalSteps}
        </Text>
        <View className="h-2 bg-cream-200 rounded-full overflow-hidden mb-6">
          <View
            className="h-2 bg-sage-500 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </View>

        {validationHint ? (
          <Text className="text-red-600 text-sm mb-4">{validationHint}</Text>
        ) : null}

        {step === PRACTITIONER_STEPS.THERAPIST_TYPE && (
          <View>
            <Text className="text-charcoal-800 font-semibold mb-3">
              Choose your practice type
            </Text>
            {TYPE_OPTIONS.map((o) => {
              const selected = therapistType === o.id;
              return (
                <TouchableOpacity
                  key={o.id}
                  activeOpacity={0.85}
                  onPress={() => setTherapistType(o.id)}
                  className={`mb-3 p-4 rounded-2xl border ${
                    selected
                      ? "border-sage-500 bg-sage-50"
                      : "border-cream-200 bg-white"
                  }`}
                >
                  <Text className="text-charcoal-900 font-semibold">
                    {o.label}
                  </Text>
                  <Text className="text-charcoal-500 text-sm mt-1">
                    {o.hint}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {step === PRACTITIONER_STEPS.BASIC_INFO && (
          <View>
            <Input
              label="First name *"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
            <Input
              label="Last name *"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
            <Input
              label="Phone *"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <TouchableOpacity
              className="flex-row items-center mt-4 mb-2"
              onPress={() => setHasLiabilityInsurance(!hasLiabilityInsurance)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: hasLiabilityInsurance }}
            >
              <View
                className={`w-5 h-5 rounded border mr-3 items-center justify-center ${
                  hasLiabilityInsurance
                    ? "bg-sage-500 border-sage-500"
                    : "border-charcoal-300"
                }`}
              >
                {hasLiabilityInsurance ? (
                  <Text className="text-white text-xs font-bold">✓</Text>
                ) : null}
              </View>
              <Text className="text-charcoal-800 flex-1 leading-5">
                I have liability insurance for the services I offer
              </Text>
            </TouchableOpacity>
            <Input
              label="Bio (optional)"
              value={bio}
              onChangeText={setBio}
              multiline
            />
            <Text className="text-charcoal-800 font-semibold mt-4 mb-2">
              Initial services (optional)
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {OPTIONAL_SERVICE_SLUGS.map((s) => {
                const on = servicesOffered.includes(s.slug);
                return (
                  <TouchableOpacity
                    key={s.slug}
                    onPress={() => toggleService(s.slug)}
                    className={`px-3 py-2 rounded-full border ${
                      on
                        ? "border-sage-500 bg-sage-50"
                        : "border-cream-200 bg-white"
                    }`}
                  >
                    <Text className="text-charcoal-800 text-sm">{s.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {step === PRACTITIONER_STEPS.LOCATION && (
          <View>
            {(therapistType === "clinic_based" ||
              therapistType === "hybrid") && (
              <>
                <Text className="text-charcoal-800 font-semibold mb-1">
                  Clinic address *
                </Text>
                <Text className="text-charcoal-500 text-sm mb-2">
                  Shown to clients on the marketplace.
                </Text>
                <Input
                  label=" "
                  value={loc.clinicAddress}
                  onChangeText={(t) =>
                    setLoc((p) => ({
                      ...p,
                      clinicAddress: t,
                      ...(therapistType === "hybrid" ? { baseAddress: t } : {}),
                    }))
                  }
                  placeholder="e.g. 123 Main St, London SW1A 1AA"
                />
                <Text className="text-charcoal-800 font-semibold mt-4 mb-2">
                  Clinic pin *
                </Text>
                <TouchableOpacity
                  onPress={() => setPinTarget("clinic")}
                  className={`self-start mb-2 px-3 py-2 rounded-lg ${
                    pinTarget === "clinic" ? "bg-sage-100" : "bg-cream-100"
                  }`}
                >
                  <Text>Adjust clinic pin</Text>
                </TouchableOpacity>
              </>
            )}

            {therapistType === "mobile" && (
              <>
                <Text className="text-charcoal-800 font-semibold mb-1">
                  Base address *
                </Text>
                <Text className="text-charcoal-500 text-sm mb-2">
                  Not shown publicly; used for travel radius. Include street and
                  postcode.
                </Text>
                <Input
                  label=" "
                  value={loc.baseAddress}
                  onChangeText={(t) =>
                    setLoc((p) => ({ ...p, baseAddress: t }))
                  }
                  placeholder="e.g. 45 Oak Rd, Manchester M1 1AE"
                />
                <Text className="text-charcoal-800 font-semibold mt-4 mb-2">
                  Base pin *
                </Text>
                <TouchableOpacity
                  onPress={() => setPinTarget("base")}
                  className={`self-start mb-2 px-3 py-2 rounded-lg ${
                    pinTarget === "base" ? "bg-sage-100" : "bg-cream-100"
                  }`}
                >
                  <Text>Adjust base pin</Text>
                </TouchableOpacity>
              </>
            )}

            {therapistType === "hybrid" && (
              <Text className="text-charcoal-500 text-sm mb-2">
                Your clinic is used as the base for mobile radius (same as web).
              </Text>
            )}

            <View className="h-56 rounded-2xl overflow-hidden mt-2 mb-2 border border-cream-200">
              <MapView
                style={{ flex: 1 }}
                initialRegion={LONDON_REGION}
                onPress={onMapPress}
              >
                <Marker coordinate={markerCoord()} />
              </MapView>
            </View>
            <Text className="text-charcoal-400 text-xs mb-4">
              Tap the map to place the{" "}
              {pinTarget === "clinic" ? "clinic" : "base"} marker.
            </Text>
          </View>
        )}

        {step === PRACTITIONER_STEPS.RADIUS &&
          (therapistType === "mobile" || therapistType === "hybrid") && (
            <View>
              <Text className="text-charcoal-800 font-semibold text-lg mb-1">
                Service radius ({radiusValue} km)
              </Text>
              <Text className="text-charcoal-500 text-sm mb-4">
                {therapistType === "hybrid"
                  ? "Clients within this radius of your clinic can book mobile visits."
                  : "Clients within this radius can book your mobile services."}
              </Text>
              <View className="flex-row items-center justify-between mb-2">
                <TouchableOpacity
                  onPress={() => adjustRadius(-5)}
                  className="bg-cream-200 px-4 py-3 rounded-xl"
                >
                  <Text className="font-semibold">−</Text>
                </TouchableOpacity>
                <Text className="text-charcoal-900 text-xl font-bold">
                  {radiusValue} km
                </Text>
                <TouchableOpacity
                  onPress={() => adjustRadius(5)}
                  className="bg-cream-200 px-4 py-3 rounded-xl"
                >
                  <Text className="font-semibold">+</Text>
                </TouchableOpacity>
              </View>
              <Text className="text-charcoal-400 text-xs">
                5 km minimum · 100 km maximum (steps of 5)
              </Text>
            </View>
          )}

        {step === PRACTITIONER_STEPS.STRIPE_CONNECT && (
          <View>
            <Text className="text-charcoal-900 text-xl font-bold mb-2">
              Connect your payment account
            </Text>
            <Text className="text-charcoal-500 text-sm mb-4 leading-5">
              Set up Stripe Connect to receive payments from clients (same order
              as web: profile details → Connect → subscription).
            </Text>
            <TouchableOpacity
              className="flex-row items-start mb-4"
              onPress={() => setStripeTermsAccepted(!stripeTermsAccepted)}
            >
              <View
                className={`w-5 h-5 rounded border mr-3 mt-0.5 items-center justify-center ${
                  stripeTermsAccepted
                    ? "bg-sage-500 border-sage-500"
                    : "border-charcoal-300"
                }`}
              >
                {stripeTermsAccepted ? (
                  <Text className="text-white text-xs font-bold">✓</Text>
                ) : null}
              </View>
              <Text className="text-charcoal-800 flex-1 leading-5">
                I agree to proceed with Stripe&apos;s Connect onboarding and
                terms
              </Text>
            </TouchableOpacity>
            <Button
              variant="primary"
              onPress={openStripeSetup}
              disabled={!stripeTermsAccepted}
            >
              Open Stripe Connect setup
            </Button>
            <Text className="text-charcoal-500 text-sm mt-4 leading-5">
              Use “Create account” on the next screen if needed, complete
              embedded onboarding, then return here and tap Continue.
            </Text>
          </View>
        )}

        {step === PRACTITIONER_STEPS.SUBSCRIPTION && (
          <View>
            <Text className="text-charcoal-900 text-xl font-bold mb-2">
              Theramate subscription
            </Text>
            <Text className="text-charcoal-500 text-sm mb-4 leading-5">
              Choose a plan on the website, then verify your subscription before
              completing setup (matches web onboarding).
            </Text>
            <Button variant="outline" onPress={openPricing} className="mb-3">
              View plans & pricing
            </Button>
            <Button
              variant="outline"
              onPress={() => void handleVerifySubscription()}
              isLoading={verifyingSub}
            >
              Verify subscription
            </Button>
            <Button
              variant="primary"
              className="mt-6"
              onPress={() => void finalizeOnboarding()}
              isLoading={saving}
            >
              Complete setup
            </Button>
            <Button variant="outline" className="mt-4" onPress={goBack}>
              Back
            </Button>
          </View>
        )}

        {step !== PRACTITIONER_STEPS.SUBSCRIPTION && (
          <View className="flex-row gap-3 mt-8">
            {step > PRACTITIONER_STEPS.THERAPIST_TYPE ? (
              <Button variant="outline" className="flex-1" onPress={goBack}>
                Back
              </Button>
            ) : (
              <View className="flex-1" />
            )}
            <Button
              variant="primary"
              className="flex-1"
              onPress={() => void goNext()}
              isLoading={connectBusy}
              disabled={connectBusy}
            >
              Continue
            </Button>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
