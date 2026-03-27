/**
 * Booking modal — service, date/time, confirm, Stripe Checkout (same Edge Function as web).
 */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  TextInput,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { addDays, format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStripe } from "@stripe/stripe-react-native";

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

const STEP_LABELS = [
  "Service",
  "Date & time",
  "Pre-assessment",
  "Review & pay",
] as const;

export default function BookingModalScreen() {
  const { practitionerId, initialDate, initialTime } = useLocalSearchParams<{
    practitionerId?: string;
    initialDate?: string;
    initialTime?: string;
  }>();
  const { userId, userProfile, user } = useAuth();
  const queryClient = useQueryClient();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const { data: practitioners, isLoading: loadingList } =
    useMarketplacePractitioners();
  const therapist = useMemo(
    () => practitioners?.find((p) => p.id === practitionerId),
    [practitioners, practitionerId],
  );

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["practitioner_products", practitionerId],
    queryFn: async () => {
      if (!practitionerId) return [];
      const { data, error } = await fetchPractitionerProducts(practitionerId);
      if (error) throw error;
      return data;
    },
    enabled: !!practitionerId,
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
    });

  React.useEffect(() => {
    if (availableTimes.length === 0) return;
    if (!availableTimes.includes(startTime)) {
      setStartTime(availableTimes[0]);
    }
  }, [availableTimes, startTime]);

  const openCheckout = async () => {
    if (
      !practitionerId ||
      !userId ||
      !user ||
      !userProfile ||
      !selectedProduct
    ) {
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
      const clientName =
        `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim() ||
        "Client";
      const result = await bookSessionAndOpenCheckout({
        therapistId: practitionerId,
        clientId: userId,
        clientName,
        clientEmail: user.email || "",
        clientPhone: userProfile.phone ?? null,
        sessionDate,
        startTime,
        product: selectedProduct,
        notes: `Pre-assessment
Current issue: ${currentIssue || "Not provided"}
Pain level (0-10): ${painLevel || "0"}
Mobility impact: ${mobilityImpact || "Not provided"}
Goals: ${goals || "Not provided"}`,
      });

      if (!result.ok) {
        Alert.alert(
          result.conflict ? "Slot unavailable" : "Booking failed",
          result.error,
        );
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: ["client_sessions", userId],
      });

      // Prefer native PaymentSheet when server returns required Stripe secrets.
      if (result.paymentIntentClientSecret) {
        const init = await initPaymentSheet({
          merchantDisplayName: "Theramate",
          paymentIntentClientSecret: result.paymentIntentClientSecret,
          customerId: result.customerId,
          customerEphemeralKeySecret: result.customerEphemeralKeySecret,
          allowsDelayedPaymentMethods: false,
          returnURL: "theramate://booking-success",
        });

        if (!init.error) {
          const presented = await presentPaymentSheet();
          if (!presented.error) {
            router.replace(`/(tabs)/bookings/${result.sessionId}`);
            return;
          }
        }
      }

      const opened = await Linking.openURL(result.checkoutUrl);
      if (!opened) {
        Alert.alert(
          "Complete payment",
          "Could not open payment. Please try again.",
        );
      }
      router.back();
    } finally {
      setSubmitting(false);
    }
  };

  if (!practitionerId) {
    return (
      <View className="flex-1 px-6 pt-4 pb-8 bg-cream-50 justify-center">
        <Text className="text-charcoal-600">No practitioner selected.</Text>
        <Button
          variant="primary"
          className="mt-6"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">Close</Text>
        </Button>
      </View>
    );
  }

  if (loadingList && !therapist) {
    return (
      <View className="flex-1 bg-cream-50 items-center justify-center">
        <ActivityIndicator color={Colors.sage[500]} />
      </View>
    );
  }

  if (!therapist) {
    return (
      <View className="flex-1 px-6 pt-4 pb-8 bg-cream-50 justify-center">
        <Text className="text-charcoal-600">
          Could not load this practitioner.
        </Text>
        <Button
          variant="primary"
          className="mt-6"
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">Close</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-cream-50">
      <View className="px-6 pt-4 pb-3 border-b border-cream-200">
        <Text className="text-charcoal-900 text-xl font-bold">
          Book session
        </Text>
        <Text className="text-charcoal-500 text-sm mt-1">
          {therapist.first_name} {therapist.last_name}
        </Text>
        <Text className="text-charcoal-600 text-sm font-medium mt-2">
          {STEP_LABELS[step]}
        </Text>
        <Text className="text-charcoal-400 text-xs mt-1">
          Step {step + 1} of 4
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
                No bookable services found. Try again later or book on the web
                app.
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
              onPress={() => setStep(3)}
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

        {step === 3 && selectedProduct && (
          <View>
            <Text className="text-charcoal-800 font-semibold mb-1">
              Review & pay
            </Text>
            <Text className="text-charcoal-500 text-sm mb-4">
              Check details, then complete secure payment.
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
                <Text className="text-white font-semibold">Pay securely</Text>
              )}
            </Button>
            <Button
              variant="outline"
              className="mt-3"
              onPress={() => setStep(2)}
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
    </View>
  );
}
