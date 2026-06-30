/**
 * Booking flow — service, date/time, pre-assessment, payment method, confirm.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { addDays, format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { useMarketplacePractitioners } from "@/hooks/useMarketplacePractitioners";
import {
  fetchPractitionerProducts,
  fetchAvailableStartTimes,
  bookSessionAndOpenCheckout,
  type PractitionerProductRow,
} from "@/lib/api/booking";
import { filterClinicBookableProducts } from "@/lib/bookingProducts";
import { canBookClinic, canRequestMobile } from "@/lib/booking-flow-type";
import { marketplacePractitionerToBookingFlow } from "@/lib/practitionerBookingProfile";
import { tabPath } from "@/contexts/TabRootContext";
import { getMainAppHref } from "@/lib/postAuthRoute";
import { signedInTabPath } from "@/lib/signedInRoutes";
import { useAuthStore } from "@/stores/authStore";
import { openHostedWebSession } from "@/lib/openHostedWeb";
import { ensureGuestUserForBooking } from "@/lib/api/guestUser";
import { AppScreen, AppStackHeader } from "@/components/navigation";

const BASE_STEP_LABELS = [
  "Service",
  "Date & time",
  "Pre-assessment",
  "Payment method",
  "Review & confirm",
] as const;

export default function BookingModalScreen() {
  const { practitionerId, initialDate, initialTime, guest } =
    useLocalSearchParams<{
      practitionerId?: string;
      initialDate?: string;
      initialTime?: string;
      guest?: string;
    }>();
  const { userId, userProfile, user } = useAuth();
  const isGuestMode = guest === "1" || guest === "true" || guest === "yes";
  const queryClient = useQueryClient();
  const { data: practitioners, isLoading: loadingList } =
    useMarketplacePractitioners();
  const therapist = useMemo(
    () => practitioners?.find((p) => p.id === practitionerId),
    [practitioners, practitionerId],
  );

  const bookingFlowProfile = useMemo(
    () => (therapist ? marketplacePractitionerToBookingFlow(therapist) : null),
    [therapist],
  );

  useEffect(() => {
    if (!practitionerId || !bookingFlowProfile) return;
    if (canBookClinic(bookingFlowProfile)) return;
    if (canRequestMobile(bookingFlowProfile)) {
      router.replace({
        pathname: "/booking/mobile-request",
        params: isGuestMode
          ? { practitionerId, guest: "1" }
          : { practitionerId },
      });
    }
  }, [practitionerId, bookingFlowProfile]);

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: [
      "practitioner_products",
      practitionerId,
      therapist?.therapist_type,
    ],
    queryFn: async () => {
      if (!practitionerId) return [];
      const { data, error } = await fetchPractitionerProducts(practitionerId);
      if (error) throw error;
      return filterClinicBookableProducts(
        therapist?.therapist_type ?? null,
        data,
      );
    },
    enabled: !!practitionerId && !!therapist,
  });

  const [step, setStep] = useState(0);
  const [selectedProduct, setSelectedProduct] =
    useState<PractitionerProductRow | null>(null);
  const [sessionDate, setSessionDate] = useState(() =>
    initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)
      ? initialDate
      : format(new Date(), "yyyy-MM-dd"),
  );
  const [startTime, setStartTime] = useState(() =>
    initialTime && /^\d{2}:\d{2}/.test(initialTime)
      ? initialTime.slice(0, 5)
      : "10:00",
  );
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [currentIssue, setCurrentIssue] = useState("");
  const [painLevel, setPainLevel] = useState<string>("0");
  const [mobilityImpact, setMobilityImpact] = useState("");
  const [goals, setGoals] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentCollection, setPaymentCollection] = useState<
    "online" | "in_person"
  >("online");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const supportsInPerson = therapist?.accept_in_person_payment === true;

  const stepLabels = supportsInPerson
    ? BASE_STEP_LABELS
    : (BASE_STEP_LABELS.filter(
        (x) => x !== "Payment method",
      ) as readonly string[]);
  const reviewStep = stepLabels.length - 1;
  const paymentStep = supportsInPerson ? 3 : -1;

  const dateOptions = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => {
      const d = addDays(new Date(), i);
      return {
        value: format(d, "yyyy-MM-dd"),
        label: format(d, "EEE d MMM"),
      };
    });
  }, []);

  const currency = selectedProduct?.currency?.toUpperCase() ?? "GBP";
  const priceLabel = selectedProduct
    ? `${currency} ${(selectedProduct.price_amount / 100).toFixed(2)}`
    : "—";

  const { data: availableTimes = [], isLoading: loadingAvailability } =
    useQuery<string[]>({
      queryKey: [
        "availability",
        practitionerId,
        sessionDate,
        selectedProduct?.id,
        selectedProduct?.duration_minutes,
      ],
      queryFn: async () => {
        if (!practitionerId || !selectedProduct) return [];
        const { data, error } = await fetchAvailableStartTimes({
          practitionerId,
          date: sessionDate,
          durationMinutes: selectedProduct.duration_minutes ?? 60,
        });
        if (error) throw error;
        return data;
      },
      enabled: !!practitionerId && !!selectedProduct && step >= 1,
      /** Refresh while choosing date/time so booked slots disappear without manual retry. */
      refetchInterval:
        step >= 1 && practitionerId && selectedProduct ? 25_000 : false,
      staleTime: 0,
    });

  React.useEffect(() => {
    if (availableTimes.length === 0) return;
    if (!availableTimes.includes(startTime)) {
      setStartTime(availableTimes[0]);
    }
  }, [availableTimes, startTime]);

  const openCheckout = async () => {
    if (!practitionerId || !selectedProduct) {
      return;
    }

    if (isGuestMode) {
      if (!guestName.trim() || !guestEmail.trim()) {
        Alert.alert(
          "Your details",
          "Name and email are required for guest booking.",
        );
        return;
      }
    } else if (!userId || !user || !userProfile) {
      Alert.alert("Sign in required", "Please sign in to complete booking.");
      return;
    }

    if (!policyAccepted) {
      Alert.alert(
        "Cancellation policy",
        "Please accept the cancellation policy to continue.",
      );
      return;
    }

    setSubmitting(true);
    try {
      let clientId = userId!;
      let clientName = "Client";
      let clientEmail = "";
      let clientPhone: string | null = null;
      let isGuestBooking = false;

      if (isGuestMode) {
        const guestRes = await ensureGuestUserForBooking({
          email: guestEmail,
          name: guestName,
        });
        if (guestRes.error || !guestRes.userId) {
          Alert.alert(
            "Could not continue",
            guestRes.error?.message ?? "Guest profile error",
          );
          return;
        }
        clientId = guestRes.userId;
        clientName = guestName.trim();
        clientEmail = guestEmail.trim();
        clientPhone = guestPhone.trim() || null;
        isGuestBooking = true;
      } else {
        clientName =
          `${userProfile!.first_name || ""} ${userProfile!.last_name || ""}`.trim() ||
          "Client";
        clientEmail = user!.email || "";
        clientPhone = userProfile!.phone ?? null;
      }

      const result = await bookSessionAndOpenCheckout({
        therapistId: practitionerId,
        clientId,
        clientName,
        clientEmail,
        clientPhone,
        sessionDate,
        startTime,
        product: selectedProduct,
        notes: `Pre-assessment
Current issue: ${currentIssue || "Not provided"}
Pain level (0-10): ${painLevel || "0"}
Mobility impact: ${mobilityImpact || "Not provided"}
Goals: ${goals || "Not provided"}`,
        paymentCollection,
        isGuestBooking,
      });

      if (!result.ok) {
        Alert.alert(
          result.conflict ? "Slot unavailable" : "Booking failed",
          result.error,
        );
        return;
      }

      if (!isGuestMode && userId) {
        await queryClient.invalidateQueries({
          queryKey: ["client_sessions", userId],
        });
      }

      if (result.paymentCollection === "in_person") {
        Alert.alert(
          "Booking confirmed",
          isGuestMode
            ? "Your session is booked. Pay at the clinic on the day. Use Find my booking with your email to view details."
            : "Your session is booked. You will pay at the clinic.",
          isGuestMode
            ? [
                {
                  text: "Find my booking",
                  onPress: () => router.replace("/booking/find" as never),
                },
                { text: "Done", style: "cancel" },
              ]
            : [
                {
                  text: "Open booking",
                  onPress: () =>
                    router.replace(
                      tabPath(
                        getMainAppHref(
                          useAuthStore.getState().userProfile?.user_role,
                        ),
                        `bookings/${result.sessionId}`,
                      ) as never,
                    ),
                },
              ],
        );
        return;
      }

      if (!result.checkoutUrl) {
        Alert.alert(
          "Payment setup failed",
          "Could not open checkout. Please try again.",
        );
        return;
      }
      openHostedWebSession({
        kind: "stripe_checkout",
        url: result.checkoutUrl,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!practitionerId) {
    return (
      <AppScreen edges={["top", "bottom"]}>
        <AppStackHeader title="Book session" />
        <View className="flex-1 px-6 pt-4 pb-8 justify-center">
          <Text className="text-charcoal-900 text-xl font-semibold">
            Choose a practitioner first
          </Text>
          <Text className="text-charcoal-600 mt-3 leading-6">
            Bookings open from a therapist profile. Browse the marketplace, pick
            someone, then tap Book again.
          </Text>
          <Button
            variant="primary"
            className="mt-8"
            onPress={() => router.replace(signedInTabPath("explore") as never)}
          >
            Browse therapists
          </Button>
          <Button
            variant="outline"
            className="mt-3"
            onPress={() => router.push("/find-therapists" as never)}
          >
            Find therapists hub
          </Button>
          <Button
            variant="outline"
            className="mt-3"
            onPress={() => router.back()}
          >
            Go back
          </Button>
        </View>
      </AppScreen>
    );
  }

  if (loadingList && !therapist) {
    return (
      <AppScreen>
        <AppStackHeader title="Book session" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={Colors.sage[500]} />
        </View>
      </AppScreen>
    );
  }

  if (!therapist) {
    return (
      <AppScreen edges={["top", "bottom"]}>
        <AppStackHeader title="Book session" />
        <View className="flex-1 px-6 pt-4 pb-8 justify-center">
          <Text className="text-charcoal-900 text-xl font-semibold">
            Practitioner not found
          </Text>
          <Text className="text-charcoal-600 mt-3 leading-6">
            This profile may be unavailable or the link may be out of date. Try
            Explore or go back.
          </Text>
          <Button
            variant="primary"
            className="mt-8"
            onPress={() => router.replace(signedInTabPath("explore") as never)}
          >
            Open Explore
          </Button>
          <Button
            variant="outline"
            className="mt-3"
            onPress={() => router.back()}
          >
            Go back
          </Button>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppStackHeader title="Book session" />
      <View className="px-6 pb-3 border-b border-cream-200">
        <Text className="text-charcoal-500 text-sm">
          {therapist.first_name} {therapist.last_name}
        </Text>
        <Text className="text-charcoal-600 text-sm font-medium mt-2">
          {stepLabels[step]}
        </Text>
        <Text className="text-charcoal-400 text-xs mt-1">
          Step {step + 1} of {stepLabels.length}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-5"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {step === 0 && (
          <View>
            <Text className="text-charcoal-800 font-semibold mb-1">
              Choose a service
            </Text>
            <Text className="text-charcoal-500 text-sm mb-4">
              Pick the session type that fits you best.
            </Text>
            {loadingProducts ? (
              <ActivityIndicator color={Colors.sage[500]} />
            ) : products.length === 0 ? (
              <Text className="text-charcoal-500">
                No bookable services found. Try again later or choose another
                practitioner.
              </Text>
            ) : (
              products.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setSelectedProduct(p)}
                  className={`mb-3 p-4 rounded-xl border ${
                    selectedProduct?.id === p.id
                      ? "border-sage-500 bg-sage-500/10"
                      : "border-cream-200 bg-white"
                  }`}
                >
                  <Text className="text-charcoal-900 font-semibold">
                    {p.name}
                  </Text>
                  {p.description ? (
                    <Text
                      className="text-charcoal-500 text-sm mt-1"
                      numberOfLines={2}
                    >
                      {p.description}
                    </Text>
                  ) : null}
                  <Text className="text-sage-600 font-medium mt-2">
                    {(p.currency || "gbp").toUpperCase()}{" "}
                    {(p.price_amount / 100).toFixed(2)} ·{" "}
                    {p.duration_minutes ?? 60} min
                  </Text>
                </TouchableOpacity>
              ))
            )}
            <Button
              variant="primary"
              className="mt-4"
              disabled={!selectedProduct}
              onPress={() => setStep(1)}
            >
              <Text className="text-white font-semibold">Continue</Text>
            </Button>
          </View>
        )}

        {step === 1 && (
          <View>
            <Text className="text-charcoal-800 font-semibold mb-1">Date</Text>
            <Text className="text-charcoal-500 text-sm mb-3">
              Choose a day within the next three weeks.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-5"
            >
              {dateOptions.map((d) => (
                <TouchableOpacity
                  key={d.value}
                  onPress={() => setSessionDate(d.value)}
                  className={`mr-2 px-4 py-3 rounded-xl border ${
                    sessionDate === d.value
                      ? "border-sage-500 bg-sage-500/10"
                      : "border-cream-200 bg-white"
                  }`}
                >
                  <Text
                    className={
                      sessionDate === d.value
                        ? "text-sage-700 font-semibold"
                        : "text-charcoal-700"
                    }
                  >
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text className="text-charcoal-800 font-semibold mb-1">
              Start time
            </Text>
            <Text className="text-charcoal-500 text-sm mb-3">
              Times follow the practitioner&apos;s availability.
            </Text>
            {loadingAvailability ? (
              <ActivityIndicator color={Colors.sage[500]} />
            ) : availableTimes.length > 0 ? (
              <View className="flex-row flex-wrap gap-2">
                {availableTimes.map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setStartTime(t)}
                    className={`px-3 py-2 rounded-lg border ${
                      startTime === t
                        ? "border-sage-500 bg-sage-500/10"
                        : "border-cream-200 bg-white"
                    }`}
                  >
                    <Text
                      className={
                        startTime === t
                          ? "text-sage-700 font-medium"
                          : "text-charcoal-700"
                      }
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text className="text-charcoal-500">
                No available times for this date. Please choose another day.
              </Text>
            )}

            <Button
              variant="primary"
              className="mt-6"
              onPress={() => setStep(2)}
              disabled={availableTimes.length === 0}
            >
              <Text className="text-white font-semibold">Continue</Text>
            </Button>
            <Button
              variant="outline"
              className="mt-3"
              onPress={() => setStep(0)}
            >
              <Text className="text-charcoal-700 font-medium">Back</Text>
            </Button>
          </View>
        )}

        {step === 2 && selectedProduct && (
          <View>
            {isGuestMode ? (
              <View className="mb-5">
                <Text className="text-charcoal-800 font-semibold mb-1">
                  Your details
                </Text>
                <Text className="text-charcoal-500 text-sm mb-3">
                  Book without an account. Card payments open on the website;
                  pay-at-clinic can be confirmed here.
                </Text>
                <Text className="text-charcoal-700 font-medium mb-2">
                  Full name *
                </Text>
                <TextInput
                  value={guestName}
                  onChangeText={setGuestName}
                  placeholder="Your name"
                  placeholderTextColor={Colors.charcoal[400]}
                  className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3"
                />
                <Text className="text-charcoal-700 font-medium mb-2">
                  Email *
                </Text>
                <TextInput
                  value={guestEmail}
                  onChangeText={setGuestEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={Colors.charcoal[400]}
                  className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3"
                />
                <Text className="text-charcoal-700 font-medium mb-2">
                  Phone (optional)
                </Text>
                <TextInput
                  value={guestPhone}
                  onChangeText={setGuestPhone}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                  placeholderTextColor={Colors.charcoal[400]}
                  className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4"
                />
              </View>
            ) : null}

            <Text className="text-charcoal-800 font-semibold mb-1">
              Pre-assessment
            </Text>
            <Text className="text-charcoal-500 text-sm mb-5">
              Optional but helpful — your answers are saved with this booking
              for your practitioner.
            </Text>

            <Text className="text-charcoal-700 font-medium mb-2">
              Current issue
            </Text>
            <TextInput
              value={currentIssue}
              onChangeText={setCurrentIssue}
              placeholder="What brings you in today?"
              placeholderTextColor={Colors.charcoal[400]}
              className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4"
            />

            <Text className="text-charcoal-700 font-medium mb-2">
              Pain level (0-10)
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {Array.from({ length: 11 }, (_, i) => String(i)).map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setPainLevel(n)}
                  className={`px-3 py-2 rounded-lg border ${
                    painLevel === n
                      ? "border-sage-500 bg-sage-500/10"
                      : "border-cream-200 bg-white"
                  }`}
                >
                  <Text
                    className={
                      painLevel === n
                        ? "text-sage-700 font-medium"
                        : "text-charcoal-700"
                    }
                  >
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-charcoal-700 font-medium mb-2">
              Mobility impact
            </Text>
            <TextInput
              value={mobilityImpact}
              onChangeText={setMobilityImpact}
              placeholder="How does this affect movement/day-to-day?"
              placeholderTextColor={Colors.charcoal[400]}
              className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4"
            />

            <Text className="text-charcoal-700 font-medium mb-2">
              Session goals
            </Text>
            <TextInput
              value={goals}
              onChangeText={setGoals}
              placeholder="What outcome would you like from this session?"
              placeholderTextColor={Colors.charcoal[400]}
              className="bg-white border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900"
            />

            <Button
              variant="primary"
              className="mt-8"
              onPress={() => setStep(supportsInPerson ? 3 : reviewStep)}
            >
              <Text className="text-white font-semibold">
                Continue to review
              </Text>
            </Button>
            <Button
              variant="outline"
              className="mt-3"
              onPress={() => setStep(1)}
            >
              <Text className="text-charcoal-700 font-medium">Back</Text>
            </Button>
          </View>
        )}

        {step === paymentStep && selectedProduct && (
          <View>
            <Text className="text-charcoal-800 font-semibold mb-1">
              Payment method
            </Text>
            <Text className="text-charcoal-500 text-sm mb-4">
              Choose whether to pay online now or at the clinic.
            </Text>

            <TouchableOpacity
              onPress={() => setPaymentCollection("online")}
              className={`mb-3 p-4 rounded-xl border ${
                paymentCollection === "online"
                  ? "border-sage-500 bg-sage-500/10"
                  : "border-cream-200 bg-white"
              }`}
            >
              <Text className="text-charcoal-900 font-semibold">
                Pay online
              </Text>
              <Text className="text-charcoal-500 text-sm mt-1">
                Secure card payment in the app (Stripe checkout).
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPaymentCollection("in_person")}
              className={`mb-3 p-4 rounded-xl border ${
                paymentCollection === "in_person"
                  ? "border-sage-500 bg-sage-500/10"
                  : "border-cream-200 bg-white"
              }`}
            >
              <Text className="text-charcoal-900 font-semibold">
                Pay at clinic
              </Text>
              <Text className="text-charcoal-500 text-sm mt-1">
                Pay by cash or card terminal at your appointment.
              </Text>
            </TouchableOpacity>

            <Button
              variant="primary"
              className="mt-4"
              onPress={() => setStep(reviewStep)}
            >
              <Text className="text-white font-semibold">Continue</Text>
            </Button>
            <Button
              variant="outline"
              className="mt-3"
              onPress={() => setStep(2)}
            >
              <Text className="text-charcoal-700 font-medium">Back</Text>
            </Button>
          </View>
        )}

        {step === reviewStep && selectedProduct && (
          <View>
            <Text className="text-charcoal-800 font-semibold mb-1">
              Review & confirm
            </Text>
            <Text className="text-charcoal-500 text-sm mb-4">
              Check details, then{" "}
              {paymentCollection === "in_person"
                ? "confirm your booking."
                : "complete secure payment."}
            </Text>
            <View className="bg-white border border-cream-200 rounded-xl p-4 mb-4">
              <Text className="text-charcoal-900 font-semibold">
                {selectedProduct.name}
              </Text>
              <Text className="text-charcoal-600 mt-2">
                {format(
                  new Date(sessionDate + "T12:00:00"),
                  "EEEE d MMMM yyyy",
                )}{" "}
                · {startTime}
              </Text>
              <Text className="text-charcoal-900 font-semibold mt-3">
                {priceLabel}
              </Text>
              <Text className="text-charcoal-600 mt-2">
                Payment:{" "}
                {paymentCollection === "in_person"
                  ? "Pay at clinic"
                  : "Pay online"}
              </Text>
              {paymentCollection === "in_person" ? (
                <Text className="text-charcoal-500 text-sm mt-1">
                  No platform fee is charged on pay-at-clinic bookings.
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              className="flex-row items-center mb-6"
              onPress={() => setPolicyAccepted(!policyAccepted)}
            >
              <View
                className={`w-6 h-6 rounded border mr-3 items-center justify-center ${
                  policyAccepted
                    ? "bg-sage-500 border-sage-500"
                    : "border-charcoal-300"
                }`}
              >
                {policyAccepted ? (
                  <Text className="text-white text-xs">✓</Text>
                ) : null}
              </View>
              <Text className="text-charcoal-600 flex-1">
                I understand the practitioner&apos;s cancellation policy
                (typically 24h notice).
              </Text>
            </TouchableOpacity>

            <Button
              variant="primary"
              disabled={submitting || !policyAccepted}
              onPress={() => void openCheckout()}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold">
                  {paymentCollection === "in_person"
                    ? "Confirm booking"
                    : "Pay securely"}
                </Text>
              )}
            </Button>
            <Button
              variant="outline"
              className="mt-3"
              onPress={() => setStep(supportsInPerson ? paymentStep : 2)}
              disabled={submitting}
            >
              <Text className="text-charcoal-700 font-medium">Back</Text>
            </Button>
          </View>
        )}
      </ScrollView>

      <View className="px-6 pb-8 pt-2 border-t border-cream-200">
        <Button
          variant="outline"
          onPress={() => router.back()}
          disabled={submitting}
        >
          <Text className="text-charcoal-700 font-medium">Close</Text>
        </Button>
      </View>
    </AppScreen>
  );
}
